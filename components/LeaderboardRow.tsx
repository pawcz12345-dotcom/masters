'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ParticipantScore, ESPNTournamentStatus } from '@/lib/types';

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
}: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
          index === 0 && s.totalEarnings > 0 ? 'bg-yellow-50' : ''
        }`}
      >
        {/* Rank */}
        <td className="py-4 pr-6">
          <span className={`font-semibold ${isTop3 ? 'text-yellow-600' : 'text-gray-600'}`}>
            {s.rankDisplay}
          </span>
        </td>

        {/* Participant */}
        <td className="py-4 pr-6">
          <div className="flex items-center gap-2">
            <Link
              href={`/participant/${s.participant.slug}`}
              className="font-medium text-gray-900 hover:text-green-700 hover:underline"
            >
              {s.participant.teamName ?? s.participant.name}
            </Link>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              aria-label={expanded ? 'Collapse picks' : 'Expand picks'}
            >
              <svg
                className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </td>

        {/* Cuts */}
        <td className={`py-4 pr-6 text-center font-medium tabular-nums ${cutsColor}`}>
          {alive}/{total}
        </td>

        {/* Ownership */}
        <td className="py-4 pr-6 text-right font-medium tabular-nums text-gray-600">
          {ownershipDisplay}
        </td>

        {/* Score */}
        <td className="py-4 pr-6 text-right font-medium tabular-nums">
          {status.state === 'pre' ? (
            <span className="text-gray-300">—</span>
          ) : (
            <span className={s.totalScoreToPar < 0 ? 'text-red-600' : s.totalScoreToPar > 0 ? 'text-gray-500' : 'text-gray-700'}>
              {s.totalScoreDisplay}
            </span>
          )}
        </td>

        {/* EV Purse */}
        <td className="py-4 pr-6 text-right font-medium tabular-nums">
          {s.oddsEV > 0 ? (
            <span className="text-blue-600">{s.oddsEVDisplay}</span>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </td>

        {/* Live Purse */}
        <td className="py-4 pr-6 text-right font-medium tabular-nums">
          {s.totalEarnings > 0 ? (
            <span className="text-green-700">{s.totalEarningsDisplay}</span>
          ) : (
            <span className="text-gray-400">$0</span>
          )}
        </td>

        {/* Projected Payout */}
        <td className="py-4 text-right font-medium tabular-nums">
          {isLeading ? (
            <span className="text-yellow-600">${projectedPayout.toLocaleString()}</span>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </td>
      </tr>

      {/* Expanded picks */}
      {expanded && (
        <tr className="bg-gray-50 border-b border-gray-100">
          <td colSpan={colSpan} className="px-6 py-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-6 gap-y-2">
              {s.picks.map(({ tier, player, liveData }) => {
                const isCut = liveData?.isCut ?? false;
                const score = liveData?.scoreDisplay;
                const pos = isCut ? 'CUT' : (liveData?.position ?? '—');
                const name = liveData?.displayName ?? player.displayName;
                const pickCount = ownershipCount.get(player.id) ?? 0;
                const pct = ((pickCount / totalParticipants) * 100).toFixed(0);

                return (
                  <div key={tier.id} className={`text-xs ${isCut ? 'opacity-40' : ''}`}>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <p className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">
                        {tier.name}
                      </p>
                      <p className="text-gray-400 text-[10px]">{pct}%</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://a.espncdn.com/i/headshots/golf/players/full/${player.espnId}.png`}
                        alt={name}
                        width={32}
                        height={32}
                        className="rounded-full object-cover bg-gray-100 shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div>
                        <p className={`font-semibold text-gray-800 truncate ${isCut ? 'line-through' : ''}`}>
                          {name}
                        </p>
                        <p className="text-gray-500">
                          {status.state === 'pre' ? (
                            <span className="text-gray-300">Pre-Tournament</span>
                          ) : (
                            <>
                              <span className={score?.startsWith('-') ? 'text-red-500 font-medium' : ''}>
                                {score ?? 'E'}
                              </span>
                              {' · '}
                              <span>{pos}</span>
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
