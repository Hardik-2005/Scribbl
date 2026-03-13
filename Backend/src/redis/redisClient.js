import { createClient } from "redis";

let client = null;

export async function connectRedis() {
  // If no REDIS_URL, disable Redis completely
  if (!process.env.REDIS_URL) {
    console.log("[Redis] REDIS_URL not set. Redis disabled.");
    return null;
  }

  if (!client) {
    client = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
      }
    });

    client.on("error", (err) => {
      console.error("[Redis] Client error:", err);
    });

    client.on("ready", () => {
      console.log("[Redis] Ready");
    });

    client.on("reconnecting", () => {
      console.warn("[Redis] Reconnecting...");
    });
  }

  if (!client.isOpen) {
    await client.connect();
    console.log("[Redis] Connected");
  }

  return client;
}

export function getRedisClient() {
  return client;
}