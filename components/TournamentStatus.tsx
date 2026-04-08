import type { ESPNTournamentStatus } from '@/lib/types';

export default function TournamentStatus({ status }: { status: ESPNTournamentStatus }) {
  const { state, period, detail } = status;

  let label = '';
  let classes = '';

  if (state === 'pre') {
    label = 'Pre-Tournament';
    classes = 'bg-slate-800 text-slate-400 border border-slate-700';
  } else if (state === 'in') {
    label = detail || `Round ${period} In Progress`;
    classes = 'bg-emerald-950 text-emerald-400 border border-emerald-800';
  } else {
    label = period >= 4 ? 'Tournament Complete' : detail || 'Round Complete';
    classes = 'bg-sky-950 text-sky-400 border border-sky-800';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${classes}`}>
      {state === 'in' && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      )}
      {label}
    </span>
  );
}
