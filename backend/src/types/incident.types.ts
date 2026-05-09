import { IncidentStatus, Severity } from '@prisma/client';

/**
 * incident.types.ts
 *
 * DTOs for incident-related HTTP requests.
 * Kept separate from Prisma types — the API contract should not
 * be coupled 1:1 with the DB schema. If the schema changes,
 * we update the mapping layer, not the client-facing contract.
 */

// ─── Request Bodies ───────────────────────────────────────────────────────────

/** PATCH /incidents/:id/status */
export interface UpdateStatusDTO {
  action: 'acknowledge' | 'resolve' | 'close';
}

/** POST /incidents/:id/rca */
export interface SubmitRcaDTO {
  root_cause:          string;
  fix_applied:         string;
  prevention_steps:    string;
  impact_start_time:   string; // ISO string — Zod coerces to Date
  impact_end_time:     string;
  submitted_by?:       string;
}

// ─── Query Params ─────────────────────────────────────────────────────────────

/** GET /incidents?status=OPEN&severity=P0 */
export interface IncidentQueryParams {
  status?:   IncidentStatus;
  severity?: Severity;
}

// ─── Response Shapes ──────────────────────────────────────────────────────────

/**
 * Standard API envelope used on every response.
 * Consistent shape makes frontend error handling trivial.
 *
 *  { success: true,  data: T }
 *  { success: false, error: string, details?: unknown }
 */
export interface ApiResponse<T> {
  success: boolean;
  data?:   T;
  error?:  string;
  details?: unknown;
}