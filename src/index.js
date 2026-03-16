const express = require("express");
const {
  BotFrameworkAdapter,
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

const adapter = new BotFrameworkAdapter({
  appId: process.env.BOT_ID,
  appPassword: process.env.BOT_PASSWORD,
});

adapter.onTurnError = async (context, error) => {
  console.error("Bot error:", error);
  await context.sendActivity("Something went wrong. Please try again.");
};

app.post("/api/messages", (req, res) => {
  adapter.processActivity(req, res, async (context) => {
    const conversationId = context.activity.conversation.id;

    if (context.activity.type === ActivityTypes.Message) {
      const userMessage = context.activity.text;

      await context.sendActivity({ type: "typing" });

      try {
        const token = await getAccessToken();

        let sessionId = await getSession(conversationId);

        if (!sessionId) {
          sessionId = await startSession(token);
          await saveSession(conversationId, sessionId);
        }

        const agentResponse = await sendMessage(token, sessionId, userMessage);

        await context.sendActivity(agentResponse);

      } catch (error) {
        console.error("Error:", error);
        await context.sendActivity(
          "Sorry, I could not connect to Agentforce. Please try again."
        );
      }
    }

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

app.get("/", (req, res) => res.send("Agentforce Teams Bot is running! ✅"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));
