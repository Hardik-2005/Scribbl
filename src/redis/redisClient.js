/**
 * Redis Client Singleton
 * Shared by server.js (Socket.IO adapter) and roomStore.js (state layer).
 * Single connection — no extra TCP overhead.
 */

import { createClient } from 'redis';

let _client = null;

/**
 * Returns the shared Redis client. Does NOT connect automatically.
 * Call connectRedis() at startup to ensure the connection is open before use.
 */
export function getRedisClient() {
  if (!_client) {
    _client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    _client.on('error',        (err) => console.error('[Redis] Client error:', err));
    _client.on('reconnecting', ()    => console.warn('[Redis] Reconnecting...'));
    _client.on('ready',        ()    => console.log('[Redis] Ready'));
  }

  return _client;
}

/**
 * Connects the singleton client if it is not already open.
 * Safe to call multiple times.
 * @returns {Promise<RedisClientType>}
 */
export async function connectRedis() {
  const client = getRedisClient();

  if (!client.isOpen) {
    await client.connect();
    console.log('[Redis] Connected to', process.env.REDIS_URL || 'redis://localhost:6379');
  }

  return client;
}
