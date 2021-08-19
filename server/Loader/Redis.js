const Redis = require("ioredis");
const redisClient = new Redis({
    host: 'roothyo.com',
    port: 12340,
});

module.exports = redisClient;