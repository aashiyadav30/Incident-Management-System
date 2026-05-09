import { redisClient }    from '../config/redis';
import { getQueueMetrics } from '../queues/signal.queue';

/**
 * metrics.service.ts
 *
 * Lightweight throughput tracking using Redis counters.
 *
 * DESIGN:
 *   Every time a signal is accepted, the controller calls
 *   MetricsService.incrementSignals(). This INCRs a Redis key
 *   with a 10-second TTL (2× the flush interval for safety).
 *
 *   Every 5 seconds, the interval logs the current counter
 *   and queue depth. The counter auto-expires — no cleanup needed.
 *
 *   In production, replace console.log with:
 *     - StatsD / Prometheus gauge push
 *     - Datadog custom metric
 *     - CloudWatch PutMetricData
 *
 * METRICS EMITTED:
 *   - signals.accepted    (rate per 5s window)
 *   - queue.waiting       (backlog depth)
 *   - queue.active        (in-flight jobs)
 *   - queue.failed        (dead jobs since last reset)
 */

const SIGNAL_COUNTER_KEY = 'metrics:signals:accepted';
const FLUSH_INTERVAL_MS  = 5000; // 5 seconds

export class MetricsService {

  /**
   * Called by signal controller on every accepted signal.
   * INCR is O(1) and non-blocking — safe on hot path.
   */
  static async incrementSignals(): Promise<void> {
    await redisClient
      .multi()
      .incr(SIGNAL_COUNTER_KEY)
      .expire(SIGNAL_COUNTER_KEY, 10) // TTL safety net
      .exec();
  }

  /**
   * Read current counter and queue stats.
   * Used by /health and the periodic logger.
   */
  static async getSnapshot(): Promise<{
    signalsAccepted: number;
    queue: {
      waiting:   number;
      active:    number;
      failed:    number;
      completed: number;
    };
  }> {
    const [counterStr, queueStats] = await Promise.all([
      redisClient.get(SIGNAL_COUNTER_KEY),
      getQueueMetrics(),
    ]);

    return {
      signalsAccepted: parseInt(counterStr || '0', 10),
      queue: queueStats,
    };
  }

  /**
   * Start periodic metrics logging.
   * Called once from app.ts bootstrap — returns the interval handle
   * so it can be cleared on shutdown.
   */
  static startPeriodicLogger(): NodeJS.Timeout {
    return setInterval(async () => {
      try {
        const snap = await MetricsService.getSnapshot();
        console.log(
          `[Metrics] signals/5s=${snap.signalsAccepted} | ` +
          `queue.waiting=${snap.queue.waiting} | ` +
          `queue.active=${snap.queue.active}  | ` +
          `queue.failed=${snap.queue.failed}`
        );
      } catch (err) {
        // Metrics must never crash the app
        console.warn('[Metrics] Failed to collect snapshot:', err);
      }
    }, FLUSH_INTERVAL_MS);
  }
}