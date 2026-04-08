import type { ESPNTournamentStatus } from '@/lib/types';

export default function TournamentStatus({ status }: { status: ESPNTournamentStatus }) {
  const { state, period, detail } = status;

  let label = '';
  let colorClass = '';

  if (state === 'pre') {
    label = 'Pre-Tournament';
    colorClass = 'bg-gray-100 text-gray-600';
  } else if (state === 'in') {
    label = detail || `Round ${period} In Progress`;
    colorClass = 'bg-green-100 text-green-800';
  } else {
    label = period >= 4 ? 'Tournament Complete' : detail || 'Round Complete';
    colorClass = 'bg-blue-100 text-blue-800';
  }

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}>
      {state === 'in' && (
        <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
      )}
      {label}
    </span>
  );
}
