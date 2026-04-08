'use client';

import { useState } from 'react';
import type { ParticipantScore } from '@/lib/types';
import { getTierEmoji, type TierRankMap } from '@/lib/utils';

const STAT_MAP: Record<string, string> = {
  R1: 'R1',
  R2: 'R2',
  R3: 'R3',
  R4: 'R4',
  scoringAverage: 'Avg',
  drivingDistance: 'Driving Dist',
  drivingAccuracy: 'FIR %',
  fairwaysInRegulation: 'FIR %',
  greensInRegulation: 'GIR %',
  puttingAverage: 'Putts/Rnd',
  totalPutts: 'Total Putts',
  eagles: 'Eagles',
  birdies: 'Birdies',
  bogeys: 'Bogeys',
  doubleBogeys: 'Doubles+',
  doubles: 'Doubles+',
  sandSaves: 'Sand Saves',
  scrambling: 'Scrambling',
};

const ROUND_STATS = new Set(['R1', 'R2', 'R3', 'R4']);

const PLACEHOLDER_STATS = [
  'Driving Dist', 'FIR %', 'GIR %', 'Putts/Rnd',
  'Eagles', 'Birdies', 'Bogeys', 'Doubles+',
];

interface Props {
  score: ParticipantScore;
  ownershipCount: Map<string, number>;
  totalParticipants: number;
  tournamentState: 'pre' | 'in' | 'post';
  tierRankings: TierRankMap;
}

export default function ParticipantDetail({
  score,
  ownershipCount,
  totalParticipants,
  tournamentState,
  tierRankings,
}: Props) {
  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(new Set());

  function toggleTier(tierId: string) {
    setExpandedTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tierId)) next.delete(tierId);
      else next.add(tierId);
      return next;
    });
  }

  const isPreTournament = tournamentState === 'pre';

  return (
    <div className="space-y-2">
      {score.picks.map(({ tier, player, liveData }) => {
        const pickCount = ownershipCount.get(player.id) ?? 0;
        const ownershipPct = ((pickCount / totalParticipants) * 100).toFixed(1);
        const isCut = liveData?.isCut ?? false;
        const isExpanded = expandedTiers.has(tier.id);

        const tierKey = `${tier.id}:${player.id}`;
        const tierRank = tierRankings.get(tierKey);
        const emoji = isPreTournament
          ? ''
          : getTierEmoji(tierRank?.rank ?? 99, tierRank?.total ?? 99, isCut);

        const stats = (liveData?.statistics ?? []).filter(
          (s) => STAT_MAP[s.name] && s.displayValue && s.displayValue !== '--'
        );
        const roundStats = stats.filter((s) => ROUND_STATS.has(s.name));
        const otherStats = stats.filter((s) => !ROUND_STATS.has(s.name));

        return (
          <div
            key={tier.id}
            className={`rounded-xl border transition-colors ${
              isCut
                ? 'border-red-900/50 bg-red-950/20'
                : 'border-slate-700/50 bg-slate-900'
            }`}
          >
            {/* Main card */}
            <div className="px-4 sm:px-5 py-4">
              {/* Top row: tier label + ownership */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {tier.name}
                </span>
                <span className="text-[10px] text-slate-600">
                  Owned by{' '}
                  <span className="font-medium text-slate-400">
                    {pickCount}/{totalParticipants}
                  </span>{' '}
                  <span className="text-slate-600">({ownershipPct}%)</span>
                </span>
              </div>

              {/* Main row: headshot + name + stats */}
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Left: headshot + name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <img
                    src={`https://a.espncdn.com/i/headshots/golf/players/full/${player.espnId}.png`}
                    alt={liveData?.displayName ?? player.displayName}
                    width={44}
                    height={44}
                    className={`rounded-full object-cover bg-slate-700 ring-1 ring-slate-600 shrink-0 ${isCut ? 'grayscale opacity-50' : ''}`}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-base font-semibold leading-tight ${isCut ? 'line-through text-slate-600' : 'text-slate-100'}`}>
                        {emoji && <span className="mr-1">{emoji}</span>}
                        {liveData?.displayName ?? player.displayName}
                        {isCut && (
                          <span className="ml-2 text-xs font-bold text-red-400">CUT</span>
                        )}
                      </p>
                      <button
                        onClick={() => toggleTier(tier.id)}
                        className="text-slate-600 hover:text-slate-400 transition-colors shrink-0"
                        aria-label={isExpanded ? 'Hide stats' : 'Show stats'}
                      >
                        <svg
                          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    {roundStats.length > 0 && (
                      <div className="flex items-center gap-3 mt-1">
                        {roundStats.map((s) => (
                          <span key={s.name} className="text-xs">
                            <span className="text-slate-600">{s.name} </span>
                            <span className="font-medium text-slate-400">{s.displayValue}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: stats */}
                <div className="flex items-center gap-3 sm:gap-4 shrink-0 flex-wrap justify-end">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Pos</p>
                    <p className="text-sm font-semibold tabular-nums text-slate-300">
                      {isPreTournament ? <span className="text-slate-700">—</span> : isCut ? '—' : (liveData?.position || '—')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Score</p>
                    <p className={`text-sm font-semibold tabular-nums ${
                      isPreTournament ? 'text-slate-700' :
                      isCut ? 'text-slate-600' :
                      liveData?.scoreDisplay.startsWith('-') ? 'text-red-400' :
                      liveData?.scoreDisplay === 'E' ? 'text-slate-300' : 'text-slate-500'
                    }`}>
                      {isPreTournament ? '—' : (liveData?.scoreDisplay || 'E')}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Thru</p>
                    <p className="text-sm font-semibold tabular-nums text-slate-300">
                      {isPreTournament
                        ? <span className="text-slate-700">—</span>
                        : liveData?.state === 'in' && (liveData.thru > 0) ? liveData.thru
                        : liveData?.state === 'post' ? 'F'
                        : '—'}
                    </p>
                  </div>

                  {liveData && liveData.cutProbability > 0 && (
                    <div className="text-center">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Cut %</p>
                      <p className={`text-sm font-semibold tabular-nums ${
                        liveData.cutProbability >= 0.75 ? 'text-emerald-400' :
                        liveData.cutProbability >= 0.50 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {(liveData.cutProbability * 100).toFixed(0)}%
                      </p>
                    </div>
                  )}

                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Live $</p>
                    <p className={`text-sm font-semibold tabular-nums ${
                      liveData && liveData.projectedEarnings > 0 ? 'text-emerald-400' : 'text-slate-700'
                    }`}>
                      {liveData && liveData.projectedEarnings > 0 ? liveData.projectedEarningsDisplay : '$0'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">EV $</p>
                    <p className={`text-sm font-semibold tabular-nums ${
                      liveData && liveData.oddsEV > 0 ? 'text-sky-400' : 'text-slate-700'
                    }`}>
                      {liveData && liveData.oddsEV > 0 ? liveData.oddsEVDisplay : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded stats panel */}
            {isExpanded && (
              <div className="border-t border-slate-700/50 px-4 sm:px-5 py-3 bg-slate-800/30 rounded-b-xl">
                {otherStats.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-4 gap-y-3">
                    {otherStats.map((s) => (
                      <div key={s.name} className="text-center">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
                          {STAT_MAP[s.name]}
                        </p>
                        <p className="text-sm font-semibold text-slate-300 tabular-nums">
                          {s.displayValue}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-x-4 gap-y-3">
                    {PLACEHOLDER_STATS.map((label) => (
                      <div key={label} className="text-center">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
                          {label}
                        </p>
                        <p className="text-sm font-semibold text-slate-700 tabular-nums">—</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
