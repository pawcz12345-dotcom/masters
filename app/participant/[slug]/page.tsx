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
import ThemeToggle from '@/components/ThemeToggle';
import { MastersLogoMark } from '@/components/MastersLogo';
import { computeTierRankings } from '@/lib/utils';
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

  const ownershipCount = new Map<string, number>();
  for (const s of standings)
    for (const pick of s.picks)
      ownershipCount.set(pick.player.id, (ownershipCount.get(pick.player.id) ?? 0) + 1);

  const totalParticipants = standings.length;
  const tierRankings = computeTierRankings(standings);

  return (
    <main className="min-h-screen bg-masters-bg dark:bg-masters-d-bg">
      {/* Accent bar */}
      <div className="h-0.5 bg-gradient-to-r from-masters-green via-masters-yellow to-masters-green dark:from-masters-d-green dark:via-masters-d-gold dark:to-masters-d-green" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Nav */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="text-sm text-masters-ink-3 dark:text-masters-d-ink-3 hover:text-masters-green dark:hover:text-masters-d-green inline-flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Leaderboard
          </Link>
          <ThemeToggle />
        </div>

        {/* Header card */}
        <div className="mb-6 bg-masters-card dark:bg-masters-d-card rounded-xl border border-masters-border dark:border-masters-d-border p-5 sm:p-6 shadow-sm">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <MastersLogoMark size={44} />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-masters-ink dark:text-masters-d-ink tracking-tight">
                  {myScore.participant.teamName ?? myScore.participant.name}
                </h1>
                {myScore.participant.teamName && (
                  <p className="text-sm text-masters-ink-3 dark:text-masters-d-ink-3 mt-0.5">{myScore.participant.name}</p>
                )}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {espn.status.state !== 'pre' && <TournamentStatus status={espn.status} />}
                  <LastUpdated lastFetched={espn.lastFetched} />
                </div>
              </div>
            </div>
            <div className="text-right space-y-2">
              <div>
                <p className="text-[10px] text-masters-ink-3 dark:text-masters-d-ink-3 uppercase tracking-wider mb-0.5">Live Purse</p>
                <p className="text-2xl font-bold text-masters-green dark:text-masters-d-green tabular-nums">
                  {myScore.totalEarnings > 0 ? myScore.totalEarningsDisplay : '$0'}
                </p>
              </div>
              {myScore.oddsEV > 0 && (
                <div>
                  <p className="text-[10px] text-masters-ink-3 dark:text-masters-d-ink-3 uppercase tracking-wider mb-0.5">EV Purse</p>
                  <p className="text-lg font-semibold text-masters-gold dark:text-masters-d-gold tabular-nums">
                    {myScore.oddsEVDisplay}
                  </p>
                </div>
              )}
              <p className="text-sm text-masters-ink-2 dark:text-masters-d-ink-2">
                <span className="font-bold text-masters-ink dark:text-masters-d-ink">{myScore.rankDisplay}</span>
                <span className="text-masters-ink-3 dark:text-masters-d-ink-3"> / {totalParticipants}</span>
              </p>
              {espn.status.state !== 'pre' && (
                <p className={`text-sm font-medium ${
                  myScore.totalScoreToPar < 0 ? 'text-masters-red dark:text-masters-d-red' :
                  myScore.totalScoreToPar > 0 ? 'text-masters-ink-3 dark:text-masters-d-ink-3' :
                  'text-masters-ink dark:text-masters-d-ink'
                }`}>
                  {myScore.totalScoreDisplay} combined
                </p>
              )}
            </div>
          </div>
        </div>

        <ParticipantDetail
          score={myScore}
          ownershipCount={ownershipCount}
          totalParticipants={totalParticipants}
          tournamentState={espn.status.state}
          tierRankings={tierRankings}
        />
      </div>
    </main>
  );
}
