import type { ParticipantScore } from '@/lib/types';

export default function ParticipantDetail({ score }: { score: ParticipantScore }) {
  return (
    <div className="space-y-3">
      {score.picks.map(({ tier, player, liveData }) => (
        <div
          key={tier.id}
          className={`rounded-lg border p-4 ${
            liveData?.isCut
              ? 'border-red-100 bg-red-50'
              : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                {tier.name}
              </p>
              <p className={`font-semibold text-gray-900 ${liveData?.isCut ? 'line-through text-gray-400' : ''}`}>
                {liveData?.displayName ?? player.displayName}
              </p>
            </div>

            <div className="text-right">
              {liveData ? (
                <>
                  {liveData.isCut ? (
                    <span className="text-sm font-medium text-red-500">CUT</span>
                  ) : (
                    <>
                      <p className="font-semibold text-gray-900 tabular-nums">
                        {liveData.scoreDisplay === 'E' ? 'E' : liveData.scoreDisplay}
                      </p>
                      <p className="text-xs text-gray-400">
                        {liveData.state === 'in' && liveData.thru > 0
                          ? `Thru ${liveData.thru}`
                          : liveData.position !== '-'
                          ? liveData.position
                          : ''}
                      </p>
                    </>
                  )}
                  <p className="text-xs text-green-700 font-medium mt-1 tabular-nums">
                    {liveData.projectedEarnings > 0
                      ? liveData.projectedEarningsDisplay
                      : '$0'}
                  </p>
                </>
              ) : (
                <span className="text-sm text-gray-300">No data</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
