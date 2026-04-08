export const revalidate = 60;

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchESPNLeaderboard } from '@/lib/espn';
import { computeStandings } from '@/lib/scoring';
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

  const espn = await fetchESPNLeaderboard();

  const standings = computeStandings(
    picksData.participants as Participant[],
    playersData.players as Player[],
    tiersData.tiers as Tier[],
    espn.competitors,
    purseData.payouts as PurseEntry[],
    espn.status
  );

  const myScore = standings.find((s) => s.participant.slug === slug);
  if (!myScore) notFound();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="text-sm text-gray-400 hover:text-gray-600 mb-6 inline-flex items-center gap-1"
        >
          ← Leaderboard
        </Link>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {myScore.participant.name}
              </h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <TournamentStatus status={espn.status} />
                <LastUpdated lastFetched={espn.lastFetched} />
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-green-700 tabular-nums">
                {myScore.totalEarnings > 0 ? myScore.totalEarningsDisplay : '$0'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {myScore.rankDisplay} of {standings.length}
              </p>
            </div>
          </div>
        </div>

        {/* Picks */}
        <ParticipantDetail score={myScore} />
      </div>
    </main>
  );
}
