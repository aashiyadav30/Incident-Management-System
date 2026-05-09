import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { useIncident } from '../hooks/useIncidents';

import {
  SeverityBadge,
  StatusBadge,
} from '../components';

import { formatMttr } from '../utils/formatMttr';

import { api } from '../api/client';

import type { StatusAction } from '../types';

// ─── Transition button config ─────────────────────────────────────────────────

const TRANSITIONS: Record<
  string,
  {
    action: StatusAction;
    label: string;
    style: string;
  }[]
> = {
  OPEN: [
    {
      action: 'acknowledge',
      label: '🔍 Start Investigating',
      style: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
  ],

  INVESTIGATING: [
    {
      action: 'resolve',
      label: '✅ Mark Resolved',
      style: 'bg-green-600 hover:bg-green-700 text-white',
    },
  ],

  RESOLVED: [
    {
      action: 'close',
      label: '🔒 Close Incident',
      style: 'bg-gray-700 hover:bg-gray-800 text-white',
    },
  ],

  CLOSED: [],
};

// ─── Signal timeline item ─────────────────────────────────────────────────────

function SignalItem({
  signal,
  index,
}: {
  signal: {
    _id: string;
    message: string;
    timestamp: string;
    severity: string;
  };
  index: number;
}) {
  return (
    <div className="flex gap-3">

      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <div className="w-2.5 h-2.5 rounded-full bg-blue-400 mt-1 shrink-0" />
        <div className="w-px flex-1 bg-gray-200 mt-1" />
      </div>

      {/* Content */}
      <div className="pb-4 flex-1 min-w-0">
        <p className="text-sm text-gray-800 break-words">
          {signal.message}
        </p>

        <p className="text-xs text-gray-400 mt-0.5">
          {new Date(signal.timestamp).toLocaleString()} · #{index + 1}
        </p>
      </div>
    </div>
  );
}

// ─── Detail page ──────────────────────────────────────────────────────────────

export function IncidentDetail() {
  const { id } = useParams<{ id: string }>();

  const navigate = useNavigate();

  const {
    incident,
    signals,
    loading,
    error,
    refetch,
  } = useIncident(id!);

  const [transitioning, setTransitioning] = useState(false);

  const [actionError, setActionError] =
    useState<string | null>(null);

  async function handleTransition(action: StatusAction) {
    setTransitioning(true);

    setActionError(null);

    try {
      await api.incidents.transition(id!, action);

      await refetch();

    } catch (err) {

      if (err instanceof Error) {
        setActionError(err.message);
      } else {
        setActionError('Unknown error');
      }

    } finally {
      setTransitioning(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">

        <div className="text-center space-y-3">

          <p className="text-red-600 font-medium">
            {error || 'Incident not found'}
          </p>

          <button
            onClick={() => navigate('/')}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to dashboard
          </button>

        </div>
      </div>
    );
  }

  const transitions = TRANSITIONS[incident.status] ?? [];

  const canSubmitRca =
    incident.status === 'RESOLVED' && !incident.rca;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">

        <div className="max-w-5xl mx-auto flex items-center gap-4">

          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ← Dashboard
          </button>

          <h1 className="text-lg font-bold text-gray-900 truncate flex-1">
            {incident.title}
          </h1>

          <div className="flex items-center gap-2 shrink-0">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
          </div>

        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column: metadata + actions ─────────────────────────── */}
        <div className="space-y-4">

          {/* Metadata card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">

            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Details
            </h2>

            <dl className="space-y-2 text-sm">

              {[
                ['Component', incident.component_id],
                ['Incident ID', incident.id.substring(0, 8) + '...'],
                ['Signals', incident.signal_ids.length],
                ['Created', new Date(incident.created_at).toLocaleString()],
                [
                  'Resolved',
                  incident.resolved_at
                    ? new Date(incident.resolved_at).toLocaleString()
                    : '—',
                ],
                [
                  'Closed',
                  incident.closed_at
                    ? new Date(incident.closed_at).toLocaleString()
                    : '—',
                ],
                ['MTTR', formatMttr(incident.mttr_seconds)],
              ].map(([k, v]) => (

                <div
                  key={String(k)}
                  className="flex justify-between gap-2"
                >
                  <dt className="text-gray-500">
                    {k}
                  </dt>

                  <dd className="font-medium text-gray-800 text-right font-mono text-xs">
                    {String(v)}
                  </dd>
                </div>

              ))}

            </dl>
          </div>

          {/* Actions card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">

            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Actions
            </h2>

            {actionError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-md">
                {actionError}
              </div>
            )}

            <div className="space-y-2">

              {transitions.map((t) => (
                <button
                  key={t.action}
                  disabled={transitioning}
                  onClick={() => handleTransition(t.action)}
                  className={`w-full text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50 ${t.style}`}
                >
                  {transitioning
                    ? 'Processing...'
                    : t.label}
                </button>
              ))}

              {canSubmitRca && (
                <Link
                  to={`/incidents/${incident.id}/rca`}
                  className="block w-full text-center text-sm font-medium px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                >
                  📋 Submit RCA
                </Link>
              )}

              {incident.status === 'CLOSED' && (
                <p className="text-xs text-gray-400 text-center py-2">
                  This incident is closed.
                </p>
              )}

            </div>
          </div>

          {/* RCA summary */}
          {incident.rca && (
            <div className="bg-green-50 rounded-lg border border-green-200 p-4">

              <p className="text-sm font-semibold text-green-800 mb-1">
                ✓ RCA Submitted
              </p>

              <p className="text-xs text-green-600">
                Ready to close this incident.
              </p>

            </div>
          )}
        </div>

        {/* ── Right column: signal timeline ────────────────────────────── */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-4">

          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Signal Timeline ({signals.length})
          </h2>

          {signals.length === 0 ? (

            <p className="text-sm text-gray-400 text-center py-8">
              No signals linked yet.
            </p>

          ) : (

            <div className="max-h-[60vh] overflow-y-auto pr-2">

              {signals.map(
                (
                  s: {
                    _id: string;
                    message: string;
                    timestamp: string;
                    severity: string;
                  },
                  i: number
                ) => (
                  <SignalItem
                    key={s._id}
                    signal={s}
                    index={i}
                  />
                )
              )}

            </div>

          )}

        </div>

      </main>
    </div>
  );
}