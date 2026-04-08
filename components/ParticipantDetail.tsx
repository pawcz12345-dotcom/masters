import type { ParticipantScore } from '@/lib/types';

interface Props {
  score: ParticipantScore;
  ownershipCount: Map<string, number>;
  totalParticipants: number;
  tournamentState: 'pre' | 'in' | 'post';
}

export default function ParticipantDetail({
  score,
  ownershipCount,
  totalParticipants,
  tournamentState,
}: Props) {
  return (
    <div className="space-y-3">
      {score.picks.map(({ tier, player, liveData }) => {
        const pickCount = ownershipCount.get(player.id) ?? 0;
        const ownershipPct = ((pickCount / totalParticipants) * 100).toFixed(1);
        const isCut = liveData?.isCut ?? false;
        const isPreTournament = tournamentState === 'pre';

        return (
          <div
            key={tier.id}
            className={`rounded-lg border px-5 py-4 ${
              isCut ? 'border-red-100 bg-red-50' : 'border-gray-200 bg-white'
            }`}
          >
            {/* Top row: tier label + ownership */}
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {tier.name}
              </p>
              <p className="text-xs text-gray-400">
                Owned by{' '}
                <span className="font-medium text-gray-600">
                  {pickCount}/{totalParticipants}
                </span>{' '}
                <span className="text-gray-400">({ownershipPct}%)</span>
              </p>
            </div>

            {/* Main row: player name + live stats */}
            <div className="flex items-center justify-between gap-4">
              {/* Left: player name */}
              <p className={`text-base font-semibold ${isCut ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                {liveData?.displayName ?? player.displayName}
                {isCut && (
                  <span className="ml-2 text-xs font-bold text-red-500 no-underline not-italic">CUT</span>
                )}
              </p>

              {/* Right: live stats */}
              {isPreTournament ? (
                <p className="text-sm text-gray-300 tabular-nums shrink-0">Pre-Tournament</p>
              ) : liveData ? (
                <div className="flex items-center gap-5 shrink-0">
                  {/* Position */}
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">Pos</p>
                    <p className="text-sm font-semibold text-gray-800 tabular-nums">
                      {isCut ? '—' : (liveData.position || '—')}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">Score</p>
                    <p className={`text-sm font-semibold tabular-nums ${
                      isCut ? 'text-gray-400' :
                      liveData.scoreDisplay.startsWith('-') ? 'text-red-600' :
                      liveData.scoreDisplay === 'E' ? 'text-gray-700' : 'text-gray-500'
                    }`}>
                      {liveData.scoreDisplay || 'E'}
                    </p>
                  </div>

                  {/* Thru */}
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">Thru</p>
                    <p className="text-sm font-semibold text-gray-800 tabular-nums">
                      {liveData.state === 'in' && liveData.thru > 0
                        ? liveData.thru
                        : liveData.state === 'post'
                        ? 'F'
                        : '—'}
                    </p>
                  </div>

                  {/* Projected earnings */}
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">Earnings</p>
                    <p className={`text-sm font-semibold tabular-nums ${
                      liveData.projectedEarnings > 0 ? 'text-green-700' : 'text-gray-400'
                    }`}>
                      {liveData.projectedEarnings > 0 ? liveData.projectedEarningsDisplay : '$0'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-300 shrink-0">No data</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
