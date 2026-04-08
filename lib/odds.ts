import type { PurseEntry } from './types';

const ODDS_API_URL =
  'https://api.the-odds-api.com/v4/sports/golf_masters_tournament_winner/odds';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OddsResult {
  /** espnId → expected purse $ (Harville MC) */
  ev: Map<string, number>;
  /** espnId → P(make cut) 0–1, estimated as P(finish in a paying position) */
  cutProb: Map<string, number>;
}

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

function americanToImplied(american: number): number {
  return american < 0
    ? Math.abs(american) / (Math.abs(american) + 100)
    : 100 / (american + 100);
}

// Known name mismatches: odds API name (normalized) → our players.json name (normalized)
const NAME_ALIASES: Record<string, string> = {
  // First name variations
  'matthew fitzpatrick':  'matt fitzpatrick',
  'matt mccarty':         'matthew mccarty',
  'john keefer':          'johnny keefer',
  'alexander noren':      'alex noren',
  'christopher gotterup': 'chris gotterup',
  // Nickname / abbreviation variations
  'nicolas echavarria':   'nico echavarria',
  'min-woo lee':          'min woo lee',
  'jj spaun':             'jj spaun', // handles "JJ Spaun" (no dots) → same result
};

function normalizeName(name: string): string {
  return name
    // Explicit substitutions for characters that don't decompose with NFD
    .replace(/ø/gi, 'o')
    .replace(/å/gi, 'a')
    .replace(/æ/gi, 'ae')
    .replace(/ð/gi, 'd')
    .replace(/þ/gi, 'th')
    .replace(/ß/gi, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining accents (é→e, ñ→n, etc.)
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Harville Monte Carlo ─────────────────────────────────────────────────────

interface HarvillePlayer {
  id: string;   // espnId for matched players, _u_N for unmatched
  prob: number; // vig-stripped probability
}

interface HarvilleResult {
  ev: Map<string, number>;
  cutProb: Map<string, number>;
}

/**
 * Harville sequential draw over ALL players (matched + unmatched).
 * Returns EV and cut probability only for players that have an espnId
 * (i.e. matched to our pool). Unmatched players absorb probability mass
 * correctly so the vig strip is accurate across the whole field.
 *
 * cut = finishing in any paying position (top ~50 at the Masters)
 */
function harvilleEV(
  players: HarvillePlayer[],
  pursePayouts: PurseEntry[],
  simCount = 4000
): HarvilleResult {
  const K = pursePayouts.length; // number of paying positions (~50)

  // Only track counts for espnId players (no leading underscore)
  const positionCounts = new Map<string, Float64Array>();
  for (const p of players) {
    if (!p.id.startsWith('_u_')) {
      positionCounts.set(p.id, new Float64Array(K));
    }
  }

  for (let sim = 0; sim < simCount; sim++) {
    const remaining = players.map((p) => ({ id: p.id, prob: p.prob }));

    for (let pos = 0; pos < K && remaining.length > 0; pos++) {
      let total = 0;
      for (const r of remaining) total += r.prob;

      const rand = Math.random() * total;
      let cumSum = 0;
      let chosenIdx = remaining.length - 1;
      for (let i = 0; i < remaining.length; i++) {
        cumSum += remaining[i].prob;
        if (cumSum >= rand) { chosenIdx = i; break; }
      }

      const chosen = remaining[chosenIdx];
      if (positionCounts.has(chosen.id)) {
        positionCounts.get(chosen.id)![pos]++;
      }
      remaining.splice(chosenIdx, 1);
    }
  }

  const ev = new Map<string, number>();
  const cutProb = new Map<string, number>();

  for (const [espnId, counts] of positionCounts.entries()) {
    let playerEV = 0;
    let cutCount = 0;
    for (let k = 0; k < K; k++) {
      playerEV += (counts[k] / simCount) * (pursePayouts[k]?.amount ?? 0);
      cutCount += counts[k];
    }
    ev.set(espnId, playerEV);
    cutProb.set(espnId, cutCount / simCount);
  }

  return { ev, cutProb };
}

// ─── In-memory fallback ───────────────────────────────────────────────────────

let cachedResult: OddsResult | null = null;

// ─── Public API ──────────────────────────────────────────────────────────────

export async function fetchOddsEV(
  players: Array<{ espnId: string; displayName: string }>,
  pursePayouts: PurseEntry[]
): Promise<OddsResult | null> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return cachedResult;

  try {
    const url = `${ODDS_API_URL}?apiKey=${apiKey}&regions=us&markets=outrights&oddsFormat=american`;
    const res = await fetch(url, { next: { revalidate: 7200 } });

    if (!res.ok) {
      console.warn(`Odds API returned ${res.status}`);
      return cachedResult;
    }

    const events: OddsEvent[] = await res.json();
    if (!events || events.length === 0) return cachedResult;

    // Build name → espnId lookup (canonical name + known aliases)
    const nameToEspnId = new Map<string, string>();
    for (const p of players) {
      const canonical = normalizeName(p.displayName);
      nameToEspnId.set(canonical, p.espnId);
      // Register any alias that maps to this canonical name
      for (const [alias, target] of Object.entries(NAME_ALIASES)) {
        if (target === canonical) nameToEspnId.set(alias, p.espnId);
      }
    }

    // Collect ALL players from the odds feed (matched + unmatched)
    // Key: normalized name, Value: { espnId | null, sum of implied probs, count }
    const allPlayers = new Map<string, { id: string; impliedSum: number; count: number }>();

    let unmatchedIdx = 0;
    for (const event of events) {
      for (const bookmaker of event.bookmakers) {
        const market = bookmaker.markets.find((m) => m.key === 'outrights');
        if (!market) continue;

        for (const outcome of market.outcomes) {
          const normName = normalizeName(outcome.name);
          const espnId = nameToEspnId.get(normName);
          const id = espnId ?? `_u_${unmatchedIdx++}`;

          // Dedupe unmatched players across bookmakers by name
          const key = normName;
          if (!allPlayers.has(key)) {
            allPlayers.set(key, { id, impliedSum: 0, count: 0 });
          }
          const entry = allPlayers.get(key)!;
          entry.impliedSum += americanToImplied(outcome.price);
          entry.count++;
        }
      }
    }

    if (allPlayers.size === 0) return cachedResult;

    // Log unmatched names so we can add aliases
    const unmatched = Array.from(allPlayers.entries())
      .filter(([, v]) => v.id.startsWith('_u_'))
      .map(([name]) => name)
      .sort();
    if (unmatched.length > 0) {
      console.log(`[odds] ${unmatched.length} unmatched players:`, unmatched.join(', '));
    }

    // Average implied prob across bookmakers, then normalize over ALL players
    const avgImplied = Array.from(allPlayers.values()).map((p) => ({
      id: p.id,
      implied: p.impliedSum / p.count,
    }));

    const totalImplied = avgImplied.reduce((s, p) => s + p.implied, 0);
    const harvillePlayers: HarvillePlayer[] = avgImplied.map((p) => ({
      id: p.id,
      prob: p.implied / totalImplied,
    }));

    const result = harvilleEV(harvillePlayers, pursePayouts);
    cachedResult = result;
    return result;
  } catch (err) {
    console.error('Odds fetch/compute failed:', err);
    return cachedResult;
  }
}
