const fetch = require("node-fetch");
require("dotenv").config();

const SF_TOKEN_URL = `${process.env.SF_ORG_DOMAIN}/services/oauth2/token`;
const SF_AGENT_URL = `https://api.salesforce.com/einstein/ai-agent/v1`;

// Step 1 - Get Salesforce Access Token
async function getAccessToken() {
  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", process.env.SF_CLIENT_ID);
  params.append("client_secret", process.env.SF_CLIENT_SECRET);

  const response = await fetch(SF_TOKEN_URL, {
    method: "POST",
    body: params,
  });

  const data = await response.json();
  return data.access_token;
}

// Step 2 - Start Agentforce Session
async function startSession(token) {
  const response = await fetch(
    `${SF_AGENT_URL}/agents/${process.env.SF_AGENT_ID}/sessions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        externalSessionKey: `teams-${Date.now()}-${Math.random()}`,
        instanceConfig: {
          endpoint: process.env.SF_ORG_DOMAIN,
        },
        streamingCapabilities: {
          chunkTypes: ["Text"],
        },
        bypassUser: true,
      }),
    }
  );

  const data = await response.json();
  return data.sessionId;
}

// Step 3 - Send Message to Agentforce & Get Response
async function sendMessage(token, sessionId, userMessage) {
  const response = await fetch(
    `${SF_AGENT_URL}/sessions/${sessionId}/messages/stream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: {
          sequenceId: Date.now(),
          type: "Text",
          text: userMessage,
        },
        variables: [],
      }),
    }
  );

  // Parse SSE Streaming Response
  const text = await response.text();
  const lines = text.split("\n");
  let finalMessage = "";

  for (const line of lines) {
    if (line.startsWith("data:")) {
      try {
        const json = JSON.parse(line.replace("data:", "").trim());
        if (json.message?.type === "Inform") {
          finalMessage = json.message.message;
        }
      } catch (e) {}
    }
  }

  return finalMessage || "I'm sorry, I could not process your request.";
}

// Step 4 - End Agentforce Session
async function endSession(token, sessionId) {
  await fetch(`${SF_AGENT_URL}/sessions/${sessionId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-session-end-reason": "UserRequest",
    },
  });
}

module.exports = { getAccessToken, startSession, sendMessage, endSession };