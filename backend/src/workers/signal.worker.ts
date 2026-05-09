import 'dotenv/config';
import { Worker, Job } from 'bullmq';

import { bullMQRedis }           from '../config/redis';
import { connectRedis }          from '../config/redis';
import { connectMongo }          from '../config/mongo';
import { prisma }                from '../config/db';
import { SIGNAL_QUEUE_NAME }     from '../queues/signal.queue';
import { SignalJobPayload }       from '../types/signal.types';
import { SignalRepository }       from '../repositories/signal.repository';
import { IncidentService }        from '../services/incident.service';
import { AlertStrategyFactory }  from '../strategies/AlertStrategyFactory';

/**
 * signal.worker.ts — Production version
 *
 * Full processing pipeline per job:
 *   1. Call IncidentService.createOrLink → debounce + incident logic
 *   2. Backfill signal's incident_id in MongoDB
 *   3. If new incident: fire alert strategy
 *
 * Each step is isolated — a failure in alerting doesn't affect storage.
 * BullMQ retries the whole job on unhandled errors (up to 3 attempts).
 */

// ─── Job Processor ────────────────────────────────────────────────────────────

async function processSignalJob(job: Job<SignalJobPayload>): Promise<void> {
  const { signalId, component_id, severity, message, timestamp } = job.data;

  console.log(
    `[Worker] Job ${job.id} | attempt ${job.attemptsMade + 1} | ` +
    `component=${component_id} severity=${severity}`
  );

  // ── Step 1: Debounce check + incident create/link ─────────────────────────
  const { incidentId, isNew } = await IncidentService.createOrLink({
    signalId,
    component_id,
    severity: severity as 'P0' | 'P1' | 'P2',
    message,
  });

  // ── Step 2: Backfill incident_id on the raw MongoDB signal ───────────────
  // Non-blocking from the caller's perspective — MongoDB write is fire-and-continue
  await SignalRepository.linkToIncident(signalId, incidentId);

  // ── Step 3: Alert if this is a fresh incident ─────────────────────────────
  if (isNew) {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
      });

      if (incident) {
        await AlertStrategyFactory.get(severity as 'P0' | 'P1' | 'P2')
          .execute(incident);
      }
    } catch (alertErr) {
      // Alert failures must NOT fail the job — the signal is already stored
      // and the incident is created. Alerting is best-effort.
      console.error(`[Worker] Alert failed for incident ${incidentId}:`, alertErr);
    }
  }

  console.log(
    `[Worker] ✓ Job ${job.id} done | incident=${incidentId.substring(0, 8)}... | new=${isNew}`
  );
}

// ─── Worker Bootstrap ─────────────────────────────────────────────────────────

async function startWorker(): Promise<void> {
  // Workers need their own connections — separate from API process
  await connectRedis();
  await connectMongo();
  await prisma.$connect();
  console.log('[Worker] All connections established');

  const worker = new Worker<SignalJobPayload>(
    SIGNAL_QUEUE_NAME,
    processSignalJob,
    {
      connection:  bullMQRedis,
      concurrency: 5,
      limiter: {
        max:      50,
        duration: 1000,
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] ✓ ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] ✗ ${job?.id} permanently failed after all retries:`, err.message);
  });

  worker.on('error',   (err)   => console.error('[Worker] Redis error:',   err));
  worker.on('stalled', (jobId) => console.warn (`[Worker] Job ${jobId} stalled — requeued`));

  console.log(`[Worker] Listening | queue="${SIGNAL_QUEUE_NAME}" | concurrency=5`);

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  async function shutdown(signal: string): Promise<void> {
    console.log(`[Worker] ${signal} — draining active jobs...`);
    await worker.close(true);    // wait for active jobs to finish
    await prisma.$disconnect();
    console.log('[Worker] Clean shutdown complete');
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

startWorker().catch((err) => {
  console.error('[Worker] Fatal startup error:', err);
  process.exit(1);
});