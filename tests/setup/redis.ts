import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error(
    "REDIS_URL is not defined for tests",
  );
}

export const testRedis = new Redis(redisUrl);

export async function clearRedis() {
  await testRedis.flushdb();
}

export async function disconnectRedis() {
  await testRedis.quit();
}