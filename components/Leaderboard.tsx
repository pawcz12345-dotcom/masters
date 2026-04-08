import Link from 'next/link';
import type { ParticipantScore, ESPNTournamentStatus } from '@/lib/types';

const POOL_BUY_IN = 10;

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative inline-block group align-middle ml-1">
      <span className="cursor-help text-gray-400 hover:text-gray-600 text-[10px] font-bold border border-gray-400 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center leading-none">
        i
      </span>
      <span
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 rounded px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg"
        style={{
          backgroundColor: '#1f2937',
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: 400,
          textTransform: 'none',
          letterSpacing: 'normal',
          textAlign: 'left',
          lineHeight: '1.4',
        }}
      >
        {text}
      </span>
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
  const totalPot = standings.length * POOL_BUY_IN;
  const tied1stCount = standings.filter((s) => s.rank === 1).length;
  const projectedPayout = totalPot / tied1stCount;
  const totalParticipants = standings.length;

  const cutDay = status.period > 2;
  const tournamentOver = status.state === 'post' && status.period >= 4;

  const cutsLabel = cutDay ? 'Cuts' : 'Projected Cuts';
  const purseLabel = tournamentOver ? 'Purse' : 'Projected Purse';
  const payoutLabel = tournamentOver ? 'Payout' : 'Projected Payout';

  // Build player ownership map: playerId → count of participants who picked them
  const ownershipCount = new Map<string, number>();
  for (const s of standings) {
    for (const pick of s.picks) {
      const id = pick.player.id;
      ownershipCount.set(id, (ownershipCount.get(id) ?? 0) + 1);
    }
  }

  // For each participant, sum ownership % across all their picks
  const ownershipByParticipant = new Map<string, number>();
  for (const s of standings) {
    let total = 0;
    for (const pick of s.picks) {
      const count = ownershipCount.get(pick.player.id) ?? 0;
      total += (count / totalParticipants) * 100;
    }
    ownershipByParticipant.set(s.participant.id, total);
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase tracking-wide">
            <th className="pb-3 pr-4 w-12">Rank</th>
            <th className="pb-3 pr-4">Participant</th>
            <th className="pb-3 pr-4 text-center whitespace-nowrap">
              {cutsLabel}
              <InfoTooltip text="X/10 players projected to make the cut. 10/10 means all your picks are still in the tournament." />
            </th>
            <th className="pb-3 pr-4 text-right">Score</th>
            <th className="pb-3 pr-4 text-right whitespace-nowrap">
              Ownership
              <InfoTooltip text="Sum of each pick's ownership % across all participants. Lower = more contrarian lineup." />
            </th>
            <th className="pb-3 pr-4 text-right">{purseLabel}</th>
            <th className="pb-3 text-right">{payoutLabel}</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => {
            const isTop3 = s.rank <= 3 && s.totalEarnings > 0;
            const isLeading = s.rank === 1;

            const alive = s.picks.filter((p) => !p.liveData?.isCut).length;
            const total = s.picks.length;
            const cutsColor =
              alive === total ? 'text-green-600' : alive === 0 ? 'text-red-500' : 'text-yellow-600';

            const ownership = ownershipByParticipant.get(s.participant.id) ?? 0;
            const ownershipDisplay = `${ownership.toFixed(1)}%`;

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
                <td className={`py-4 pr-4 text-center font-medium tabular-nums ${cutsColor}`}>
                  {alive}/{total}
                </td>
                <td className="py-4 pr-4 text-right font-medium tabular-nums">
                  {status.state === 'pre' ? (
                    <span className="text-gray-300">—</span>
                  ) : (
                    <span className={s.totalScoreToPar < 0 ? 'text-red-600' : s.totalScoreToPar > 0 ? 'text-gray-500' : 'text-gray-700'}>
                      {s.totalScoreDisplay}
                    </span>
                  )}
                </td>
                <td className="py-4 pr-4 text-right font-medium tabular-nums text-gray-600">
                  {ownershipDisplay}
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
