import { createClient } from "redis";

let redisClient = null;

export async function connectRedis() {
  if (!process.env.REDIS_URL) {
    console.log("[Redis] REDIS_URL not set. Skipping Redis.");
    return null;
  }

  redisClient = createClient({
    url: process.env.REDIS_URL
  });

  redisClient.on("error", (err) => {
    console.error("[Redis] Client error:", err);
  });

  await redisClient.connect();

  console.log("[Redis] Connected");

  return redisClient;
}

export function getRedisClient() {
  return redisClient;
}