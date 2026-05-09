import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import type { Incident, Signal } from '../types';

// ─── useIncidents — dashboard list with auto-polling ─────────────────────────

/**
 * Fetches all incidents and re-fetches every `pollInterval` ms.
 * Poll-based (not WebSocket) — simple, reliable, works with any backend.
 * Interval is cleared on unmount to prevent memory leaks.
 */
export function useIncidents(
  filters?: { status?: string; severity?: string },
  pollInterval = 10_000   // 10 seconds default
) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  // Use a ref for filters to avoid re-creating the fetch function
  // on every render when filters object reference changes
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetch = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await api.incidents.list(filtersRef.current);
      setIncidents(data.incidents);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetch(true); }, [fetch]);

  // Auto-poll — silently refreshes without showing spinner
  useEffect(() => {
    const id = setInterval(() => fetch(false), pollInterval);
    return () => clearInterval(id);
  }, [fetch, pollInterval]);

  return { incidents, total, loading, error, refetch: () => fetch(true) };
}

// ─── useIncident — single incident detail ────────────────────────────────────

export function useIncident(id: string) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [signals,  setSignals]  = useState<Signal[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.incidents.get(id);
      setIncident(data.incident);
      setSignals(data.signals);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { incident, signals, loading, error, refetch: fetch };
}