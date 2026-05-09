import { useState } from 'react';
import { useIncidents } from '../hooks/useIncidents';
import { IncidentRow } from '../components';
import type { Incident } from '../types';

// ─── Filter bar ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'All Statuses', value: '' },
  { label: '🔓 Open', value: 'OPEN' },
  { label: '🔍 Investigating', value: 'INVESTIGATING' },
  { label: '✅ Resolved', value: 'RESOLVED' },
  { label: '🔒 Closed', value: 'CLOSED' },
];

const SEVERITY_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'All Severities', value: '' },
  { label: 'P0 Critical', value: 'P0' },
  { label: 'P1 High', value: 'P1' },
  { label: 'P2 Moderate', value: 'P2' },
];

// ─── Stats card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`rounded-lg border ${color} px-5 py-4 flex flex-col gap-1`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  const { incidents, total, loading, error, refetch } = useIncidents(
    {
      status: statusFilter || undefined,
      severity: severityFilter || undefined,
    },
    10_000
  );

  // ── Derived counts for stat cards ─────────────────────────────────────────
  const active = incidents.filter(
    (i: Incident) => i.status !== 'CLOSED'
  ).length;

  const p0Count = incidents.filter(
    (i: Incident) => i.severity === 'P0'
  ).length;

  const noRca = incidents.filter(
    (i: Incident) => i.status === 'RESOLVED' && !i.rca
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            🚨 Incident Management System
          </h1>

          <p className="text-xs text-gray-400 mt-0.5">
            Auto-refreshes every 10s
          </p>
        </div>

        <button
          onClick={refetch}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          ↻ Refresh
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ── Stat cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total"
            value={total}
            color="border-gray-200 bg-white text-gray-800"
          />

          <StatCard
            label="Active"
            value={active}
            color="border-red-200 bg-red-50 text-red-800"
          />

          <StatCard
            label="P0 Critical"
            value={p0Count}
            color="border-red-300 bg-red-100 text-red-900"
          />

          <StatCard
            label="Awaiting RCA"
            value={noRca}
            color="border-yellow-200 bg-yellow-50 text-yellow-800"
          />
        </div>

        {/* ── Filters ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 items-center">

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SEVERITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {(statusFilter || severityFilter) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setSeverityFilter('');
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              Clear filters
            </button>
          )}

          <span className="ml-auto text-sm text-gray-400">
            {loading
              ? 'Refreshing...'
              : `${total} incident${total !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* ── Error state ─────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            ⚠️ Failed to load incidents: {error}
          </div>
        )}

        {/* ── Table ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-left">

            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {[
                  'Component',
                  'Title',
                  'Severity',
                  'Status',
                  'Signals',
                  'MTTR',
                  'RCA',
                  'Created',
                ].map((h: string) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">

              {loading && incidents.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    <div className="flex justify-center">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>

              ) : incidents.length === 0 ? (

                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-gray-400 text-sm"
                  >
                    No incidents found. Send a signal to create one.
                  </td>
                </tr>

              ) : (

                incidents.map((incident: Incident) => (
                  <IncidentRow
                    key={incident.id}
                    incident={incident}
                  />
                ))

              )}

            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}