const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const express = require("express");
const { BotFrameworkAdapter, ActivityTypes } = require("botbuilder");
const { saveSession, getSession, deleteSession } = require("./sessionStore");
const { getAccessToken, startSession, sendMessage, endSession } = require("./agentforce");

const app = express();
app.use(express.json());

const adapter = new BotFrameworkAdapter({
  appId: "",
  appPassword: "",
});

adapter.onTurnError = async (context, error) => {
  console.error("=== TURN ERROR ===");
  console.error(error.message);
  console.error(error.stack);
  try {
    await context.sendActivity(`Turn Error: ${error.message}`);
  } catch(e) {
    console.error("Failed to send error message:", e.message);
  }
};

app.post("/api/messages", (req, res) => {
  console.log("📨 Incoming request to /api/messages");
  adapter.processActivity(req, res, async (context) => {
    console.log("Activity type:", context.activity.type);
    
    if (context.activity.type === ActivityTypes.Message) {
      const userMessage = context.activity.text;
      const conversationId = context.activity.conversation.id;
      console.log("💬 User message:", userMessage);
      console.log("🔑 Conversation ID:", conversationId);

      await context.sendActivity({ type: "typing" });

      try {
        console.log("1️⃣ Getting access token...");
        const token = await getAccessToken();
        console.log("✅ Token received");

        console.log("2️⃣ Checking existing session...");
        let sessionId = await getSession(conversationId);
        console.log("Session found:", sessionId);

        if (!sessionId) {
          console.log("3️⃣ Starting new session...");
          sessionId = await startSession(token);
          console.log("✅ New session:", sessionId);
          await saveSession(conversationId, sessionId);
        }

        console.log("4️⃣ Sending message to Agentforce...");
        const agentResponse = await sendMessage(token, sessionId, userMessage);
        console.log("✅ Agentforce response:", agentResponse);

        await context.sendActivity(agentResponse);
        console.log("✅ Response sent to user");

      } catch (error) {
        console.error("=== CATCH ERROR ===");
        console.error("Message:", error.message);
        console.error("Stack:", error.stack);
        await context.sendActivity(`Error: ${error.message}`);
      }
    }

    if (
      context.activity.type === ActivityTypes.EndOfConversation ||
      (context.activity.type === ActivityTypes.Message &&
        context.activity.text?.toLowerCase() === "bye")
    ) {
      try {
        const token = await getAccessToken();
        const sessionId = await getSession(context.activity.conversation.id);
        if (sessionId) {
          await endSession(token, sessionId);
          await deleteSession(context.activity.conversation.id);
          await context.sendActivity("Session ended. Goodbye! 👋");
        }
      } catch(e) {
        console.error("End session error:", e.message);
      }
    }
  });
});

app.get("/", (req, res) => res.send("Agentforce Teams Bot is running! ✅"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));