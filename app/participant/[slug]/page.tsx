export const revalidate = 60;

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchESPNLeaderboard } from '@/lib/espn';
import { computeStandings } from '@/lib/scoring';
import { fetchOddsEV } from '@/lib/odds';
import tiersData from '@/data/tiers.json';
import playersData from '@/data/players.json';
import picksData from '@/data/picks.json';
import purseData from '@/data/purse.json';
import TournamentStatus from '@/components/TournamentStatus';
import ParticipantDetail from '@/components/ParticipantDetail';
import LastUpdated from '@/components/LastUpdated';
import type { Tier, Player, Participant, PurseEntry } from '@/lib/types';

export async function generateStaticParams() {
  return picksData.participants.map((p) => ({ slug: p.slug }));
}

export default async function ParticipantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const participant = picksData.participants.find((p) => p.slug === slug);
  if (!participant) notFound();

  const [espn, oddsEV] = await Promise.all([
    fetchESPNLeaderboard(),
    fetchOddsEV(playersData.players, purseData.payouts as PurseEntry[]),
  ]);

  const standings = computeStandings(
    picksData.participants as Participant[],
    playersData.players as Player[],
    tiersData.tiers as Tier[],
    espn.competitors,
    purseData.payouts as PurseEntry[],
    espn.status,
    oddsEV
  );

  const myScore = standings.find((s) => s.participant.slug === slug);
  if (!myScore) notFound();

  // Build ownership count: playerId → how many participants picked them
  const ownershipCount = new Map<string, number>();
  for (const s of standings) {
    for (const pick of s.picks) {
      const id = pick.player.id;
      ownershipCount.set(id, (ownershipCount.get(id) ?? 0) + 1);
    }
  }

  const totalParticipants = standings.length;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="text-sm text-gray-400 hover:text-gray-600 mb-6 inline-flex items-center gap-1"
        >
          ← Leaderboard
        </Link>

        {/* Header */}
        <div className="mb-6 mt-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {myScore.participant.teamName ?? myScore.participant.name}
              </h1>
              {myScore.participant.teamName && (
                <p className="text-sm text-gray-400 mt-0.5">{myScore.participant.name}</p>
              )}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <TournamentStatus status={espn.status} />
                <LastUpdated lastFetched={espn.lastFetched} />
              </div>
            </div>
            <div className="text-right space-y-1">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Live Purse</p>
                <p className="text-2xl font-bold text-green-700 tabular-nums">
                  {myScore.totalEarnings > 0 ? myScore.totalEarningsDisplay : '$0'}
                </p>
              </div>
              {myScore.oddsEV > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">EV Purse</p>
                  <p className="text-lg font-semibold text-blue-600 tabular-nums">
                    {myScore.oddsEVDisplay}
                  </p>
                </div>
              )}
              <p className="text-sm text-gray-500">
                <span className="font-medium">{myScore.rankDisplay}</span> of {totalParticipants}
              </p>
              {espn.status.state !== 'pre' && (
                <p className={`text-sm font-medium ${myScore.totalScoreToPar < 0 ? 'text-red-600' : myScore.totalScoreToPar > 0 ? 'text-gray-400' : 'text-gray-600'}`}>
                  {myScore.totalScoreDisplay} combined
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Picks */}
        <ParticipantDetail
          score={myScore}
          ownershipCount={ownershipCount}
          totalParticipants={totalParticipants}
          tournamentState={espn.status.state}
        />
      </div>
    </main>
  );
}
