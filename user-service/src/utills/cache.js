const redis = require("./redisClient");

const TTL = 24 * 60 * 60;  

async function withCache(key, fetchFn, ttl = TTL) {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);

    const fresh = await fetchFn();
    if (fresh !== null && fresh !== undefined) {
      await redis.setEx(key, ttl, JSON.stringify(fresh));
    }
    return fresh;
  } catch (err) {
    console.error('Redis error, falling back to DB:', err);
    return fetchFn();
  }
}

async function invalidate(...keys) {
  if (keys.length > 0) {
    await redis.del(keys);
  }
}

module.exports = {
  withCache,
  invalidate,
};
