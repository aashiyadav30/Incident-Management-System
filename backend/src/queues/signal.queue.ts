import { Queue, QueueEvents } from 'bullmq';
import { bullMQRedis } from '../config/redis';
import { SignalJobPayload } from '../types/signal.types';

/**
 * signal.queue.ts
 *
 * Defines the BullMQ Queue for signal processing.
 * This file is imported by BOTH the API (to enqueue) and the worker (to process).
 *
 * DESIGN: Queue definition is separate from the worker.
 * The API process only needs the Queue object (to add jobs).
 * The worker process only needs the Worker object (to consume jobs).
 * Keeping them in separate files means the API never accidentally
 * imports worker-side dependencies (DB clients, heavy services).
 *
 * QUEUE NAME: 'signal-ingestion'
 * BullMQ stores jobs under: bull:signal-ingestion:* in Redis.
 * Using a descriptive name makes redis-cli / Bull Board debugging easier.
 */

export const SIGNAL_QUEUE_NAME = 'signal-ingestion';

// ─── Queue ────────────────────────────────────────────────────────────────────

export const signalQueue = new Queue<SignalJobPayload>(SIGNAL_QUEUE_NAME, {
  connection: bullMQRedis,

  defaultJobOptions: {
    /**
     * Retry failed jobs with exponential backoff.
     *
     * attempts: 3 means 1 initial try + 2 retries.
     *
     * Backoff strategy:
     *   Attempt 1 (immediate)
     *   Attempt 2 → wait 2^1 * 1000ms = 2s
     *   Attempt 3 → wait 2^2 * 1000ms = 4s
     *
     * This handles transient DB/Redis blips without hammering the system.
     */
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // base delay in ms
    },

    /**
     * Remove completed jobs from Redis after 1 hour.
     * Without this, completed jobs accumulate and bloat Redis memory.
     * Keep enough for debugging (1 hour) but not forever.
     */
    removeOnComplete: {
      age: 3600,   // seconds
      count: 1000, // keep max 1000 completed jobs regardless of age
    },

    /**
     * Keep failed jobs for 24 hours — important for post-incident debugging.
     * Failed jobs are your dead-letter queue.
     */
    removeOnFail: {
      age: 86400,
    },
  },
});

// ─── Queue Events (Observability) ─────────────────────────────────────────────

/**
 * QueueEvents lets us listen to job lifecycle events from ANY process.
 * We use this for logging/metrics — not for processing.
 *
 * In production, you'd pipe these into your metrics system (Prometheus, Datadog).
 * For now: structured console logs that are easy to grep.
 */
export const signalQueueEvents = new QueueEvents(SIGNAL_QUEUE_NAME, {
  connection: bullMQRedis,
});

signalQueueEvents.on('completed', ({ jobId }) => {
  console.log(`[Queue] Job ${jobId} completed`);
});

signalQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`[Queue] Job ${jobId} failed: ${failedReason}`);
});

signalQueueEvents.on('stalled', ({ jobId }) => {
  // A stalled job means the worker died mid-processing.
  // BullMQ auto-requeues stalled jobs — this is just an alert.
  console.warn(`[Queue] Job ${jobId} stalled — worker may have crashed`);
});

// ─── Queue Health Helper ──────────────────────────────────────────────────────

/**
 * Returns queue depth metrics.
 * Called by /health endpoint and the 5-second metrics logger.
 */
export async function getQueueMetrics() {
  const [waiting, active, failed, completed] = await Promise.all([
    signalQueue.getWaitingCount(),
    signalQueue.getActiveCount(),
    signalQueue.getFailedCount(),
    signalQueue.getCompletedCount(),
  ]);

  return { waiting, active, failed, completed };
}