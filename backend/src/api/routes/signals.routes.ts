import { Router } from 'express';
import { SignalController, SignalSchema } from '../../controllers/signal.controller';
import { validate } from '../middleware/validate';
import { signalIngestLimiter } from '../middleware/rateLimiter';

/**
 * signals.routes.ts
 *
 * Thin routing layer. Only wires together:
 *   middleware → validator → controller
 *
 * No logic here. Ever.
 *
 * Middleware execution order (left to right):
 *   1. signalIngestLimiter  → reject if rate limit exceeded
 *   2. validate(SignalSchema) → reject if payload invalid
 *   3. SignalController.ingest → process the request
 */

const router = Router();

router.post(
  '/',
  signalIngestLimiter,
  validate(SignalSchema),
  SignalController.ingest
);

export { router as signalRouter };