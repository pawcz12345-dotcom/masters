import Link from 'next/link';
import type { ParticipantScore } from '@/lib/types';

export default function Leaderboard({ standings }: { standings: ParticipantScore[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase tracking-wide">
            <th className="pb-3 pr-4 w-12">Rank</th>
            <th className="pb-3 pr-4">Participant</th>
            <th className="pb-3 text-right">Projected Earnings</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => {
            const isTop3 = s.rank <= 3 && s.totalEarnings > 0;
            return (
              <tr
                key={s.participant.id}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  i === 0 && s.totalEarnings > 0 ? 'bg-yellow-50' : ''
                }`}
              >
                <td className="py-4 pr-4">
                  <span
                    className={`font-semibold ${
                      isTop3 ? 'text-yellow-600' : 'text-gray-600'
                    }`}
                  >
                    {s.rankDisplay}
                  </span>
                </td>
                <td className="py-4 pr-4">
                  <Link
                    href={`/participant/${s.participant.slug}`}
                    className="font-medium text-gray-900 hover:text-green-700 hover:underline"
                  >
                    {s.participant.name}
                  </Link>
                  {s.participant.teamName && (
                    <p className="text-xs text-gray-400 mt-0.5">{s.participant.teamName}</p>
                  )}
                </td>
                <td className="py-4 text-right font-medium tabular-nums">
                  {s.totalEarnings > 0 ? (
                    <span className="text-green-700">{s.totalEarningsDisplay}</span>
                  ) : (
                    <span className="text-gray-400">$0</span>
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
