'use client';

import { useState, useMemo } from 'react';
import type { ParticipantScore, ESPNTournamentStatus } from '@/lib/types';
import LeaderboardRow from './LeaderboardRow';

const POOL_BUY_IN = 10;

const tooltipStyle: React.CSSProperties = {
  backgroundColor: '#1f2937',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 400,
  textTransform: 'none',
  letterSpacing: 'normal',
  textAlign: 'left',
  lineHeight: '1.5',
  width: 'max-content',
  maxWidth: '480px',
  whiteSpace: 'normal',
};

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative inline-block group align-middle ml-1">
      <span className="cursor-help text-gray-400 hover:text-gray-600 text-[10px] font-bold border border-gray-400 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center leading-none">
        i
      </span>
      <span
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 rounded px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl"
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
      {active ? (dir === 'asc' ? '↑' : '↓') : <span className="text-gray-300">↕</span>}
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

  // Build ownership maps
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

  // Augment standings with derived sort values
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

  // Compute projected payout based on rank-1 participants in current sort (use original standings for payout)
  const tied1stCount = standings.filter((s) => s.rank === 1).length;
  const projectedPayout = totalPot / tied1stCount;

  function th(key: SortKey, label: React.ReactNode, className?: string) {
    return (
      <th
        className={`pb-3 pr-6 cursor-pointer select-none hover:text-gray-700 transition-colors whitespace-nowrap ${className ?? ''}`}
        onClick={() => handleSort(key)}
      >
        {label}
        <SortIcon active={sortKey === key} dir={sortDir} />
      </th>
    );
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase tracking-wide">
            {th('rank', 'Rank', 'w-12')}
            <th className="pb-3 pr-6">Participant</th>
            {th(
              'cuts',
              <>
                {cutsLabel}
                <InfoTooltip text="X/10 — how many of your picked players are projected to survive the cut. Goes from projected during Rounds 1–2 to confirmed after the cut is made." />
              </>,
              'text-center'
            )}
            {th(
              'ownership',
              <>
                Ownership
                <InfoTooltip text="Sum of each pick's ownership % across all participants. For example, if Rory was picked by 3 of 11 players, his ownership is 27.3%. Your total is the sum across all 10 picks. Lower = more contrarian lineup." />
              </>,
              'text-right'
            )}
            {th(
              'score',
              <>
                Score
                <InfoTooltip text="Combined score vs par for all 10 of your picks. Calculated as the sum of each player's current score-to-par. Red = under par (good), gray = over par." />
              </>,
              'text-right'
            )}
            {th(
              'evPurse',
              <>
                EV Purse
                <InfoTooltip text="Odds-based expected purse. Uses betting market win probabilities (vig stripped), then runs a Harville simulation to estimate each player's probability of finishing in every position. EV = Σ P(finish k) × purse[k]. Updates every 2 hours from live odds." />
              </>,
              'text-right'
            )}
            {th(
              'livePurse',
              <>
                Live Purse
                <InfoTooltip text="What your picks would earn if the tournament ended right now, based on current leaderboard positions. This drives your pool rank and projected payout." />
              </>,
              'text-right'
            )}
            {th(
              'payout',
              <>
                {payoutLabel}
                <InfoTooltip text={`Winner-take-all pool prize based on current Live Purse standings. Total pot is $${totalPot} (${totalParticipants} players × $${POOL_BUY_IN}). Split evenly if tied for 1st.`} />
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
              alive === total ? 'text-green-600' : alive === 0 ? 'text-red-500' : 'text-yellow-600';
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
                colSpan={8}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
