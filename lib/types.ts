// --- Data file types ---
export interface Tier {
  id: string;
  name: string;
  description?: string;
  order: number;
}

export interface Player {
  id: string;
  espnId: string;
  displayName: string;
  tierId: string;
}

export interface Pick {
  tierId: string;
  playerId: string;
}

export interface Participant {
  id: string;
  slug: string;
  name: string;
  teamName?: string;
  tiebreaker?: string;
  picks: Pick[];
}

export interface PurseEntry {
  position: number;
  amount: number;
}

// --- ESPN API types ---
export interface ESPNCompetitor {
  id: string;
  earnings: number;
  sortOrder: number;
  athlete: {
    id: string;
    displayName: string;
    shortName: string;
  };
  score: {
    value: number;
    displayValue: string;
  };
  status: {
    thru: number;
    position: {
      displayName: string;
      isTie: boolean;
    };
    type: {
      state: 'pre' | 'in' | 'post';
      completed: boolean;
      description: string;
    };
  };
  statistics: Array<{
    name: string;
    value?: number;
    displayValue: string;
  }>;
}

export interface ESPNTournamentStatus {
  state: 'pre' | 'in' | 'post';
  period: number;
  detail: string;
  shortDetail: string;
}

// --- Computed / scoring types ---
export interface PlayerLiveData {
  espnId: string;
  displayName: string;
  earnings: number;
  projectedEarnings: number;
  earningsDisplay: string;
  projectedEarningsDisplay: string;
  scoreDisplay: string;
  position: string;
  thru: number;
  state: 'pre' | 'in' | 'post';
  isCut: boolean;
  statistics: Array<{ name: string; displayValue: string }>;
  oddsEV: number;
  oddsEVDisplay: string;
  cutProbability: number; // 0–1, from Harville simulation
}

export interface PickResult {
  tier: Tier;
  player: Player;
  liveData: PlayerLiveData | null;
}

export interface ParticipantScore {
  participant: Participant;
  /** Position-based: what you'd earn if tournament ended now. Used for rank + payout. */
  totalEarnings: number;
  totalEarningsDisplay: string;
  /** Odds-based expected value via Harville MC. Supplementary display only. */
  oddsEV: number;
  oddsEVDisplay: string;
  totalScoreToPar: number;
  totalScoreDisplay: string;
  picks: PickResult[];
  rank: number;
  rankDisplay: string;
}
