'use client';

import { useState, useMemo } from 'react';
import type { ParticipantScore, ESPNTournamentStatus } from '@/lib/types';
import LeaderboardRow from './LeaderboardRow';
import { computeTierRankings } from '@/lib/utils';

const POOL_BUY_IN = 10;

const tooltipStyle: React.CSSProperties = {
  backgroundColor: '#0D2219',
  color: '#C5D5C9',
  fontSize: '13px',
  fontWeight: 400,
  textTransform: 'none',
  letterSpacing: 'normal',
  textAlign: 'left',
  lineHeight: '1.6',
  width: 'max-content',
  maxWidth: '340px',
  whiteSpace: 'normal',
  border: '1px solid #1A3D2A',
};

function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block align-middle ml-1">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label={text}
        className="cursor-help text-masters-ink-4 dark:text-masters-d-ink-4 hover:text-masters-ink-2 dark:hover:text-masters-d-ink-2 text-[10px] font-bold border border-masters-border dark:border-masters-d-border rounded-full w-3.5 h-3.5 inline-flex items-center justify-center leading-none transition-colors focus:outline-none"
      >
        i
      </button>
      {open && (
        <span
          className="absolute top-full left-1/2 -translate-x-1/2 mt-1 rounded-lg px-3 py-2 z-50 shadow-2xl"
          style={tooltipStyle}
        >
          {text}
        </span>
      )}
    </span>
  );
}

type SortKey = 'rank' | 'cuts' | 'ownership' | 'score' | 'evPurse' | 'livePurse' | 'payout';

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  return (
    <span className="inline-block ml-1 align-middle opacity-50">
      {active ? (dir === 'asc' ? '↑' : '↓') : <span className="text-masters-ink-4 dark:text-masters-d-ink-4">↕</span>}
    </span>
  );
}

export default function Leaderboard({ standings, status }: {
  standings: ParticipantScore[];
  status: ESPNTournamentStatus;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const totalPot = standings.length * POOL_BUY_IN;
  const totalParticipants = standings.length;
  const cutDay = status.period > 2;
  const tournamentOver = status.state === 'post' && status.period >= 4;
  const cutsLabel = cutDay ? 'Cuts' : 'Projected Cuts';
  const payoutLabel = tournamentOver ? 'Payout' : 'Projected Payout';

  const ownershipCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of standings) for (const pick of s.picks)
      map.set(pick.player.id, (map.get(pick.player.id) ?? 0) + 1);
    return map;
  }, [standings]);

  const ownershipByParticipant = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of standings) {
      let total = 0;
      for (const pick of s.picks) {
        const count = ownershipCount.get(pick.player.id) ?? 0;
        total += (count / totalParticipants) * 100;
      }
      map.set(s.participant.id, total);
    }
    return map;
  }, [standings, ownershipCount, totalParticipants]);

  const tierRankings = useMemo(() => computeTierRankings(standings), [standings]);

  const augmented = useMemo(() => standings.map((s) => ({
    s,
    alive: s.picks.filter((p) => !p.liveData?.isCut).length,
    ownership: ownershipByParticipant.get(s.participant.id) ?? 0,
  })), [standings, ownershipByParticipant]);

  const sorted = useMemo(() => {
    const copy = [...augmented];
    copy.sort((a, b) => {
      let diff = 0;
      switch (sortKey) {
        case 'rank':      diff = a.s.rank - b.s.rank; break;
        case 'cuts':      diff = b.alive - a.alive; break;
        case 'ownership': diff = b.ownership - a.ownership; break;
        case 'score':     diff = a.s.totalScoreToPar - b.s.totalScoreToPar; break;
        case 'evPurse':   diff = b.s.oddsEV - a.s.oddsEV; break;
        case 'livePurse': diff = b.s.totalEarnings - a.s.totalEarnings; break;
        case 'payout':    diff = a.s.rank - b.s.rank; break;
      }
      if (diff === 0) diff = b.s.oddsEV - a.s.oddsEV;
      return sortDir === 'asc' ? diff : -diff;
    });
    return copy;
  }, [augmented, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  const tied1stCount = standings.filter((s) => s.rank === 1).length;
  const projectedPayout = totalPot / tied1stCount;

  const thClass = 'pb-3 pr-4 sm:pr-6 text-xs uppercase tracking-wider text-masters-ink-3 dark:text-masters-d-ink-3 cursor-pointer select-none hover:text-masters-ink dark:hover:text-masters-d-ink transition-colors whitespace-nowrap';

  function th(key: SortKey, label: React.ReactNode, extra = '') {
    const ariaSortValue: React.AriaAttributes['aria-sort'] =
      sortKey !== key ? 'none' : sortDir === 'asc' ? 'ascending' : 'descending';
    return (
      <th aria-sort={ariaSortValue} className={`${thClass} ${extra}`} onClick={() => handleSort(key)}>
        {label}<SortIcon active={sortKey === key} dir={sortDir} />
      </th>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full text-sm min-w-[780px]">
        <thead>
          <tr className="border-b border-masters-border dark:border-masters-d-border text-left">
            {th('rank', 'Rank', 'w-12 pl-4 sm:pl-0')}
            <th className={`${thClass} cursor-default hover:text-masters-ink-3 dark:hover:text-masters-d-ink-3`}>Participant</th>
            {th('cuts', <>{cutsLabel}<InfoTooltip text="How many of your 10 players made (or are projected to make) the cut. More is better." /></>, 'text-center')}
            {th('ownership', <>Ownership<InfoTooltip text="How popular your picks are. Lower = more contrarian, which pays off more if those players outperform." /></>, 'text-right')}
            {th('score', <>Score<InfoTooltip text="Combined score vs par for all 10 picks. Red = under par (good)." /></>, 'text-right')}
            {th('evPurse', <>EV Purse<InfoTooltip text="Expected prize earnings based on betting odds — a forecast of how your picks will finish." /></>, 'text-right')}
            {th('livePurse', <>Live Purse<InfoTooltip text="What your picks would earn if the tournament ended right now. This determines your rank." /></>, 'text-right')}
            {th('payout', <>{payoutLabel}<InfoTooltip text={`What you'd win right now. The $${totalPot} pot goes to 1st place — split if tied.`} /></>, 'text-right')}
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ s, alive }, i) => {
            const isTop3 = s.rank <= 3 && s.totalEarnings > 0;
            const isLeading = s.rank === 1;
            const total = s.picks.length;
            const cutsColor = alive === total
              ? 'text-masters-green dark:text-masters-d-green'
              : alive === 0
              ? 'text-masters-red dark:text-masters-d-red'
              : 'text-masters-gold dark:text-masters-d-gold';
            const ownership = ownershipByParticipant.get(s.participant.id) ?? 0;
            const ownershipDisplay = `${ownership.toFixed(1)}%`;

            return (
              <LeaderboardRow
                key={s.participant.id}
                s={s} index={i}
                projectedPayout={projectedPayout}
                isTop3={isTop3} isLeading={isLeading}
                cutsColor={cutsColor}
                alive={alive} total={total}
                ownershipDisplay={ownershipDisplay}
                status={status} colSpan={999}
                ownershipCount={ownershipCount}
                totalParticipants={totalParticipants}
                tierRankings={tierRankings}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
