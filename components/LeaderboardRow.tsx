'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ParticipantScore, ESPNTournamentStatus } from '@/lib/types';
import { getTierEmoji, type TierRankMap } from '@/lib/utils';

interface Props {
  s: ParticipantScore;
  index: number;
  projectedPayout: number;
  isTop3: boolean;
  isLeading: boolean;
  cutsColor: string;
  alive: number;
  total: number;
  ownershipDisplay: string;
  status: ESPNTournamentStatus;
  colSpan: number;
  ownershipCount: Map<string, number>;
  totalParticipants: number;
  tierRankings: TierRankMap;
}

export default function LeaderboardRow({
  s,
  index,
  projectedPayout,
  isTop3,
  isLeading,
  cutsColor,
  alive,
  total,
  ownershipDisplay,
  status,
  colSpan,
  ownershipCount,
  totalParticipants,
  tierRankings,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className={`border-b border-slate-800 transition-colors cursor-pointer ${
          isLeading && s.totalEarnings > 0
            ? 'bg-amber-950/20 hover:bg-amber-950/30'
            : 'hover:bg-slate-800/40'
        } ${expanded ? (isLeading && s.totalEarnings > 0 ? 'bg-amber-950/30' : 'bg-slate-800/30') : ''}`}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Rank */}
        <td className="py-4 pr-4 sm:pr-6 pl-4 sm:pl-0">
          <span className={`font-bold tabular-nums text-sm ${
            isTop3 && s.totalEarnings > 0
              ? 'text-amber-400'
              : 'text-slate-400'
          }`}>
            {s.rankDisplay}
          </span>
        </td>

        {/* Participant */}
        <td className="py-4 pr-4 sm:pr-6">
          <div className="flex items-center gap-2">
            <Link
              href={`/participant/${s.participant.slug}`}
              className="font-semibold text-slate-100 hover:text-emerald-400 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {s.participant.teamName ?? s.participant.name}
            </Link>
            <span className={`text-slate-600 transition-transform inline-block ${expanded ? 'rotate-180' : ''}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
        </td>

        {/* Cuts — hidden on mobile */}
        <td className={`py-4 pr-4 sm:pr-6 text-center font-medium tabular-nums text-sm hidden md:table-cell ${cutsColor}`}>
          {alive}/{total}
        </td>

        {/* Ownership — hidden on mobile */}
        <td className="py-4 pr-4 sm:pr-6 text-right font-medium tabular-nums text-sm text-slate-400 hidden md:table-cell">
          {ownershipDisplay}
        </td>

        {/* Score — hidden on mobile */}
        <td className="py-4 pr-4 sm:pr-6 text-right font-medium tabular-nums text-sm hidden md:table-cell">
          {status.state === 'pre' ? (
            <span className="text-slate-700">—</span>
          ) : (
            <span className={s.totalScoreToPar < 0 ? 'text-red-400' : s.totalScoreToPar > 0 ? 'text-slate-500' : 'text-slate-300'}>
              {s.totalScoreDisplay}
            </span>
          )}
        </td>

        {/* EV Purse — hidden on mobile */}
        <td className="py-4 pr-4 sm:pr-6 text-right font-medium tabular-nums text-sm hidden md:table-cell">
          {s.oddsEV > 0 ? (
            <span className="text-sky-400">{s.oddsEVDisplay}</span>
          ) : (
            <span className="text-slate-700">—</span>
          )}
        </td>

        {/* Live Purse */}
        <td className="py-4 pr-4 sm:pr-6 text-right font-medium tabular-nums text-sm">
          {s.totalEarnings > 0 ? (
            <span className="text-emerald-400">{s.totalEarningsDisplay}</span>
          ) : (
            <span className="text-slate-600">$0</span>
          )}
        </td>

        {/* Projected Payout */}
        <td className="py-4 text-right font-medium tabular-nums text-sm">
          {isLeading ? (
            <span className="text-amber-400 font-bold">${projectedPayout.toLocaleString()}</span>
          ) : (
            <span className="text-slate-700">—</span>
          )}
        </td>
      </tr>

      {/* Expanded picks */}
      {expanded && (
        <tr className="border-b border-slate-800 bg-slate-800/20">
          <td colSpan={colSpan} className="px-4 sm:px-6 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-4">
              {s.picks.map(({ tier, player, liveData }) => {
                const isCut = liveData?.isCut ?? false;
                const score = liveData?.scoreDisplay;
                const pos = isCut ? 'CUT' : (liveData?.position ?? '—');
                const name = liveData?.displayName ?? player.displayName;
                const pickCount = ownershipCount.get(player.id) ?? 0;
                const pct = ((pickCount / totalParticipants) * 100).toFixed(0);
                const tierRank = tierRankings.get(`${tier.id}:${player.id}`);
                const emoji = status.state === 'pre' ? '' : getTierEmoji(tierRank?.rank ?? 99, tierRank?.total ?? 99, isCut);

                return (
                  <div key={tier.id} className={`text-xs ${isCut ? 'opacity-40' : ''}`}>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <p className="text-slate-500 font-medium uppercase tracking-wider text-[10px]">
                        {tier.name}
                      </p>
                      <p className="text-slate-600 text-[10px]">{pct}%</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://a.espncdn.com/i/headshots/golf/players/full/${player.espnId}.png`}
                        alt={name}
                        width={32}
                        height={32}
                        className="rounded-full object-cover bg-slate-700 shrink-0 ring-1 ring-slate-600"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div>
                        <p className={`font-semibold leading-tight ${isCut ? 'line-through text-slate-600' : 'text-slate-200'}`}>
                          {emoji && <span className="mr-1">{emoji}</span>}
                          {name}
                        </p>
                        <p className="text-slate-500 mt-0.5">
                          <span className={score?.startsWith('-') ? 'text-red-400 font-medium' : 'text-slate-400'}>
                            {status.state === 'pre' ? <span className="text-slate-700">—</span> : (score ?? 'E')}
                          </span>
                          {' · '}
                          <span className="text-slate-500">{status.state === 'pre' ? <span className="text-slate-700">—</span> : pos}</span>
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-[11px]">
                          <span className={liveData?.projectedEarnings ?? 0 > 0 ? 'text-emerald-400 font-medium' : 'text-slate-700'}>
                            {liveData?.projectedEarnings ?? 0 > 0 ? liveData!.projectedEarningsDisplay : '$0'}
                          </span>
                          <span className="text-slate-700">·</span>
                          <span className={liveData?.oddsEV ?? 0 > 0 ? 'text-sky-400 font-medium' : 'text-slate-700'}>
                            {liveData?.oddsEV ?? 0 > 0 ? liveData!.oddsEVDisplay : '—'}
                          </span>
                          {liveData?.cutProbability != null && liveData.cutProbability > 0 && (
                            <>
                              <span className="text-slate-700">·</span>
                              <span className={
                                liveData.cutProbability >= 0.75 ? 'text-emerald-400 font-medium' :
                                liveData.cutProbability >= 0.50 ? 'text-amber-400 font-medium' : 'text-red-400 font-medium'
                              }>
                                {(liveData.cutProbability * 100).toFixed(0)}% cut
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
