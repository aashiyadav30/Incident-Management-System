import IORedis from 'ioredis';

/**
 * DESIGN DECISION: Two separate Redis clients
 *
 * BullMQ requires its own dedicated connection — it uses blocking commands
 * (BRPOP/BLPOP) that would block a shared connection for all other callers.
 *
 * redisClient   → used by: debounce service, cache, metrics
 * bullMQRedis   → used by: queue definitions and workers ONLY
 *
 * Both use lazyConnect: true so we control exactly when the connection opens,
 * and can await it during app startup rather than silently connecting.
 */

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// ─── General-purpose client ───────────────────────────────────────────────────

export const redisClient = new IORedis(REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,

  // Exponential backoff on reconnect — prevents thundering herd
  // after a Redis restart
  retryStrategy: (times: number) => {
    if (times > 10) {
      // After 10 retries, stop retrying and surface the error
      return null;
    }
    return Math.min(times * 100, 3000); // max 3s between retries
  },

  // Named for easier identification in Redis MONITOR / CLIENT LIST
  connectionName: 'ims-general',
});

// ─── BullMQ-dedicated client ──────────────────────────────────────────────────

export const bullMQRedis = new IORedis(REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: null, // BullMQ requires null — it manages its own retries

  retryStrategy: (times: number) => {
    if (times > 10) return null;
    return Math.min(times * 100, 3000);
  },

  connectionName: 'ims-bullmq',
});

// ─── Connection helper ────────────────────────────────────────────────────────

/**
 * Called once at app startup.
 * Awaiting this ensures Redis is ready before we accept HTTP traffic.
 */
export async function connectRedis(): Promise<void> {
  if (redisClient.status === 'wait') {
    await redisClient.connect();
  }

  if (bullMQRedis.status === 'wait') {
    await bullMQRedis.connect();
  }

  console.log('[Redis] Both connections established');
}