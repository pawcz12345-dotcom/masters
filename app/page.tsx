export const revalidate = 60;

import { fetchESPNLeaderboard } from '@/lib/espn';
import { computeStandings } from '@/lib/scoring';
import { fetchOddsEV } from '@/lib/odds';
import tiersData from '@/data/tiers.json';
import playersData from '@/data/players.json';
import picksData from '@/data/picks.json';
import purseData from '@/data/purse.json';
import TabView from '@/components/TabView';
import TournamentStatus from '@/components/TournamentStatus';
import LastUpdated from '@/components/LastUpdated';
import type { Tier, Player, Participant, PurseEntry } from '@/lib/types';

export default async function Home() {
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

  // Serialize ev + cutProb maps as plain objects for client components
  const evRecord: Record<string, number> = {};
  const cutProbRecord: Record<string, number> = {};
  if (oddsEV) {
    for (const [k, v] of oddsEV.ev) evRecord[k] = v;
    for (const [k, v] of oddsEV.cutProb) cutProbRecord[k] = v;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
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

        <TabView
          standings={standings}
          competitors={espn.competitors}
          players={playersData.players as Player[]}
          tiers={tiersData.tiers as Tier[]}
          status={espn.status}
          evRecord={evRecord}
          cutProbRecord={cutProbRecord}
        />

        <p className="text-center text-xs text-gray-300 mt-6">
          Scores update every 60 seconds during play
        </p>
      </div>
    </main>
  );
}
