import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is not defined");
}

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

redis.on("connect", ()=>{
    console.log("Redis connecting...");
});

redis.on("ready", ()=>{
    console.log("Redis ready");
});


redis.on("error", (error)=>{
    console.log(`Redis error :  ${error}`);
});

redis.on("close", ()=>{
    console.log("Redis connection closed");
});
