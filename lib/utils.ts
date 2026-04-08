export function formatCurrency(amount: number): string {
  if (amount === 0) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function generateUniqueSlug(name: string, existing: string[]): string {
  const base = slugify(name);
  if (!existing.includes(base)) return base;
  let i = 2;
  while (existing.includes(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

import type { ParticipantScore } from './types';

export type TierRankMap = Map<string, { rank: number; total: number }>;

/** Rank every player within their pool tier by projected earnings.
 *  Key: `${tierId}:${playerId}` → { rank (1-based), total players in tier } */
export function computeTierRankings(standings: ParticipantScore[]): TierRankMap {
  // Collect unique players per tier (de-duped by playerId)
  const tierGroups = new Map<string, Array<{ playerId: string; earnings: number; isCut: boolean }>>();

  for (const s of standings) {
    for (const { tier, player, liveData } of s.picks) {
      if (!tierGroups.has(tier.id)) tierGroups.set(tier.id, []);
      const group = tierGroups.get(tier.id)!;
      if (!group.find((g) => g.playerId === player.id)) {
        group.push({
          playerId: player.id,
          earnings: liveData?.projectedEarnings ?? 0,
          isCut: liveData?.isCut ?? false,
        });
      }
    }
  }

  const rankMap: TierRankMap = new Map();

  for (const [tierId, group] of tierGroups) {
    // Non-cut first sorted by earnings desc, cut players at the bottom
    group.sort((a, b) => {
      if (a.isCut !== b.isCut) return a.isCut ? 1 : -1;
      return b.earnings - a.earnings;
    });
    group.forEach((p, i) => {
      rankMap.set(`${tierId}:${p.playerId}`, { rank: i + 1, total: group.length });
    });
  }

  return rankMap;
}

export function getTierEmoji(rank: number, total: number, isCut: boolean): string {
  if (isCut) return '🧊';
  if (rank === 1) return '💎';
  if (rank <= 3) return '🔥';
  if (rank > total - 3) return '🧊';
  return '';
}

export function formatScore(scoreDisplay: string): string {
  if (!scoreDisplay || scoreDisplay === 'E') return 'E';
  const num = parseFloat(scoreDisplay);
  if (isNaN(num)) return scoreDisplay;
  return num > 0 ? `+${num}` : `${num}`;
}
