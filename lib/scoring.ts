import type {
  Participant,
  Player,
  Tier,
  PurseEntry,
  ESPNCompetitor,
  ESPNTournamentStatus,
  PlayerLiveData,
  ParticipantScore,
} from './types';
import type { OddsResult } from './odds';
import { formatCurrency } from './utils';

function computeProjectedEarnings(
  competitors: ESPNCompetitor[],
  pursePayouts: PurseEntry[],
  status: ESPNTournamentStatus
): Map<string, number> {
  const projected = new Map<string, number>();

  // Show $0 until the tournament is actually underway
  if (status.state === 'pre') {
    return projected;
  }

  if (status.state === 'post' && status.period >= 4) {
    // Tournament complete — use real earnings
    for (const c of competitors) {
      projected.set(c.athlete.id, c.earnings ?? 0);
    }
    return projected;
  }

  // Pre or in-progress — project based on current sortOrder position
  // Group competitors by sortOrder (ties share same sortOrder)
  const byPosition = new Map<number, ESPNCompetitor[]>();
  for (const c of competitors) {
    const pos = c.sortOrder ?? 999;
    if (!byPosition.has(pos)) byPosition.set(pos, []);
    byPosition.get(pos)!.push(c);
  }

  const purseMap = new Map<number, number>(
    pursePayouts.map((p) => [p.position, p.amount])
  );

  // For each position group, average the payouts across tied positions
  for (const [pos, group] of byPosition.entries()) {
    const count = group.length;
    let totalPayout = 0;
    for (let i = 0; i < count; i++) {
      totalPayout += purseMap.get(pos + i) ?? 0;
    }
    const splitAmount = totalPayout / count;
    for (const c of group) {
      projected.set(c.athlete.id, splitAmount);
    }
  }

  return projected;
}

export function computeStandings(
  participants: Participant[],
  players: Player[],
  tiers: Tier[],
  competitors: ESPNCompetitor[],
  pursePayouts: PurseEntry[],
  status: ESPNTournamentStatus,
  oddsResult: OddsResult | null = null
): ParticipantScore[] {
  // Build lookup maps
  const playerMap = new Map<string, Player>(players.map((p) => [p.id, p]));
  const tierMap = new Map<string, Tier>(tiers.map((t) => [t.id, t]));
  const espnMap = new Map<string, ESPNCompetitor>(
    competitors.map((c) => [c.athlete.id, c])
  );

  const projectedEarnings = computeProjectedEarnings(
    competitors,
    pursePayouts,
    status
  );

  const isTournamentComplete = status.state === 'post' && status.period >= 4;

  // Build participant scores
  const scores: ParticipantScore[] = participants.map((participant) => {
    // Sort picks by tier order
    const sortedPicks = [...participant.picks].sort((a, b) => {
      const ta = tierMap.get(a.tierId)?.order ?? 99;
      const tb = tierMap.get(b.tierId)?.order ?? 99;
      return ta - tb;
    });

    let totalEarnings = 0;
    let totalOddsEV = 0;

    const pickResults = sortedPicks.map((pick) => {
      const player = playerMap.get(pick.playerId) ?? null;
      const tier = tierMap.get(pick.tierId) ?? {
        id: pick.tierId,
        name: pick.tierId,
        order: 99,
      };

      if (!player) {
        return { tier, player: { id: pick.playerId, espnId: '0', displayName: 'Unknown', tierId: pick.tierId }, liveData: null };
      }

      const competitor = espnMap.get(player.espnId) ?? null;
      let liveData: PlayerLiveData | null = null;

      if (competitor) {
        const earnings = competitor.earnings ?? 0;
        // Position-based projected (used for ranking + payout)
        const projected = isTournamentComplete
          ? earnings
          : (projectedEarnings.get(player.espnId) ?? 0);
        const isCut =
          competitor.status?.type?.state === 'post' &&
          status.period > 2 &&
          earnings === 0;

        const playerEV = isTournamentComplete
          ? earnings
          : (oddsResult?.ev.get(player.espnId) ?? projected);

        liveData = {
          espnId: player.espnId,
          displayName: competitor.athlete.displayName,
          earnings,
          projectedEarnings: projected,
          earningsDisplay: earnings > 0 ? formatCurrency(earnings) : '$0',
          projectedEarningsDisplay: projected > 0 ? formatCurrency(projected) : '$0',
          scoreDisplay: competitor.score?.displayValue ?? 'E',
          position: isCut ? 'CUT' : (competitor.status?.position?.displayName ?? '-'),
          thru: competitor.status?.thru ?? 0,
          state: competitor.status?.type?.state ?? 'pre',
          isCut,
          statistics: competitor.statistics ?? [],
          oddsEV: playerEV,
          oddsEVDisplay: playerEV > 0 ? formatCurrency(playerEV) : '$0',
          cutProbability: oddsResult?.cutProb.get(player.espnId) ?? 0,
        };

        totalEarnings += projected;
        totalOddsEV += playerEV;
      }

      return { tier, player, liveData };
    });

    // Sum score-to-par across all picks
    let totalScoreToPar = 0;
    for (const { liveData } of pickResults) {
      if (liveData && !liveData.isCut && liveData.state !== 'pre') {
        const raw = liveData.scoreDisplay;
        if (raw === 'E') {
          // even par, add 0
        } else {
          const n = parseFloat(raw);
          if (!isNaN(n)) totalScoreToPar += n;
        }
      }
    }

    const totalScoreDisplay =
      totalScoreToPar === 0 ? 'E'
      : totalScoreToPar > 0 ? `+${totalScoreToPar}`
      : `${totalScoreToPar}`;

    return {
      participant,
      totalEarnings,
      totalEarningsDisplay: formatCurrency(totalEarnings),
      oddsEV: totalOddsEV,
      oddsEVDisplay: formatCurrency(totalOddsEV),
      totalScoreToPar,
      totalScoreDisplay,
      picks: pickResults,
      rank: 0,
      rankDisplay: '',
    };
  });

  // Sort descending by totalEarnings
  scores.sort((a, b) => b.totalEarnings - a.totalEarnings);

  // Assign ranks with tie notation
  let currentRank = 1;
  for (let i = 0; i < scores.length; i++) {
    if (i > 0 && scores[i].totalEarnings === scores[i - 1].totalEarnings) {
      scores[i].rank = scores[i - 1].rank;
    } else {
      scores[i].rank = currentRank;
    }
    currentRank++;

    const tied =
      scores.filter((s) => s.totalEarnings === scores[i].totalEarnings).length > 1;
    scores[i].rankDisplay = tied ? `T${scores[i].rank}` : `${scores[i].rank}`;
  }

  return scores;
}
