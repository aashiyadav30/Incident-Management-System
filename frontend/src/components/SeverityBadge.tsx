import type { Severity } from '@/types';

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
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${severityStyles[severity]}`}
    >
      {severityLabels[severity]}
    </span>
  );
}