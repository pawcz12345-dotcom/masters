import type { ESPNCompetitor, ESPNTournamentStatus } from './types';

const ESPN_URL =
  'https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga';

const TOURNAMENT_NAME = 'Masters Tournament';

export interface ESPNLeaderboardData {
  competitors: ESPNCompetitor[];
  tournamentName: string;
  status: ESPNTournamentStatus;
}

// In-memory fallback — persists across requests in the same serverless instance
let lastSuccessfulData: ESPNLeaderboardData | null = null;

export async function fetchESPNLeaderboard(): Promise<ESPNLeaderboardData> {
  try {
    const res = await fetch(ESPN_URL, {
      next: { revalidate: 60 },
    });

    if (!res.ok) throw new Error(`ESPN API returned ${res.status}`);

    const data = await res.json();

    // Find the Masters event specifically.
    // Do NOT fall back to data.events?.[0] — after the tournament ESPN shifts to
    // the next event and that wrong event's competitors would corrupt standings.
    const event = data.events?.find((e: { name: string }) =>
      e.name?.includes(TOURNAMENT_NAME)
    );

    if (!event) throw new Error('Masters Tournament not found in ESPN response');

    const competition = event.competitions?.[0];
    if (!competition) throw new Error('No competition found in ESPN event');

    const result: ESPNLeaderboardData = {
      competitors: (competition.competitors ?? []) as ESPNCompetitor[],
      tournamentName: event.name ?? 'Masters Tournament 2026',
      status: {
        state: event.status?.type?.state ?? 'pre',
        period: competition.status?.period ?? 0,
        detail: competition.status?.type?.detail ?? '',
        shortDetail: competition.status?.type?.shortDetail ?? '',
      },
    };

    lastSuccessfulData = result;
    return result;
  } catch (err) {
    console.error('ESPN API fetch failed:', err);
    if (lastSuccessfulData) {
      return lastSuccessfulData;
    }
    return {
      competitors: [],
      tournamentName: 'Masters Tournament 2026',
      status: { state: 'pre', period: 0, detail: '', shortDetail: '' },
    };
  }
}
