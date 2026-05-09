import type {
  Incident, Signal, RcaFormData,
  ApiResponse, StatusAction,
} from '@/types';

/**
 * client.ts
 *
 * Typed API client — single source of truth for all backend calls.
 *
 * DESIGN:
 *   - Every function is strongly typed end-to-end.
 *   - Throws an Error with the server's message on non-2xx responses.
 *     Hooks catch this and surface it to the UI.
 *   - Base URL from env — proxied in dev, real URL in production build.
 */

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const json: ApiResponse<T> = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }

  return json.data as T;
}

// ─── Incidents ────────────────────────────────────────────────────────────────

export const api = {
  incidents: {
    /** GET /api/incidents */
    list(params?: { status?: string; severity?: string }) {
      const qs = new URLSearchParams();
      if (params?.status)   qs.set('status',   params.status);
      if (params?.severity) qs.set('severity', params.severity);
      const query = qs.toString() ? `?${qs}` : '';
      return apiFetch<{ incidents: Incident[]; total: number }>(
        `/incidents${query}`
      );
    },

    /** GET /api/incidents/:id */
    get(id: string) {
      return apiFetch<{ incident: Incident; signals: Signal[] }>(
        `/incidents/${id}`
      );
    },

    /** PATCH /api/incidents/:id/status */
    transition(id: string, action: StatusAction) {
      return apiFetch<{ incident: Incident }>(
        `/incidents/${id}/status`,
        { method: 'PATCH', body: JSON.stringify({ action }) }
      );
    },

    /** POST /api/incidents/:id/rca */
    submitRca(id: string, data: RcaFormData) {
      return apiFetch<{ message: string }>(
        `/incidents/${id}/rca`,
        { method: 'POST', body: JSON.stringify(data) }
      );
    },
  },
};