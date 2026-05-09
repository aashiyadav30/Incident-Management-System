import { Request, Response } from 'express';
import { z } from 'zod';
import { IncidentService }        from '../services/incident.service';
import { SignalRepository }        from '../repositories/signal.repository';
import { InvalidTransitionError } from '../state-machine/states/IIncidentState';
import { IncidentStatus, Severity } from '@prisma/client';
import type {
  UpdateStatusDTO,
  SubmitRcaDTO,
  ApiResponse,
} from '../types/incident.types';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const UpdateStatusSchema = z.object({
  action: z.enum(['acknowledge', 'resolve', 'close'], {
    errorMap: () => ({
      message: "action must be 'acknowledge', 'resolve', or 'close'",
    }),
  }),
});

export const SubmitRcaSchema = z.object({
  root_cause:         z.string().min(1).max(2000),
  fix_applied:        z.string().min(1).max(2000),
  prevention_steps:   z.string().min(1).max(2000),
  impact_start_time:  z.string().datetime(),
  impact_end_time:    z.string().datetime(),
  submitted_by:       z.string().max(100).optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * success — wraps data in the standard API envelope.
 */
function success<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data } satisfies ApiResponse<T>);
}

/**
 * Maps known error types to appropriate HTTP status codes.
 * Unknown errors fall through to 500.
 */
function handleError(res: Response, err: unknown): void {
  if (err instanceof InvalidTransitionError) {
    res.status(422).json({
      success: false,
      error:   'Invalid state transition',
      details: err.message,
    } satisfies ApiResponse<never>);
    return;
  }

  if (err instanceof Error && err.message.includes('not found')) {
    res.status(404).json({
      success: false,
      error: err.message,
    } satisfies ApiResponse<never>);
    return;
  }

  // Unknown — let global handler deal with it
  throw err;
}

// ─── Controller ───────────────────────────────────────────────────────────────

export class IncidentController {

  /**
   * GET /api/incidents
   * Query params: ?status=OPEN&severity=P0
   *
   * Returns all incidents, sorted P0→P2 then newest first.
   * Used by the dashboard.
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    const { status, severity } = req.query;

    // Validate optional query params
    const statusVal   = status   ? (status   as string).toUpperCase() as IncidentStatus : undefined;
    const severityVal = severity ? (severity as string).toUpperCase() as Severity       : undefined;

    const incidents = await IncidentService.getAll({
      status:   statusVal,
      severity: severityVal,
    });

    success(res, { incidents, total: incidents.length });
  }

  /**
   * GET /api/incidents/:id
   *
   * Returns incident details + all linked raw signals from MongoDB.
   * Used by the incident detail page.
   */
  static async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const incident = await IncidentService.getById(id);

    if (!incident) {
      res.status(404).json({
        success: false,
        error: `Incident ${id} not found`,
      });
      return;
    }

    // Fetch raw signals from MongoDB for this incident
    const signals = await SignalRepository.findByIncidentId(id);

    success(res, { incident, signals });
  }

  /**
   * PATCH /api/incidents/:id/status
   * Body: { "action": "acknowledge" | "resolve" | "close" }
   *
   * Drives the state machine. Returns the updated incident.
   * Returns 422 if the transition is invalid (e.g. close without RCA).
   */
  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id }    = req.params;
      const { action } = req.body as UpdateStatusDTO;

      let updated;

      switch (action) {
        case 'acknowledge':
          updated = await IncidentService.acknowledge(id);
          break;
        case 'resolve':
          updated = await IncidentService.resolve(id);
          break;
        case 'close':
          updated = await IncidentService.close(id);
          break;
      }

      success(res, { incident: updated });
    } catch (err) {
      handleError(res, err);
    }
  }

  /**
   * POST /api/incidents/:id/rca
   *
   * Submit RCA for a RESOLVED incident.
   * Incident must be in RESOLVED state — enforced by IncidentService.
   * After this, the incident can be closed via PATCH /status.
   */
  static async submitRca(req: Request, res: Response): Promise<void> {
    try {
      const { id }  = req.params;
      const dto      = req.body as SubmitRcaDTO;

      await IncidentService.submitRca(id, {
        root_cause:         dto.root_cause,
        fix_applied:        dto.fix_applied,
        prevention_steps:   dto.prevention_steps,
        impact_start_time:  new Date(dto.impact_start_time),
        impact_end_time:    new Date(dto.impact_end_time),
        submitted_by:       dto.submitted_by,
      });

      success(res, { message: 'RCA submitted successfully' }, 201);
    } catch (err) {
      handleError(res, err);
    }
  }
}