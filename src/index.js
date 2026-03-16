const express = require("express");
const {
  BotFrameworkAdapter,
  TurnContext,
  ActivityTypes,
} = require("botbuilder");
const {
  saveSession,
  getSession,
  deleteSession,
} = require("./sessionStore");
const {
  getAccessToken,
  startSession,
  sendMessage,
  endSession,
} = require("./agentforce");

require("dotenv").config();

const app = express();
app.use(express.json());

// Bot Framework Adapter
const adapter = new BotFrameworkAdapter({
  appId: process.env.BOT_ID,
  appPassword: process.env.BOT_PASSWORD,
});

// Handle Errors
adapter.onTurnError = async (context, error) => {
  console.error("Bot error:", error);
  await context.sendActivity("Something went wrong. Please try again.");
};

// Main Bot Logic
app.post("/api/messages", (req, res) => {
  adapter.processActivity(req, res, async (context) => {
    const conversationId = context.activity.conversation.id;

    // User sends a message
    if (context.activity.type === ActivityTypes.Message) {
      const userMessage = context.activity.text;

      // Show typing indicator
      await context.sendActivity({ type: "typing" });

      try {
        // Get Salesforce token
        const token = await getAccessToken();

        // Check if session already exists
        let sessionId = await getSession(conversationId);

        // If no session, start a new one
        if (!sessionId) {
          sessionId = await startSession(token);
          await saveSession(conversationId, sessionId);
        }

        // Send message to Agentforce
        const agentResponse = await sendMessage(token, sessionId, userMessage);

        // Send Agentforce response back to Teams
        await context.sendActivity(agentResponse);

      } catch (error) {
        console.error("Error:", error);
        await context.sendActivity(
          "Sorry, I could not connect to Agentforce. Please try again."
        );
      }
    }

    // User ends conversation
    if (
      context.activity.type === ActivityTypes.EndOfConversation ||
      (context.activity.type === ActivityTypes.Message &&
        context.activity.text?.toLowerCase() === "bye")
    ) {
      const token = await getAccessToken();
      const sessionId = await getSession(conversationId);
      if (sessionId) {
        await endSession(token, sessionId);
        await deleteSession(conversationId);
        await context.sendActivity("Session ended. Goodbye! 👋");
      }
    }
  });
});

// Health check
app.get("/", (req, res) => res.send("Agentforce Teams Bot is running! ✅"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));