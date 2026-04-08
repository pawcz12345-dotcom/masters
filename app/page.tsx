export const revalidate = 60;

import { fetchESPNLeaderboard } from '@/lib/espn';
import { computeStandings } from '@/lib/scoring';
import { fetchOddsEV } from '@/lib/odds';
import tiersData from '@/data/tiers.json';
import playersData from '@/data/players.json';
import picksData from '@/data/picks.json';
import purseData from '@/data/purse.json';
import r0Raw from '@/data/snapshots/r0.json';
import r1Raw from '@/data/snapshots/r1.json';
import r2Raw from '@/data/snapshots/r2.json';
import r3Raw from '@/data/snapshots/r3.json';
import r4Raw from '@/data/snapshots/r4.json';
import TabView from '@/components/TabView';
import TournamentStatus from '@/components/TournamentStatus';
import LastUpdated from '@/components/LastUpdated';
import type { Tier, Player, Participant, PurseEntry, RoundSnapshot, RoundData } from '@/lib/types';

const ROUND_LABELS: Record<number, string> = {
  0: 'Pre',
  1: 'R1',
  2: 'R2',
  3: 'R3',
  4: 'R4',
};

export default async function Home() {
  const [espn, oddsEV] = await Promise.all([
    fetchESPNLeaderboard(),
    fetchOddsEV(playersData.players, purseData.payouts as PurseEntry[]),
  ]);

  const participants = picksData.participants as Participant[];
  const players = playersData.players as Player[];
  const tiers = tiersData.tiers as Tier[];
  const purse = purseData.payouts as PurseEntry[];

  // Live standings
  const liveStandings = computeStandings(
    participants, players, tiers, espn.competitors, purse, espn.status, oddsEV
  );

  // Serialize odds maps for client components
  const evRecord: Record<string, number> = {};
  const cutProbRecord: Record<string, number> = {};
  if (oddsEV) {
    for (const [k, v] of oddsEV.ev) evRecord[k] = v;
    for (const [k, v] of oddsEV.cutProb) cutProbRecord[k] = v;
  }

  // Build round data from snapshots
  const rawSnapshots: { raw: unknown; round: number }[] = [
    { raw: r0Raw, round: 0 },
    { raw: r1Raw, round: 1 },
    { raw: r2Raw, round: 2 },
    { raw: r3Raw, round: 3 },
    { raw: r4Raw, round: 4 },
  ];

  const snapshotRounds: RoundData[] = rawSnapshots.flatMap(({ raw, round }) => {
    const snap = raw as RoundSnapshot;
    if (!snap.saved || !snap.status || !snap.competitors) return [];
    const snapStandings = computeStandings(
      participants, players, tiers, snap.competitors, purse, snap.status, null
    );
    const entry: RoundData = {
      round,
      label: ROUND_LABELS[round] ?? `R${round}`,
      savedAt: snap.savedAt,
      status: snap.status,
      standings: snapStandings,
      competitors: snap.competitors,
      evRecord,
      cutProbRecord,
    };
    return [entry];
  });

  // Live round entry
  const liveRound: RoundData = {
    round: 99,
    label: 'Live',
    status: espn.status,
    standings: liveStandings,
    competitors: espn.competitors,
    evRecord,
    cutProbRecord,
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Masters 2026 Pool
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            {espn.status.state !== 'pre' && <TournamentStatus status={espn.status} />}
            <LastUpdated lastFetched={espn.lastFetched} />
          </div>
        </div>

        <TabView
          liveRound={liveRound}
          snapshotRounds={snapshotRounds}
          currentStatus={espn.status}
          players={players}
          tiers={tiers}
        />

        <p className="text-center text-xs text-gray-300 mt-6">
          Scores update every 60 seconds during play
        </p>
      </div>
    </main>
  );
}
