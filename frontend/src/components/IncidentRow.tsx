import type { Incident, Severity } from '@/types';

import { useNavigate } from 'react-router-dom';

import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';

import { formatMttr } from '@/utils/formatMttr';

export function IncidentRow({ incident }: { incident: Incident }) {
  const navigate = useNavigate();

  const rowBorder: Record<Severity, string> = {
    P0: 'border-l-4 border-l-red-500',
    P1: 'border-l-4 border-l-orange-400',
    P2: 'border-l-4 border-l-yellow-400',
  };

  return (
    <tr
      onClick={() => navigate(`/incidents/${incident.id}`)}
      className={`
        cursor-pointer hover:bg-gray-50 transition-colors
        ${rowBorder[incident.severity]}
        ${incident.status === 'CLOSED' ? 'opacity-60' : ''}
      `}
    >
      {/* Component */}
      <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">
        {incident.component_id}
      </td>

      {/* Title */}
      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
        {incident.title}
      </td>

      {/* Severity */}
      <td className="px-4 py-3">
        <SeverityBadge severity={incident.severity} />
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={incident.status} />
      </td>

      {/* Signals */}
      <td className="px-4 py-3 text-sm text-center text-gray-600">
        {incident.signal_ids.length}
      </td>

      {/* MTTR */}
      <td className="px-4 py-3 text-sm text-gray-600 font-mono">
        {formatMttr(incident.mttr_seconds)}
      </td>

      {/* RCA */}
      <td className="px-4 py-3 text-sm text-center">
        {incident.rca ? (
          <span className="text-green-600 font-medium">✓</span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>

      {/* Created */}
      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
        {new Date(incident.created_at).toLocaleString()}
      </td>
    </tr>
  );
}