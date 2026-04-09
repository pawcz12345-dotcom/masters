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
  s, index, projectedPayout, isTop3, isLeading,
  cutsColor, alive, total, ownershipDisplay,
  status, colSpan, ownershipCount, totalParticipants, tierRankings,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const isGoldRow = isLeading && s.totalEarnings > 0;
  const rowBase = isGoldRow
    ? 'bg-masters-gold/5 dark:bg-masters-d-gold/5 hover:bg-masters-gold/10 dark:hover:bg-masters-d-gold/10'
    : 'hover:bg-masters-hover dark:hover:bg-masters-d-hover';
  const rowExpanded = isGoldRow
    ? 'bg-masters-gold/10 dark:bg-masters-d-gold/10'
    : 'bg-masters-hover dark:bg-masters-d-hover';

  return (
    <>
      <tr
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        className={`border-b border-masters-border dark:border-masters-d-border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-masters-green dark:focus-visible:ring-masters-d-green ${expanded ? rowExpanded : rowBase}`}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
      >
        {/* Rank */}
        <td className="py-4 pr-4 sm:pr-6 pl-4 sm:pl-0">
          <span className={`font-bold tabular-nums text-sm ${
            s.rank === 1 ? 'text-masters-gold dark:text-masters-d-gold'
            : s.rank === 2 ? 'text-slate-400 dark:text-slate-300'
            : s.rank === 3 ? 'text-amber-700 dark:text-amber-500'
            : 'text-masters-ink-3 dark:text-masters-d-ink-3'
          }`}>
            {s.rankDisplay}
          </span>
        </td>

        {/* Participant */}
        <td className="py-4 pr-4 sm:pr-6">
          <div className="flex items-center gap-2">
            <Link
              href={`/participant/${s.participant.slug}`}
              className="font-semibold text-masters-ink dark:text-masters-d-ink hover:text-masters-green dark:hover:text-masters-d-green transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {s.participant.teamName ?? s.participant.name}
            </Link>
            <span className={`text-masters-ink-4 dark:text-masters-d-ink-4 transition-transform inline-block ${expanded ? 'rotate-180' : ''}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
        </td>

        {/* Cuts */}
        <td className={`py-4 pr-4 sm:pr-6 text-center font-medium tabular-nums text-sm ${cutsColor}`}>
          {alive}/{total}
        </td>

        {/* Ownership */}
        <td className="py-4 pr-4 sm:pr-6 text-right font-medium tabular-nums text-sm text-masters-ink-2 dark:text-masters-d-ink-2">
          {ownershipDisplay}
        </td>

        {/* Score */}
        <td className="py-4 pr-4 sm:pr-6 text-right font-medium tabular-nums text-sm">
          {status.state === 'pre' ? (
            <span className="text-masters-ink-4 dark:text-masters-d-ink-4">—</span>
          ) : (
            <span className={
              s.totalScoreToPar < 0 ? 'text-masters-red dark:text-masters-d-red' :
              s.totalScoreToPar > 0 ? 'text-masters-ink-3 dark:text-masters-d-ink-3' :
              'text-masters-ink dark:text-masters-d-ink'
            }>
              {s.totalScoreDisplay}
            </span>
          )}
        </td>

        {/* EV Purse — gold, no blue */}
        <td className="py-4 pr-4 sm:pr-6 text-right font-medium tabular-nums text-sm">
          {s.oddsEV > 0 ? (
            <span className="text-masters-gold dark:text-masters-d-gold">{s.oddsEVDisplay}</span>
          ) : (
            <span className="text-masters-ink-4 dark:text-masters-d-ink-4">—</span>
          )}
        </td>

        {/* Live Purse */}
        <td className="py-4 pr-4 sm:pr-6 text-right font-medium tabular-nums text-sm">
          {s.totalEarnings > 0 ? (
            <span className="text-masters-green dark:text-masters-d-green">{s.totalEarningsDisplay}</span>
          ) : (
            <span className="text-masters-ink-4 dark:text-masters-d-ink-4">$0</span>
          )}
        </td>

        {/* Payout */}
        <td className="py-4 text-right font-medium tabular-nums text-sm">
          {isLeading ? (
            <span className="text-masters-gold dark:text-masters-d-gold font-bold">${projectedPayout.toLocaleString()}</span>
          ) : (
            <span className="text-masters-ink-4 dark:text-masters-d-ink-4">—</span>
          )}
        </td>
      </tr>

      {/* Expanded picks */}
      {expanded && (
        <tr className="border-b border-masters-border dark:border-masters-d-border bg-masters-hover/60 dark:bg-masters-d-hover/60">
          <td colSpan={colSpan} className="px-3 sm:px-6 py-3 sm:py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-3 gap-y-3 sm:gap-x-4 sm:gap-y-4">
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
                  <div key={tier.id} className={isCut ? 'opacity-40' : ''}>
                    <p className="text-masters-ink-3 dark:text-masters-d-ink-3 font-semibold uppercase tracking-wider text-[10px] mb-2">
                      {tier.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://a.espncdn.com/i/headshots/golf/players/full/${player.espnId}.png`}
                        alt={name} width={32} height={32}
                        loading="lazy"
                        className="rounded-full object-cover bg-masters-hover dark:bg-masters-d-hover shrink-0 ring-1 ring-masters-border dark:ring-masters-d-border"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`font-semibold text-xs leading-tight ${isCut ? 'line-through text-masters-ink-3 dark:text-masters-d-ink-3' : 'text-masters-ink dark:text-masters-d-ink'}`}>
                            {emoji && <span className="mr-1">{emoji}</span>}{name}
                          </p>
                          <span className="text-[10px] text-masters-ink-4 dark:text-masters-d-ink-4 whitespace-nowrap">
                            <span className="uppercase tracking-wider text-masters-ink-3 dark:text-masters-d-ink-3">OWN</span> {pct}%
                          </span>
                        </div>
                        <p className="text-xs mt-0.5">
                          <span className={score?.startsWith('-') ? 'text-masters-red dark:text-masters-d-red font-medium' : 'text-masters-ink-2 dark:text-masters-d-ink-2'}>
                            {status.state === 'pre' ? <span className="text-masters-ink-4 dark:text-masters-d-ink-4">—</span> : (score ?? 'E')}
                          </span>
                          {' · '}
                          <span className="text-masters-ink-3 dark:text-masters-d-ink-3">
                            {status.state === 'pre' ? <span className="text-masters-ink-4 dark:text-masters-d-ink-4">—</span> : pos}
                          </span>
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-[11px]">
                          <span className={(liveData?.projectedEarnings ?? 0) > 0 ? 'text-masters-green dark:text-masters-d-green font-medium' : 'text-masters-ink-4 dark:text-masters-d-ink-4'}>
                            {(liveData?.projectedEarnings ?? 0) > 0 ? liveData!.projectedEarningsDisplay : '$0'}
                          </span>
                          <span className="text-masters-ink-4 dark:text-masters-d-ink-4">·</span>
                          <span className={(liveData?.oddsEV ?? 0) > 0 ? 'text-masters-gold dark:text-masters-d-gold font-medium' : 'text-masters-ink-4 dark:text-masters-d-ink-4'}>
                            {(liveData?.oddsEV ?? 0) > 0 ? liveData!.oddsEVDisplay : '—'}
                          </span>
                          {liveData?.cutProbability != null && liveData.cutProbability > 0 && (
                            <>
                              <span className="text-masters-ink-4 dark:text-masters-d-ink-4">·</span>
                              <span className={
                                liveData.cutProbability >= 0.75 ? 'text-masters-green dark:text-masters-d-green font-medium' :
                                liveData.cutProbability >= 0.50 ? 'text-masters-gold dark:text-masters-d-gold font-medium' :
                                'text-masters-red dark:text-masters-d-red font-medium'
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
