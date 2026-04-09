export const revalidate = 60;

import { Suspense } from 'react';
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
import AutoRefresh from '@/components/AutoRefresh';
import ThemeToggle from '@/components/ThemeToggle';
import { MastersLogoMark } from '@/components/MastersLogo';
import type { Tier, Player, Participant, PurseEntry, RoundSnapshot, RoundData } from '@/lib/types';

const ROUND_LABELS: Record<number, string> = {
  0: 'Pre', 1: 'R1', 2: 'R2', 3: 'R3', 4: 'R4',
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

  const liveStandings = computeStandings(
    participants, players, tiers, espn.competitors, purse, espn.status, oddsEV
  );

  const evRecord: Record<string, number> = {};
  const cutProbRecord: Record<string, number> = {};
  if (oddsEV) {
    for (const [k, v] of oddsEV.ev) evRecord[k] = v;
    for (const [k, v] of oddsEV.cutProb) cutProbRecord[k] = v;
  }

  const rawSnapshots: { raw: unknown; round: number }[] = [
    { raw: r0Raw, round: 0 }, { raw: r1Raw, round: 1 }, { raw: r2Raw, round: 2 },
    { raw: r3Raw, round: 3 }, { raw: r4Raw, round: 4 },
  ];

  const snapshotRounds: RoundData[] = rawSnapshots.flatMap(({ raw, round }) => {
    const snap = raw as RoundSnapshot;
    if (!snap.saved || !snap.status || !snap.competitors) return [];
    const snapStandings = computeStandings(
      participants, players, tiers, snap.competitors, purse, snap.status, null
    );
    return [{
      round, label: ROUND_LABELS[round] ?? `R${round}`,
      savedAt: snap.savedAt, status: snap.status,
      standings: snapStandings, competitors: snap.competitors,
      evRecord, cutProbRecord,
    }];
  });

  const liveRound: RoundData = {
    round: 99, label: 'Live', status: espn.status,
    standings: liveStandings, competitors: espn.competitors,
    evRecord, cutProbRecord,
  };

  const isLive = espn.status.state === 'in';

  return (
    <main className="min-h-screen bg-masters-bg dark:bg-masters-d-bg">
      {/* Gold accent bar */}
      <div className="h-0.5 bg-gradient-to-r from-masters-green via-masters-yellow to-masters-green dark:from-masters-d-green dark:via-masters-d-gold dark:to-masters-d-green" />

      <AutoRefresh enabled={isLive} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <MastersLogoMark size={52} />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-masters-ink dark:text-masters-d-ink tracking-tight leading-tight">
                Masters 2026 Pool
              </h1>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {espn.status.state !== 'pre' && <TournamentStatus status={espn.status} />}
                <LastUpdated lastFetched={espn.lastFetched} />
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <Suspense fallback={null}>
          <TabView
            liveRound={liveRound}
            snapshotRounds={snapshotRounds}
            currentStatus={espn.status}
            players={players}
            tiers={tiers}
          />
        </Suspense>

        {isLive && (
          <p className="text-center text-xs text-masters-ink-4 dark:text-masters-d-ink-4 mt-6">
            Scores update every 60 seconds during play
          </p>
        )}
      </div>
    </main>
  );
}
