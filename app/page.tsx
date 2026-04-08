export const revalidate = 60;

import { fetchESPNLeaderboard } from '@/lib/espn';
import { computeStandings } from '@/lib/scoring';
import tiersData from '@/data/tiers.json';
import playersData from '@/data/players.json';
import picksData from '@/data/picks.json';
import purseData from '@/data/purse.json';
import Leaderboard from '@/components/Leaderboard';
import TournamentStatus from '@/components/TournamentStatus';
import LastUpdated from '@/components/LastUpdated';
import type { Tier, Player, Participant, PurseEntry } from '@/lib/types';

export default async function Home() {
  const espn = await fetchESPNLeaderboard();

  const standings = computeStandings(
    picksData.participants as Participant[],
    playersData.players as Player[],
    tiersData.tiers as Tier[],
    espn.competitors,
    purseData.payouts as PurseEntry[],
    espn.status
  );

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Masters 2026 Pool
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <TournamentStatus status={espn.status} />
            <LastUpdated lastFetched={espn.lastFetched} />
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Standings — {standings.length} participants
          </h2>
          <Leaderboard standings={standings} status={espn.status} />
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">
          Scores update every 60 seconds during play
        </p>
      </div>
    </main>
  );
}
