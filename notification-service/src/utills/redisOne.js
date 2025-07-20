// redisService.js
const redis = require('./redisClient.js');

const setCache = async (key, data, ttl = 600) => {
  await redis.set(key, JSON.stringify(data), 'EX', ttl);
};

const getCache = async (key) => {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};

const deleteCache = async (key) => {
  await redis.del(key);
};

module.exports = { setCache, getCache,deleteCache };