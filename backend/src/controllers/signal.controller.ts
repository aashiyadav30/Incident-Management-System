import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { signalQueue }      from '../queues/signal.queue';
import { SignalRepository } from '../repositories/signal.repository';
import { MetricsService }   from '../services/metrics.service';
import { SignalDTO, SignalJobPayload } from '../types/signal.types';

/**
 * signal.controller.ts
 *
 * Handles POST /api/signals.
 *
 * DESIGN: The controller's job is ONLY:
 *   1. Extract validated data from req.body
 *   2. Orchestrate the immediate work (save raw + enqueue)
 *   3. Return HTTP response
 *
 * It does NOT contain business logic (that's the service layer in Phase 3).
 * It does NOT know about debouncing or incidents.
 *
 * CRITICAL PATH PERFORMANCE:
 *   We DO save to MongoDB here (not in the worker) because:
 *   - Raw storage must be guaranteed even if the worker crashes
 *   - MongoDB write is fast (~1-3ms on local) — acceptable in hot path
 *   - If Mongo is slow, we still enqueue and return 202 immediately
 *
 *   The worker only handles: debouncing + incident creation (heavier logic).
 */

// ─── Zod Schema ───────────────────────────────────────────────────────────────

/**
 * Defined here (not in types/) because Zod schemas are runtime objects,
 * not just type definitions. The schema lives next to the controller
 * that uses it. The TYPE (SignalDTO) lives in types/.
 */
export const SignalSchema = z.object({
  component_id: z
    .string()
    .min(1, 'component_id is required')
    .max(100)
    .trim()
    .toUpperCase(),

  severity: z.enum(['P0', 'P1', 'P2'], {
    errorMap: () => ({ message: 'severity must be P0, P1, or P2' }),
  }),

  message: z
    .string()
    .min(1, 'message is required')
    .max(2000, 'message too long'),

  timestamp: z
    .string()
    .datetime({ message: 'timestamp must be a valid ISO 8601 datetime' }),
});

// ─── Controller ───────────────────────────────────────────────────────────────

export class SignalController {

  /**
   * POST /api/signals
   *
   * Flow:
   *   1. req.body is already validated (SignalSchema via middleware)
   *   2. Save raw signal to MongoDB → get the _id
   *   3. Enqueue job with signal _id + payload
   *   4. Return 202 Accepted immediately
   *
   * 202 (not 201) because:
   *   - The incident hasn't been created yet
   *   - Processing is asynchronous
   *   - 202 semantically means "we received it, we'll process it"
   */
  static async ingest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto = req.body as SignalDTO;
      const now = new Date();

      // ── Step 1: Persist raw signal to MongoDB ──────────────────────────────
      // This is guaranteed storage — happens before queue, before any logic.
      // Even if the worker never runs, we have the raw signal.
      const savedSignal = await SignalRepository.create({
        component_id: dto.component_id,
        severity:     dto.severity,
        message:      dto.message,
        timestamp:    new Date(dto.timestamp),
        ingested_at:  now,
        incident_id:  null, // backfilled by worker
      });

      // ── Step 2: Build job payload ──────────────────────────────────────────
      const jobPayload: SignalJobPayload = {
        signalId:     (savedSignal._id as string).toString(),
        component_id: dto.component_id,
        severity:     dto.severity,
        message:      dto.message,
        timestamp:    dto.timestamp,
        ingested_at:  now.toISOString(),
      };

      // ── Step 3: Enqueue for async processing ──────────────────────────────
      // Job name = component_id: makes Bull Board / Redis debug easier
      // jobId: timestamp-based uniqueness within the same component window
      await signalQueue.add(
        dto.component_id,
        jobPayload,
        {
          // Unique job ID prevents exact-duplicate jobs if the client
          // retries the same request (idempotency safety net).
          // We use signalId (MongoDB _id) — guaranteed unique.
          jobId: jobPayload.signalId,
        }
      );

      // ── Step 4: Increment throughput counter (fire-and-forget) ──────────
      MetricsService.incrementSignals().catch(() => {
        // Metrics failure must never affect the response
      });

      // ── Step 5: Respond immediately ───────────────────────────────────────
      res.status(202).json({
        status: 'accepted',
        signalId: jobPayload.signalId,
        message: 'Signal received and queued for processing',
        queuedAt: now.toISOString(),
      });

    } catch (err) {
      // Pass to global error handler in app.ts
      next(err);
    }
  }
}