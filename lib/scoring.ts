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

/** Normal CDF using Abramowitz & Stegun approximation (max error < 7.5e-8). */
function normalCDF(z: number): number {
  if (z <= -8) return 0;
  if (z >= 8) return 1;
  const neg = z < 0;
  const az = neg ? -z : z;
  const t = 1 / (1 + 0.2316419 * az);
  const pd = Math.exp(-0.5 * az * az) * 0.3989422820;
  const poly =
    t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const cdf = 1 - pd * poly;
  return neg ? 1 - cdf : cdf;
}

/**
 * Estimate the projected cut line from current field standings.
 * Returns the score-to-par at approximately the 50th position among players who have teed off.
 */
function estimateCutLine(competitors: ESPNCompetitor[]): number {
  const scores: number[] = [];
  for (const c of competitors) {
    const state = c.status?.type?.state ?? 'pre';
    const linescored = (c.linescores ?? []).filter((ls) => ls.value != null && ls.value > 0).length;
    if (state === 'pre' && linescored === 0) continue;
    const stat = c.statistics?.find((s) => s.name === 'scoreToPar')?.displayValue;
    const raw = (stat && stat !== '-') ? stat : (c.score?.displayValue ?? null);
    if (!raw || raw === '-') continue;
    const n = raw === 'E' ? 0 : parseFloat(raw);
    if (!isNaN(n)) scores.push(n);
  }
  if (scores.length === 0) return 5;
  scores.sort((a, b) => a - b);
  return scores[Math.min(49, scores.length - 1)];
}

/**
 * Compute live-adjusted cut probability from current score and holes remaining to the cut.
 * Uses a normal distribution model for remaining scoring variance at Augusta National
 * (round SD ≈ 3.5 strokes → 0.825 strokes/hole).
 *
 * Pre-tournament (state === 'pre'): caller should use odds-based probability instead.
 */
function liveCutProbability(
  scoreDisplay: string,
  completedRounds: number,
  thru: number,
  state: string,
  period: number,
  isCut: boolean,
  cutLine: number
): number {
  if (isCut) return 0;
  if (period > 2) return 1;
  const currentScore = scoreDisplay === 'E' ? 0 : (parseFloat(scoreDisplay) || 0);
  const holesPlayed = completedRounds * 18 + (state === 'in' ? thru : 0);
  const holesRemaining = Math.max(0, 36 - holesPlayed);
  if (holesRemaining === 0) return currentScore <= cutLine ? 1 : 0;
  const sdRemaining = 0.825 * Math.sqrt(holesRemaining);
  return normalCDF((cutLine - currentScore) / sdRemaining);
}

