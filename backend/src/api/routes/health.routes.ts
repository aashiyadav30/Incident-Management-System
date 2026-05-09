import { Router, Request, Response } from 'express';
import { connection } from 'mongoose';
import { prisma }     from '../../config/db';
import { redisClient } from '../../config/redis';
import { MetricsService } from '../../services/metrics.service';

/**
 * health.routes.ts
 *
 * GET /health — system readiness + live metrics snapshot.
 *
 * Used by:
 *   - Docker HEALTHCHECK
 *   - Load balancer readiness probes
 *   - Kubernetes liveness probes
 *   - On-call engineers during incidents
 *
 * Response codes:
 *   200 → all systems healthy
 *   207 → partial degradation (some services down, still serving)
 *   503 → critical failure (DB down — can't serve meaningful data)
 *
 * DESIGN: We check all three backing services in parallel (Promise.all)
 * to minimize health check latency. Each check is independent —
 * one failure doesn't skip the others.
 */

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const startTime = Date.now();

  // ── Run all checks in parallel ─────────────────────────────────────────────
  const [pgResult, mongoResult, redisResult, metricsResult] =
    await Promise.allSettled([
      // PostgreSQL: lightweight query — no table scan
      prisma.$queryRaw`SELECT 1`.then(() => 'ok'),

      // MongoDB: native readyState (1 = connected)
      Promise.resolve(
        connection.readyState === 1 ? 'ok' : 'disconnected'
      ),

      // Redis: PING command — sub-millisecond
      redisClient.ping().then(() => 'ok'),

      // Queue metrics + signal throughput snapshot
      MetricsService.getSnapshot(),
    ]);

  // ── Parse results ──────────────────────────────────────────────────────────
  const pg      = pgResult.status      === 'fulfilled' ? pgResult.value      : 'error';
  const mongo   = mongoResult.status   === 'fulfilled' ? mongoResult.value   : 'error';
  const redis   = redisResult.status   === 'fulfilled' ? redisResult.value   : 'error';
  const metrics = metricsResult.status === 'fulfilled' ? metricsResult.value : null;

  const allHealthy = pg === 'ok' && mongo === 'ok' && redis === 'ok';
  const pgDown     = pg !== 'ok';   // Can't serve without Postgres
  const latency    = Date.now() - startTime;

  const body = {
    status:    allHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    latency_ms: latency,
    services: {
      postgres: pg,
      mongodb:  mongo,
      redis:    redis,
    },
    metrics: metrics
      ? {
          signals_accepted_last_5s: metrics.signalsAccepted,
          queue: metrics.queue,
        }
      : null,
  };

  // 503 if primary DB is down, 207 for partial, 200 for all ok
  const statusCode = pgDown ? 503 : allHealthy ? 200 : 207;
  res.status(statusCode).json(body);
});

export { router as healthRouter };