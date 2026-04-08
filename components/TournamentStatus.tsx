import type { ESPNTournamentStatus } from '@/lib/types';

export default function TournamentStatus({ status }: { status: ESPNTournamentStatus }) {
  const { state, period, detail } = status;

  let label = '';
  let classes = '';

  if (state === 'pre') {
    label = 'Pre-Tournament';
    classes = 'bg-masters-hover dark:bg-masters-d-hover text-masters-ink-2 dark:text-masters-d-ink-2 border border-masters-border dark:border-masters-d-border';
  } else if (state === 'in') {
    label = detail || `Round ${period} In Progress`;
    classes = 'bg-masters-green/10 dark:bg-masters-d-green/10 text-masters-green dark:text-masters-d-green border border-masters-green/30 dark:border-masters-d-green/30';
  } else {
    label = period >= 4 ? 'Tournament Complete' : detail || 'Round Complete';
    classes = 'bg-masters-gold/10 dark:bg-masters-d-gold/10 text-masters-gold dark:text-masters-d-gold border border-masters-gold/30 dark:border-masters-d-gold/30';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${classes}`}>
      {state === 'in' && (
        <span className="w-1.5 h-1.5 rounded-full bg-masters-green dark:bg-masters-d-green animate-pulse" />
      )}
      {label}
    </span>
  );
}