export function computeProjectedEarnings(
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
    // Tournament complete — use real earnings; cut players get flat $25k payment
    const CUT_PAYMENT = 25000;
    for (const c of competitors) {
      const earnings = c.earnings ?? 0;
      const desc = (c.status?.type?.description ?? '').toLowerCase();
      const isCut = earnings === 0 && desc === 'missed cut';
      projected.set(c.athlete.id, isCut ? CUT_PAYMENT : earnings);
    }
    return projected;
  }

  const purseMap = new Map<number, number>(
    pursePayouts.map((p) => [p.position, p.amount])
  );

  // Count rounds with a real stroke-total in linescores (value > 0 = strokes taken).
  // An 'in' player's current round appears in linescores with a partial value — subtract
  // one so only fully-completed rounds count.
  function completedRoundsFor(c: ESPNCompetitor): number {
    const scored = (c.linescores ?? []).filter((ls) => ls.value != null && ls.value > 0).length;
    return (c.status?.type?.state ?? 'pre') === 'in' ? Math.max(0, scored - 1) : scored;
  }

  // Group by score-to-par so players with the same score always share the same
  // purse split regardless of whether ESPN assigns them identical sortOrders.
  // Players who haven't teed off yet (state === 'pre', completedRounds === 0)
  // keep their sortOrder-based position so they don't incorrectly merge into the "E" group.
  function getScoreInt(c: ESPNCompetitor): number | null {
    const state = c.status?.type?.state ?? 'pre';
    // Truly pre-tournament: not scored yet
    if (state === 'pre' && completedRoundsFor(c) === 0) return null;
    const stat = c.statistics?.find((s) => s.name === 'scoreToPar')?.displayValue;
    const raw = (stat && stat !== '-') ? stat : (c.score?.displayValue ?? 'E');
    if (!raw || raw === '-' || raw === 'E') return 0;
    const n = parseFloat(raw);
    return isNaN(n) ? 0 : n;
  }

  // Assign cut players a flat $25k payment and exclude them from the
  // score-based ranking. Without this, a cut player at E after 2 rounds
  // would rank above survivors who ended at +3 after 4 rounds, receiving
  // a position-based payout far higher than the actual cut payment.
  const CUT_PAYMENT = 25000;
  const cutPlayerIds = new Set<string>();
  if (status.period > 2) {
    for (const c of competitors) {
      const earnings = c.earnings ?? 0;
      const desc = (c.status?.type?.description ?? '').toLowerCase();
      if (earnings === 0 && desc === 'missed cut') {
        projected.set(c.athlete.id, CUT_PAYMENT);
        cutPlayerIds.add(c.athlete.id);
      }
    }
  }

  // Separate players into "scored" (teed off) and "not started"
  const scoredPlayers: ESPNCompetitor[] = [];
  const notStarted: ESPNCompetitor[] = [];
  for (const c of competitors) {
    if (cutPlayerIds.has(c.athlete.id)) continue; // already handled above
    if (getScoreInt(c) === null) notStarted.push(c);
    else scoredPlayers.push(c);
  }

  // Group scored players by score-to-par
  const byScore = new Map<number, ESPNCompetitor[]>();
  for (const c of scoredPlayers) {
    const score = getScoreInt(c)!;
    if (!byScore.has(score)) byScore.set(score, []);
    byScore.get(score)!.push(c);
  }

  // Sort groups best-to-worst, assign purse positions sequentially
  const sortedGroups = Array.from(byScore.entries()).sort((a, b) => a[0] - b[0]);
  let position = 1;
  for (const [, group] of sortedGroups) {
    const count = group.length;
    let totalPayout = 0;
    for (let i = 0; i < count; i++) {
      totalPayout += purseMap.get(position + i) ?? 0;
    }
    const splitAmount = totalPayout / count;
    for (const c of group) {
      projected.set(c.athlete.id, splitAmount);
    }
    position += count;
  }

  // Not-started players fall into remaining positions using their sortOrder
  const notStartedSorted = [...notStarted].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
  const byNotStartedPos = new Map<number, ESPNCompetitor[]>();
  for (const c of notStartedSorted) {
    const pos = c.sortOrder ?? 999;
    if (!byNotStartedPos.has(pos)) byNotStartedPos.set(pos, []);
    byNotStartedPos.get(pos)!.push(c);
  }
  for (const [, group] of [...byNotStartedPos.entries()].sort((a, b) => a[0] - b[0])) {
    const count = group.length;
    let totalPayout = 0;
    for (let i = 0; i < count; i++) {
      totalPayout += purseMap.get(position + i) ?? 0;
    }
    const splitAmount = totalPayout / count;
    for (const c of group) {
      projected.set(c.athlete.id, splitAmount);
    }
    position += count;
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
  const estimatedCutLine = status.state !== 'pre' ? estimateCutLine(competitors) : 5;

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

        // --- Completed-rounds detection ---
        // ESPN resets competitor state to 'pre' and thru to 0 between rounds.
        // Use linescores (value > 0 = strokes taken for a round) to determine
        // how many full rounds have been completed.
        const rawState = competitor.status?.type?.state ?? 'pre';
        const linescoredCount = (competitor.linescores ?? [])
          .filter((ls) => ls.value != null && ls.value > 0).length;
        // For an 'in' player the current (incomplete) round is already in linescores
        // with a partial value — subtract one so only complete rounds count.
        const completedRounds = rawState === 'in'
          ? Math.max(0, linescoredCount - 1)
          : linescoredCount;

        // Position-based projected (used for ranking + payout).
        // Always use projectedEarnings — it handles the $25k cut payment for
        // cut players even in the tournament-complete case.
        const projected = projectedEarnings.get(player.espnId) ?? (isTournamentComplete ? earnings : 0);

        // Use ESPN's own status description to detect cut players — it is set
        // to 'Missed Cut' by ESPN and remains stable through R3/R4. Linescore
        // counts are unreliable because the ESPN leaderboard endpoint often
        // omits R3/R4 round values until well after a player finishes, making
        // completedRounds falsely appear as 2 for non-cut players.
        const statusDescription = (competitor.status?.type?.description ?? '').toLowerCase();
        const isCut = status.period > 2 && earnings === 0 && statusDescription === 'missed cut';

        // Use Harville EV from de-vigged live win odds directly — bookmakers
        // reprice outright winner markets in near-real-time during the tournament.
        // Cut players earn the flat cut payment (reflected in `projected`).
        // Without odds (API unavailable) show 0 (→ "—").
        const playerEV = (isTournamentComplete || isCut)
          ? projected
          : oddsResult
            ? (oddsResult.ev.get(player.espnId) ?? projected)
            : 0;

        // scoreToPar stat is the reliable cumulative to-par string ("-3", "E", "+1").
        // score.displayValue is unreliable: "-" for not-yet-started, wrong for active players.
        const scoreToParStat = competitor.statistics?.find((s) => s.name === 'scoreToPar')?.displayValue;
        const rawScore = scoreToParStat && scoreToParStat !== '-' ? scoreToParStat : (competitor.score?.displayValue ?? 'E');
        const scoreDisplay = rawScore === '-' ? 'E' : rawScore;

        liveData = {
          espnId: player.espnId,
          displayName: competitor.athlete.displayName,
          earnings,
          projectedEarnings: projected,
          earningsDisplay: earnings > 0 ? formatCurrency(earnings) : '$0',
          projectedEarningsDisplay: projected > 0 ? formatCurrency(projected) : '$0',
          scoreDisplay,
          teeTime: competitor.status?.teeTime ?? '',
          startHole: competitor.status?.startHole ?? 1,
          position: isCut ? 'CUT' : (competitor.status?.position?.displayName ?? '-'),
          thru: competitor.status?.thru ?? 0,
          state: rawState,
          isCut,
          completedRounds,
          sortOrder: competitor.sortOrder ?? 999,
          statistics: competitor.statistics ?? [],
          oddsEV: playerEV,
          oddsEVDisplay: playerEV > 0 ? formatCurrency(playerEV) : '$0',
          cutProbability: status.state === 'pre'
            ? (oddsResult?.cutProb.get(player.espnId) ?? 0)
            : liveCutProbability(scoreDisplay, completedRounds, competitor.status?.thru ?? 0, rawState, status.period, isCut, estimatedCutLine),
        };

        totalEarnings += projected;
        totalOddsEV += playerEV;
      }

      return { tier, player, liveData };
    });

    // Sum score-to-par across all picks.
    // Include 'pre' players who have completed at least one round — ESPN resets
    // their state to 'pre' between rounds but their scoreToPar is still valid.
    // Cut players still contributed their R1+R2 scores, so include them too;
    // isCut only affects display/earnings, not the team's cumulative score.
    let totalScoreToPar = 0;
    for (const { liveData } of pickResults) {
      if (liveData && (liveData.state !== 'pre' || liveData.completedRounds > 0)) {
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

/**
 * Compute live-adjusted cut probability and EV for every competitor in the field.
 * Used to build the evRecord and cutProbRecord passed to the Players tab, which
 * shows all players (not just picked ones) and would otherwise use raw odds-API
 * values that ignore current score and holes remaining.
 */
export function computeLivePlayerStats(
  competitors: ESPNCompetitor[],
  pursePayouts: PurseEntry[],
  status: ESPNTournamentStatus,
  oddsResult: OddsResult | null
): Map<string, { cutProbability: number; oddsEV: number }> {
  const projected = computeProjectedEarnings(competitors, pursePayouts, status);
  const isTournamentComplete = status.state === 'post' && status.period >= 4;
  const cutLine = status.state !== 'pre' ? estimateCutLine(competitors) : 5;

  const result = new Map<string, { cutProbability: number; oddsEV: number }>();

  for (const c of competitors) {
    const espnId = c.athlete.id;
    const earnings = c.earnings ?? 0;
    const rawState = c.status?.type?.state ?? 'pre';
    const linescoredCount = (c.linescores ?? [])
      .filter((ls) => ls.value != null && ls.value > 0).length;
    const completedRounds = rawState === 'in'
      ? Math.max(0, linescoredCount - 1)
      : linescoredCount;
    const thru = c.status?.thru ?? 0;

    const statusDescription = (c.status?.type?.description ?? '').toLowerCase();
    const isCut = status.period > 2 && earnings === 0 && statusDescription === 'missed cut';

    const scoreToParStat = c.statistics?.find((s) => s.name === 'scoreToPar')?.displayValue;
    const rawScore = scoreToParStat && scoreToParStat !== '-' ? scoreToParStat : (c.score?.displayValue ?? 'E');
    const scoreDisplay = rawScore === '-' ? 'E' : rawScore;

    const proj = projected.get(espnId) ?? 0;
    const ev = (isTournamentComplete || isCut)
      ? proj
      : oddsResult
        ? (oddsResult.ev.get(espnId) ?? proj)
        : 0;

    const cutProb = status.state === 'pre'
      ? (oddsResult?.cutProb.get(espnId) ?? 0)
      : liveCutProbability(scoreDisplay, completedRounds, thru, rawState, status.period, isCut, cutLine);

    result.set(espnId, { cutProbability: cutProb, oddsEV: ev });
  }

  return result;
}
