import type { PurseEntry } from './types';

const ODDS_API_URL =
  'https://api.the-odds-api.com/v4/sports/golf_masters_tournament_winner/odds';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OddsOutcome {
  name: string;
  price: number; // American odds
}

interface OddsBookmaker {
  key: string;
  markets: Array<{
    key: string;
    outcomes: OddsOutcome[];
  }>;
}

interface OddsEvent {
  bookmakers: OddsBookmaker[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** American odds → raw implied probability (includes vig) */
function americanToImplied(american: number): number {
  return american < 0
    ? Math.abs(american) / (Math.abs(american) + 100)
    : 100 / (american + 100);
}

/** Normalize a player name for fuzzy matching:
 *  lowercase, strip accents, keep only a-z and spaces */
function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Harville Monte Carlo ─────────────────────────────────────────────────────

/**
 * Given win probabilities (already vig-stripped, summing to 1),
 * simulate finish order using the Harville sequential selection model.
 * Returns EV in dollars for each player (espnId → expected purse $).
 */
function harvilleEV(
  players: Array<{ espnId: string; prob: number }>,
  pursePayouts: PurseEntry[],
  simCount = 4000
): Map<string, number> {
  const K = pursePayouts.length;
  // positionTotals[espnId][k] = cumulative times this player landed in position k
  const positionCounts = new Map<string, Float64Array>();
  for (const p of players) {
    positionCounts.set(p.espnId, new Float64Array(K));
  }

  for (let sim = 0; sim < simCount; sim++) {
    // Copy remaining players for this simulation
    const remaining = players.map((p) => ({ ...p }));

    for (let pos = 0; pos < K && remaining.length > 0; pos++) {
      // Total prob of remaining players
      let total = 0;
      for (const r of remaining) total += r.prob;

      // Weighted draw
      const rand = Math.random() * total;
      let cumSum = 0;
      let chosenIdx = remaining.length - 1;
      for (let i = 0; i < remaining.length; i++) {
        cumSum += remaining[i].prob;
        if (cumSum >= rand) {
          chosenIdx = i;
          break;
        }
      }

      const chosen = remaining[chosenIdx];
      positionCounts.get(chosen.espnId)![pos]++;
      remaining.splice(chosenIdx, 1);
    }
  }

  // EV = Σ_k P(finish k) × purse[k]
  const ev = new Map<string, number>();
  for (const [espnId, counts] of positionCounts.entries()) {
    let playerEV = 0;
    for (let k = 0; k < K; k++) {
      playerEV += (counts[k] / simCount) * (pursePayouts[k]?.amount ?? 0);
    }
    ev.set(espnId, playerEV);
  }

  return ev;
}

// ─── In-memory fallback ───────────────────────────────────────────────────────

let cachedOddsEV: Map<string, number> | null = null;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch odds, strip vig, run Harville simulation.
 * Returns Map<espnId, expectedPurse$> or null if unavailable.
 *
 * Uses Next.js fetch cache (revalidate 2h) to stay within free API tier.
 */
export async function fetchOddsEV(
  /** players from players.json — used for espnId ↔ name mapping */
  players: Array<{ espnId: string; displayName: string }>,
  pursePayouts: PurseEntry[]
): Promise<Map<string, number> | null> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return cachedOddsEV; // no key → use last cached or null

  try {
    const url = `${ODDS_API_URL}?apiKey=${apiKey}&regions=us&markets=outrights&oddsFormat=american`;
    const res = await fetch(url, {
      next: { revalidate: 7200 }, // 2-hour cache — ~12 requests/day max
    });

    if (!res.ok) {
      console.warn(`Odds API returned ${res.status}`);
      return cachedOddsEV;
    }

    const events: OddsEvent[] = await res.json();
    if (!events || events.length === 0) return cachedOddsEV;

    // Build name → espnId lookup (normalized)
    const nameToId = new Map<string, string>();
    for (const p of players) {
      nameToId.set(normalizeName(p.displayName), p.espnId);
    }

    // Aggregate implied probs across all bookmakers (use best-of-market average)
    const impliedSums = new Map<string, number>(); // espnId → sum of implied probs
    const impliedCounts = new Map<string, number>(); // espnId → count of books

    for (const event of events) {
      for (const bookmaker of event.bookmakers) {
        const market = bookmaker.markets.find((m) => m.key === 'outrights');
        if (!market) continue;

        for (const outcome of market.outcomes) {
          const normalizedName = normalizeName(outcome.name);
          const espnId = nameToId.get(normalizedName);
          if (!espnId) continue; // player not in our pool — skip

          const implied = americanToImplied(outcome.price);
          impliedSums.set(espnId, (impliedSums.get(espnId) ?? 0) + implied);
          impliedCounts.set(espnId, (impliedCounts.get(espnId) ?? 0) + 1);
        }
      }
    }

    if (impliedSums.size === 0) return cachedOddsEV;

    // Average across bookmakers
    const avgImplied = new Map<string, number>();
    for (const [espnId, sum] of impliedSums.entries()) {
      avgImplied.set(espnId, sum / impliedCounts.get(espnId)!);
    }

    // Strip vig: normalize so all probs sum to 1
    const totalImplied = Array.from(avgImplied.values()).reduce((a, b) => a + b, 0);
    const oddsPlayers = Array.from(avgImplied.entries()).map(([espnId, implied]) => ({
      espnId,
      prob: implied / totalImplied,
    }));

    // Run Harville Monte Carlo
    const ev = harvilleEV(oddsPlayers, pursePayouts);
    cachedOddsEV = ev;
    return ev;
  } catch (err) {
    console.error('Odds fetch/compute failed:', err);
    return cachedOddsEV;
  }
}
