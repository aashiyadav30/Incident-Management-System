import type { IncidentStatus } from '@/types';

const statusStyles: Record<IncidentStatus, string> = {
  OPEN:          'bg-red-50 text-red-700 border border-red-200',
  INVESTIGATING: 'bg-blue-50 text-blue-700 border border-blue-200',
  RESOLVED:      'bg-green-50 text-green-700 border border-green-200',
  CLOSED:        'bg-gray-100 text-gray-600 border border-gray-200',
};

const statusIcons: Record<IncidentStatus, string> = {
  OPEN: '🔓',
  INVESTIGATING: '🔍',
  RESOLVED: '✅',
  CLOSED: '🔒',
};

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}
    >
      {statusIcons[status]} {status}
    </span>
  );
}