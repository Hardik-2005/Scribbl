/**
 * Redis Client Singleton
 * Shared by server.js (Socket.IO adapter) and roomStore.js (state layer).
 * Single connection — no extra TCP overhead.
 */

import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://red-d6dj3rf5r7bs73b2nj7g:6379';

let _client = null;

/**
 * Returns the shared Redis client. Does NOT connect automatically.
 * Call connectRedis() at startup to ensure the connection is open before use.
 */
export function getRedisClient() {
  if (!_client) {
    _client = createClient({ url: redisUrl });

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
    console.log('[Redis] Connected to', redisUrl);
  }

  return client;
}
