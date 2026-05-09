import { useNavigate } from 'react-router-dom';
import type { Severity, IncidentStatus, Incident } from '../types';

// ─── SeverityBadge ────────────────────────────────────────────────────────────

const severityStyles: Record<Severity, string> = {
  P0: 'bg-red-100 text-red-800 border border-red-300 animate-pulse',
  P1: 'bg-orange-100 text-orange-800 border border-orange-300',
  P2: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
};

const severityLabels: Record<Severity, string> = {
  P0: '🔴 P0 Critical',
  P1: '🟠 P1 High',
  P2: '🟡 P2 Moderate',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${severityStyles[severity]}`}>
      {severityLabels[severity]}
    </span>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

const statusStyles: Record<IncidentStatus, string> = {
  OPEN:          'bg-red-50   text-red-700   border border-red-200',
  INVESTIGATING: 'bg-blue-50  text-blue-700  border border-blue-200',
  RESOLVED:      'bg-green-50 text-green-700 border border-green-200',
  CLOSED:        'bg-gray-100 text-gray-600  border border-gray-200',
};

const statusIcons: Record<IncidentStatus, string> = {
  OPEN:          '🔓',
  INVESTIGATING: '🔍',
  RESOLVED:      '✅',
  CLOSED:        '🔒',
};

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}>
      {statusIcons[status]} {status}
    </span>
  );
}

// ─── formatMttr ───────────────────────────────────────────────────────────────

export function formatMttr(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 60)    return `${seconds}s`;
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

// ─── IncidentRow ──────────────────────────────────────────────────────────────

const rowBorder: Record<Severity, string> = {
  P0: 'border-l-4 border-l-red-500',
  P1: 'border-l-4 border-l-orange-400',
  P2: 'border-l-4 border-l-yellow-400',
};

export function IncidentRow({ incident }: { incident: Incident }) {
  const navigate = useNavigate();

  return (
    <tr
      onClick={() => navigate(`/incidents/${incident.id}`)}
      className={`
        cursor-pointer hover:bg-gray-50 transition-colors
        ${rowBorder[incident.severity]}
        ${incident.status === 'CLOSED' ? 'opacity-60' : ''}
      `}
    >
      <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">
        {incident.component_id}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
        {incident.title}
      </td>
      <td className="px-4 py-3">
        <SeverityBadge severity={incident.severity} />
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={incident.status} />
      </td>
      <td className="px-4 py-3 text-sm text-center text-gray-600">
        {incident.signal_ids.length}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 font-mono">
        {formatMttr(incident.mttr_seconds)}
      </td>
      <td className="px-4 py-3 text-sm text-center">
        {incident.rca
          ? <span className="text-green-600 font-medium">✓</span>
          : <span className="text-gray-300">—</span>
        }
      </td>
      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
        {new Date(incident.created_at).toLocaleString()}
      </td>
    </tr>
  );
}