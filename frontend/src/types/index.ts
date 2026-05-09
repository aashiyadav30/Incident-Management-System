/**
 * Frontend type definitions.
 * Mirror the backend API response shapes — kept in sync manually.
 * In a monorepo you'd share these from a /packages/types package.
 */

export type Severity       = 'P0' | 'P1' | 'P2';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
export type StatusAction   = 'acknowledge' | 'resolve' | 'close';

// ─── Domain Models ─────────────────────────────────────────────────────────

export interface RCA {
  id:                string;
  incident_id:       string;
  root_cause:        string;
  fix_applied:       string;
  prevention_steps:  string;
  impact_start_time: string;
  impact_end_time:   string;
  submitted_by?:     string;
  submitted_at:      string;
}

export interface Incident {
  id:           string;
  component_id: string;
  severity:     Severity;
  status:       IncidentStatus;
  title:        string;
  created_at:   string;
  updated_at:   string;
  resolved_at:  string | null;
  closed_at:    string | null;
  mttr_seconds: number | null;
  signal_ids:   string[];
  rca:          { id: string } | null;  // list view — just the id
}

export interface Signal {
  _id:          string;
  component_id: string;
  severity:     Severity;
  message:      string;
  timestamp:    string;
  ingested_at:  string;
  incident_id:  string | null;
}

// ─── API Response Envelope ────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?:   T;
  error?:  string;
  details?: string;
}

// ─── RCA Form ─────────────────────────────────────────────────────────────

export interface RcaFormData {
  root_cause:         string;
  fix_applied:        string;
  prevention_steps:   string;
  impact_start_time:  string;
  impact_end_time:    string;
  submitted_by:       string;
}