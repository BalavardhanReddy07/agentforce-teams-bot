const { Redis } = require("@upstash/redis");
require("dotenv").config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function saveSession(conversationId, sessionId) {
  await redis.set(conversationId, sessionId, { ex: 3600 });
}

async function getSession(conversationId) {
  return await redis.get(conversationId);
}

async function deleteSession(conversationId) {
  await redis.del(conversationId);
}

module.exports = { saveSession, getSession, deleteSession };