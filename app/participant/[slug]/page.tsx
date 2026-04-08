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
  for (const s of standings) {
    for (const pick of s.picks) {
      const id = pick.player.id;
      ownershipCount.set(id, (ownershipCount.get(id) ?? 0) + 1);
    }
  }

  const totalParticipants = standings.length;
  const tierRankings = computeTierRankings(standings);

  return (
    <main className="min-h-screen bg-slate-950">
      {/* Accent bar */}
      <div className="h-0.5 bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-700" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back link */}
        <Link
          href="/"
          className="text-sm text-slate-500 hover:text-slate-300 mb-6 inline-flex items-center gap-1 transition-colors"
        >
          ← Leaderboard
        </Link>

        {/* Header */}
        <div className="mb-6 mt-4 bg-slate-900 rounded-xl border border-slate-700/50 p-5 sm:p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {myScore.participant.teamName ?? myScore.participant.name}
              </h1>
              {myScore.participant.teamName && (
                <p className="text-sm text-slate-500 mt-0.5">{myScore.participant.name}</p>
              )}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {espn.status.state !== 'pre' && <TournamentStatus status={espn.status} />}
                <LastUpdated lastFetched={espn.lastFetched} />
              </div>
            </div>
            <div className="text-right space-y-2">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Live Purse</p>
                <p className="text-2xl font-bold text-emerald-400 tabular-nums">
                  {myScore.totalEarnings > 0 ? myScore.totalEarningsDisplay : '$0'}
                </p>
              </div>
              {myScore.oddsEV > 0 && (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">EV Purse</p>
                  <p className="text-lg font-semibold text-sky-400 tabular-nums">
                    {myScore.oddsEVDisplay}
                  </p>
                </div>
              )}
              <p className="text-sm text-slate-400">
                <span className="font-semibold text-slate-200">{myScore.rankDisplay}</span>
                <span className="text-slate-600"> / {totalParticipants}</span>
              </p>
              {espn.status.state !== 'pre' && (
                <p className={`text-sm font-medium ${myScore.totalScoreToPar < 0 ? 'text-red-400' : myScore.totalScoreToPar > 0 ? 'text-slate-500' : 'text-slate-300'}`}>
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
          tierRankings={tierRankings}
        />
      </div>
    </main>
  );
}
