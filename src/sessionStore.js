const { Redis } = require("@upstash/redis");
require("dotenv").config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Save Agentforce sessionId against Teams conversationId
async function saveSession(conversationId, sessionId) {
  await redis.set(conversationId, sessionId, { ex: 3600 }); // expires in 1 hour
}

// Get Agentforce sessionId for a Teams conversationId
async function getSession(conversationId) {
  return await redis.get(conversationId);
}

// Delete session when conversation ends
async function deleteSession(conversationId) {
  await redis.del(conversationId);
}

module.exports = { saveSession, getSession, deleteSession };