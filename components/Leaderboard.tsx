'use client';

import { useState, useMemo } from 'react';
import type { ParticipantScore, ESPNTournamentStatus } from '@/lib/types';
import LeaderboardRow from './LeaderboardRow';
import { computeTierRankings } from '@/lib/utils';

const POOL_BUY_IN = 10;

const tooltipStyle: React.CSSProperties = {
  backgroundColor: '#0f172a',
  color: '#cbd5e1',
  fontSize: '13px',
  fontWeight: 400,
  textTransform: 'none',
  letterSpacing: 'normal',
  textAlign: 'left',
  lineHeight: '1.5',
  width: 'max-content',
  maxWidth: '360px',
  whiteSpace: 'normal',
  border: '1px solid rgba(255,255,255,0.1)',
};

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative inline-block group align-middle ml-1">
      <span className="cursor-help text-slate-600 hover:text-slate-400 text-[10px] font-bold border border-slate-600 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center leading-none transition-colors">
        i
      </span>
      <span
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-2xl"
        style={tooltipStyle}
      >
        {text}
      </span>
    </span>
  );
}

type SortKey = 'rank' | 'cuts' | 'ownership' | 'score' | 'evPurse' | 'livePurse' | 'payout';

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  return (
    <span className="inline-block ml-1 align-middle opacity-60">
      {active ? (dir === 'asc' ? '↑' : '↓') : <span className="text-slate-700">↕</span>}
    </span>
  );
}

export default function Leaderboard({
  standings,
  status,
}: {
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
    for (const s of standings) {
      for (const pick of s.picks) {
        map.set(pick.player.id, (map.get(pick.player.id) ?? 0) + 1);
      }
    }
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

  const augmented = useMemo(() => standings.map((s) => {
    const alive = s.picks.filter((p) => !p.liveData?.isCut).length;
    const ownership = ownershipByParticipant.get(s.participant.id) ?? 0;
    return { s, alive, ownership };
  }), [standings, ownershipByParticipant]);

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
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const tied1stCount = standings.filter((s) => s.rank === 1).length;
  const projectedPayout = totalPot / tied1stCount;

  function th(key: SortKey, label: React.ReactNode, className?: string) {
    return (
      <th
        className={`pb-3 pr-4 sm:pr-6 cursor-pointer select-none hover:text-slate-200 transition-colors whitespace-nowrap ${className ?? ''}`}
        onClick={() => handleSort(key)}
      >
        {label}
        <SortIcon active={sortKey === key} dir={sortDir} />
      </th>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full text-sm min-w-[480px]">
        <thead>
          <tr className="border-b border-slate-700/50 text-left text-slate-500 text-xs uppercase tracking-wider">
            {th('rank', 'Rank', 'w-12 pl-4 sm:pl-0')}
            <th className="pb-3 pr-4 sm:pr-6 text-xs uppercase tracking-wider text-slate-500">Participant</th>
            {th(
              'cuts',
              <>
                {cutsLabel}
                <InfoTooltip text="How many of your 10 players made (or are projected to make) the cut and keep playing on the weekend. More is better." />
              </>,
              'text-center hidden md:table-cell'
            )}
            {th(
              'ownership',
              <>
                Ownership
                <InfoTooltip text="How popular your picks are compared to everyone else. If a player was picked by half the pool, that's 50% ownership toward your total. Lower = you went more unique, which pays off more if those players outperform." />
              </>,
              'text-right hidden md:table-cell'
            )}
            {th(
              'score',
              <>
                Score
                <InfoTooltip text="The combined score of all 10 of your players added together. Red means under par (good), gray means over par." />
              </>,
              'text-right hidden md:table-cell'
            )}
            {th(
              'evPurse',
              <>
                EV Purse
                <InfoTooltip text="How much prize money your picks are expected to earn based on current betting odds. Think of it as a forecast — if the tournament played out 1,000 times using today's odds, this is the average result. Updates every 2 hours." />
              </>,
              'text-right hidden md:table-cell'
            )}
            {th(
              'livePurse',
              <>
                Live Purse
                <InfoTooltip text="How much prize money your picks would earn if the tournament ended right now. This is what determines your rank and whether you win the pool." />
              </>,
              'text-right'
            )}
            {th(
              'payout',
              <>
                {payoutLabel}
                <InfoTooltip text={`What you'd win if the tournament ended right now. The full $${totalPot} pot goes to whoever is in 1st place — split evenly if there's a tie.`} />
              </>,
              'text-right'
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ s, alive }, i) => {
            const isTop3 = s.rank <= 3 && s.totalEarnings > 0;
            const isLeading = s.rank === 1;
            const total = s.picks.length;
            const cutsColor =
              alive === total ? 'text-emerald-400' : alive === 0 ? 'text-red-400' : 'text-amber-400';
            const ownership = ownershipByParticipant.get(s.participant.id) ?? 0;
            const ownershipDisplay = `${ownership.toFixed(1)}%`;

            return (
              <LeaderboardRow
                key={s.participant.id}
                s={s}
                index={i}
                projectedPayout={projectedPayout}
                isTop3={isTop3}
                isLeading={isLeading}
                cutsColor={cutsColor}
                alive={alive}
                total={total}
                ownershipDisplay={ownershipDisplay}
                status={status}
                colSpan={999}
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
