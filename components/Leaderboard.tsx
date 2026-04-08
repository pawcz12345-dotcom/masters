import Link from 'next/link';
import type { ParticipantScore } from '@/lib/types';

const POOL_BUY_IN = 10;

export default function Leaderboard({ standings }: { standings: ParticipantScore[] }) {
  const totalPot = standings.length * POOL_BUY_IN;
  const tied1stCount = standings.filter((s) => s.rank === 1 && s.totalEarnings > 0).length;
  const projectedPayout = tied1stCount > 0 ? totalPot / tied1stCount : totalPot;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase tracking-wide">
            <th className="pb-3 pr-4 w-12">Rank</th>
            <th className="pb-3 pr-4">Participant</th>
            <th className="pb-3 pr-4 text-right">Projected Purse</th>
            <th className="pb-3 text-right">Projected Payout</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => {
            const isTop3 = s.rank <= 3 && s.totalEarnings > 0;
            const isLeading = s.rank === 1 && s.totalEarnings > 0;
            return (
              <tr
                key={s.participant.id}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  i === 0 && s.totalEarnings > 0 ? 'bg-yellow-50' : ''
                }`}
              >
                <td className="py-4 pr-4">
                  <span className={`font-semibold ${isTop3 ? 'text-yellow-600' : 'text-gray-600'}`}>
                    {s.rankDisplay}
                  </span>
                </td>
                <td className="py-4 pr-4">
                  <Link
                    href={`/participant/${s.participant.slug}`}
                    className="font-medium text-gray-900 hover:text-green-700 hover:underline"
                  >
                    {s.participant.teamName ?? s.participant.name}
                  </Link>
                </td>
                <td className="py-4 pr-4 text-right font-medium tabular-nums">
                  {s.totalEarnings > 0 ? (
                    <span className="text-green-700">{s.totalEarningsDisplay}</span>
                  ) : (
                    <span className="text-gray-400">$0</span>
                  )}
                </td>
                <td className="py-4 text-right font-medium tabular-nums">
                  {isLeading ? (
                    <span className="text-yellow-600">${projectedPayout.toLocaleString()}</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
