import { createClient } from 'redis';

/**
 * Redis singleton client.
 *
 * Architecture:
 *  - Call connectRedis() once at startup (server.js).
 *  - Call getRedisClient() everywhere else.
 *  - If Redis is unavailable, getRedisClient() returns null so callers
 *    can check and throw a user-friendly error through the existing
 *    try/catch in socketHandler.js.
 *  - The SERVER never crashes due to Redis failures.
 */

let client = null;
let isConnecting = false;
let connectionPromise = null;

/**
 * Builds the redis createClient options from REDIS_URL.
 * Handles both redis:// (plain) and rediss:// (TLS) protocols.
 * Upstash REST endpoint uses rediss:// on port 6380; standard endpoint
 * uses redis:// on port 6379. Both are supported here.
 */
function buildClientOptions(rawUrl) {
  // Upstash requires TLS but often provides a redis:// URL.
  // The node redis package forbids setting tls:true with redis:// scheme,
  // so we rewrite to rediss:// for Upstash hosts — exactly what redis-cli --tls does.
  const isUpstash = rawUrl.includes('upstash.io');
  let url = rawUrl;

  if (isUpstash && url.startsWith('redis://')) {
    url = 'rediss://' + url.slice('redis://'.length);
    console.log('[Redis] URL rewritten to rediss:// for Upstash TLS');
  }

  const opts = {
    url,
    socket: {
      // Exponential back-off capped at 10 s
      reconnectStrategy: (retries) => {
        if (retries > 20) {
          console.error('[Redis] Max reconnection attempts reached. Giving up.');
          return new Error('Max Redis reconnection attempts exceeded');
        }
        const delay = Math.min(retries * 200, 10_000);
        console.warn(`[Redis] Reconnecting in ${delay}ms (attempt ${retries})...`);
        return delay;
      },
    },
  };

  return opts;
}

/**
 * Connects to Redis using REDIS_URL from env.
 * Safe to call multiple times — only connects once.
 *
 * @returns {Promise<import('redis').RedisClientType|null>}
 *   The connected client, or null if REDIS_URL is missing / connection fails.
 */
export async function connectRedis() {
  // Already connected
  if (client && client.isOpen) return client;

  // Another call is already connecting — wait for it
  if (isConnecting && connectionPromise) return connectionPromise;

  const url = process.env.REDIS_URL;

  if (!url) {
    console.warn('[Redis] REDIS_URL not set — Redis disabled. Server runs in fallback mode.');
    return null;
  }

  isConnecting = true;
  connectionPromise = (async () => {
    try {
      console.log('[Redis] Connecting...');

      const opts = buildClientOptions(url);
      const c = createClient(opts);

      c.on('ready',        () => console.log('[Redis] Connected and ready'));
      c.on('reconnecting', () => console.warn('[Redis] Reconnecting...'));
      c.on('error',        (err) => {
        // Log but never let this bubble up as an unhandled rejection.
        // The reconnectStrategy will decide when to give up.
        console.error('[Redis] Client error:', err.message ?? err);
      });

      await c.connect();
      console.log('[Redis] Connected');

      client = c;
      return client;
    } catch (err) {
      console.error('[Redis] Failed to connect:', err.message ?? err);
      console.warn('[Redis] Running in fallback mode — room operations will be unavailable.');
      client = null;
      return null;
    } finally {
      isConnecting = false;
    }
  })();

  return connectionPromise;
}

/**
 * Returns the Redis client, or null if not connected.
 *
 * Callers (roomStore, etc.) should check for null and throw a
 * user-friendly error that propagates through socketHandler's try/catch.
 *
 * @returns {import('redis').RedisClientType|null}
 */
export function getRedisClient() {
  return client;
}

/**
 * Gracefully disconnects the Redis client.
 * Called during server shutdown (SIGTERM / SIGINT).
 */
export async function disconnectRedis() {
  if (client && client.isOpen) {
    await client.disconnect();
    console.log('[Redis] Disconnected gracefully');
    client = null;
  }
}