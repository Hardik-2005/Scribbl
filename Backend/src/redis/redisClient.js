/**
 * Redis Client Singleton
 * Shared by server.js (Socket.IO adapter) and roomStore.js (state layer).
 * Redis is OPTIONAL in production. If REDIS_URL is not provided,
 * the app will run without Redis.
 */

import { createClient } from "redis";

let _client = null;

/**
 * Returns the Redis client instance if REDIS_URL exists.
 * Otherwise returns null.
 */
export function getRedisClient() {
  if (!process.env.REDIS_URL) {
    console.warn("[Redis] REDIS_URL not set. Running without Redis.");
    return null;
  }

  if (!_client) {
    _client = createClient({
      url: process.env.REDIS_URL
    });

    _client.on("error", (err) => {
      console.error("[Redis] Client error:", err);
    });

    _client.on("reconnecting", () => {
      console.warn("[Redis] Reconnecting...");
    });

    _client.on("ready", () => {
      console.log("[Redis] Ready");
    });
  }

  return _client;
}

/**
 * Connects Redis if REDIS_URL exists.
 * Safe to call multiple times.
 */
export async function connectRedis() {
  const client = getRedisClient();

  if (!client) {
    console.log("[Redis] Skipping Redis connection.");
    return null;
  }

  if (!client.isOpen) {
    await client.connect();
    console.log("[Redis] Connected to", process.env.REDIS_URL);
  }

  return client;
}