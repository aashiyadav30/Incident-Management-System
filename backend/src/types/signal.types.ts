/**
 * signal.types.ts
 *
 * Single source of truth for all Signal-related types.
 * Shared across: controller, service, repository, worker, queue.
 *
 * DESIGN: We separate the inbound DTO (what the API receives)
 * from the stored document (what MongoDB holds). They look similar
 * now but will diverge as we add fields like incident_id, processed_at.
 */

// ─── Inbound DTO ──────────────────────────────────────────────────────────────

/**
 * Exactly what the caller sends in POST /signals.
 * Validated by Zod before it touches any service layer.
 */
export interface SignalDTO {
  component_id: string;
  severity: 'P0' | 'P1' | 'P2';
  message: string;
  timestamp: string; // ISO 8601 string — Zod validates format
}

// ─── Stored Document ──────────────────────────────────────────────────────────

/**
 * What gets persisted in MongoDB.
 * Extends the DTO with server-side metadata added at ingestion time.
 */
export interface SignalDocument {
  component_id: string;
  severity:     'P0' | 'P1' | 'P2';
  message:      string;
  timestamp:    Date;
  ingested_at:  Date;    // server-side receipt time
  incident_id:  string | null; // backfilled by worker after incident is created
}

// ─── Queue Job Payload ────────────────────────────────────────────────────────

/**
 * The data serialized into the BullMQ job.
 * We store the raw DTO + the MongoDB _id assigned after saving.
 * The worker needs the _id to link the signal to an incident later.
 */
export interface SignalJobPayload {
  signalId:    string; // MongoDB ObjectId as string
  component_id: string;
  severity:    'P0' | 'P1' | 'P2';
  message:     string;
  timestamp:   string;
  ingested_at: string;
}