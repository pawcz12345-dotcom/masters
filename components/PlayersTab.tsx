'use client';

import { useState, useMemo } from 'react';
import type { ESPNCompetitor, ESPNTournamentStatus, ParticipantScore, Tier, Player } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface RichPlayer {
  espnId: string;
  displayName: string;
  tier: Tier | null;
  sortOrder: number;
  position: string;
  scoreDisplay: string;
  thru: number;
  state: 'pre' | 'in' | 'post';
  isCut: boolean;
  projectedEarnings: number;
  projectedEarningsDisplay: string;
  oddsEV: number;
  oddsEVDisplay: string;
  cutProbability: number;
  roundScores: Array<{ name: string; displayValue: string }>;
  pickedBy: Array<{ name: string; teamName?: string; slug: string }>;
}

type SortKey = 'pos' | 'tier' | 'score' | 'earnings' | 'ev' | 'cut';

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  return (
    <span className="inline-block ml-1 opacity-60">
      {active ? (dir === 'asc' ? '↑' : '↓') : <span className="text-gray-300">↕</span>}
    </span>
  );
}

function cutColor(prob: number): string {
  if (prob >= 0.75) return 'text-green-600';
  if (prob >= 0.50) return 'text-yellow-600';
  return 'text-red-500';
}

export default function PlayersTab({
  competitors,
  players,
  tiers,
  standings,
  status,
  evRecord,
  cutProbRecord,
}: {
  competitors: ESPNCompetitor[];
  players: Player[];
  tiers: Tier[];
  standings: ParticipantScore[];
  status: ESPNTournamentStatus;
  evRecord: Record<string, number>;
  cutProbRecord: Record<string, number>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('ev');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(espnId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(espnId)) next.delete(espnId);
      else next.add(espnId);
      return next;
    });
  }

  const playerByEspnId = useMemo(() => {
    const m = new Map<string, Player>();
    for (const p of players) m.set(p.espnId, p);
    return m;
  }, [players]);

  const tierMap = useMemo(() => {
    const m = new Map<string, Tier>();
    for (const t of tiers) m.set(t.id, t);
    return m;
  }, [tiers]);

  const pickedByMap = useMemo(() => {
    const m = new Map<string, Array<{ name: string; teamName?: string; slug: string }>>();
    for (const s of standings) {
      for (const { player } of s.picks) {
        if (!m.has(player.espnId)) m.set(player.espnId, []);
        m.get(player.espnId)!.push({
          name: s.participant.name,
          teamName: s.participant.teamName,
          slug: s.participant.slug,
        });
      }
    }
    return m;
  }, [standings]);

  const richPlayers = useMemo((): RichPlayer[] => {
    return competitors.map((c) => {
      const ourPlayer = playerByEspnId.get(c.athlete.id);
      const tier = ourPlayer ? (tierMap.get(ourPlayer.tierId) ?? null) : null;
      const isCut =
        c.status?.type?.state === 'post' &&
        status.period > 2 &&
        (c.earnings ?? 0) === 0;

      // EV: prefer liveData from standings (has personalized EV), fall back to evRecord
      let oddsEV = evRecord[c.athlete.id] ?? 0;
      let oddsEVDisplay = oddsEV > 0 ? formatCurrency(oddsEV) : '—';
      let projectedEarnings = 0;
      let projectedEarningsDisplay = '$0';

      for (const s of standings) {
        for (const { player, liveData } of s.picks) {
          if (player.espnId === c.athlete.id && liveData) {
            projectedEarnings = liveData.projectedEarnings;
            projectedEarningsDisplay = liveData.projectedEarningsDisplay;
            oddsEV = liveData.oddsEV;
            oddsEVDisplay = liveData.oddsEVDisplay;
            break;
          }
        }
      }

      if (projectedEarnings === 0 && c.earnings > 0) {
        projectedEarnings = c.earnings;
        projectedEarningsDisplay = formatCurrency(c.earnings);
      }

      const ROUND_NAMES = new Set(['R1', 'R2', 'R3', 'R4']);
      const roundScores = (c.statistics ?? []).filter(
        (s) => ROUND_NAMES.has(s.name) && s.displayValue && s.displayValue !== '--'
      );

      return {
        espnId: c.athlete.id,
        displayName: c.athlete.displayName,
        tier,
        sortOrder: c.sortOrder ?? 999,
        position: isCut ? 'CUT' : (c.status?.position?.displayName ?? '—'),
        scoreDisplay: c.score?.displayValue ?? 'E',
        thru: c.status?.thru ?? 0,
        state: c.status?.type?.state ?? 'pre',
        isCut,
        projectedEarnings,
        projectedEarningsDisplay,
        oddsEV,
        oddsEVDisplay,
        cutProbability: cutProbRecord[c.athlete.id] ?? 0,
        roundScores,
        pickedBy: pickedByMap.get(c.athlete.id) ?? [],
      };
    });
  }, [competitors, playerByEspnId, tierMap, pickedByMap, standings, status, evRecord, cutProbRecord]);

  const filtered = useMemo(() => {
    if (!search.trim()) return richPlayers;
    const q = search.toLowerCase();
    return richPlayers.filter((p) => p.displayName.toLowerCase().includes(q));
  }, [richPlayers, search]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let diff = 0;
      switch (sortKey) {
        case 'pos':      diff = a.sortOrder - b.sortOrder; break;
        case 'tier':     diff = (a.tier?.order ?? 99) - (b.tier?.order ?? 99); break;
        case 'score': {
          const aV = a.scoreDisplay === 'E' ? 0 : parseFloat(a.scoreDisplay) || 0;
          const bV = b.scoreDisplay === 'E' ? 0 : parseFloat(b.scoreDisplay) || 0;
          diff = aV - bV;
          break;
        }
        case 'earnings': diff = b.projectedEarnings - a.projectedEarnings; break;
        case 'ev':       diff = b.oddsEV - a.oddsEV; break;
        case 'cut':      diff = b.cutProbability - a.cutProbability; break;
      }
      return sortDir === 'asc' ? diff : -diff;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  function th(key: SortKey, label: string, className = '') {
    return (
      <th
        className={`pb-3 pr-4 cursor-pointer select-none hover:text-gray-700 transition-colors whitespace-nowrap text-xs uppercase tracking-wide text-gray-500 ${className}`}
        onClick={() => handleSort(key)}
      >
        {label}
        <SortIcon active={sortKey === key} dir={sortDir} />
      </th>
    );
  }

  const isPreTournament = status.state === 'pre';

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search player…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            {th('pos', 'Pos', 'w-12')}
            <th className="pb-3 pr-4 text-xs uppercase tracking-wide text-gray-500">Player</th>
            {th('tier', 'Tier', 'text-center')}
            {th('score', 'Score', 'text-right')}
            <th className="pb-3 pr-4 text-right text-xs uppercase tracking-wide text-gray-500">Thru</th>
            {th('cut', 'Cut %', 'text-right')}
            {th('earnings', 'Live $', 'text-right')}
            {th('ev', 'EV $', 'text-right')}
            <th className="pb-3 pr-4 text-right text-xs uppercase tracking-wide text-gray-500">Own%</th>
            <th className="pb-3 pr-2 text-right text-xs uppercase tracking-wide text-gray-500">Picked By</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const scoreNum = p.scoreDisplay === 'E' ? 0 : parseFloat(p.scoreDisplay) || 0;
            const inPool = p.pickedBy.length > 0;
            const isExpanded = expanded.has(p.espnId);
            const hasCutProb = p.cutProbability > 0;

            return (
              <>
                <tr
                  key={p.espnId}
                  className={`border-b border-gray-100 transition-colors ${
                    p.isCut ? 'opacity-40' : inPool ? 'hover:bg-green-50' : 'hover:bg-gray-50'
                  } ${isExpanded ? (inPool ? 'bg-green-50' : 'bg-gray-50') : ''}`}
                >
                  {/* Pos */}
                  <td className="py-3 pr-4">
                    <span className="font-semibold text-gray-600 tabular-nums">
                      {isPreTournament ? <span className="text-gray-300">—</span> : p.position}
                    </span>
                  </td>

                  {/* Player */}
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://a.espncdn.com/i/headshots/golf/players/full/${p.espnId}.png`}
                        alt={p.displayName}
                        width={28}
                        height={28}
                        className={`rounded-full object-cover bg-gray-100 shrink-0 ${p.isCut ? 'grayscale' : ''}`}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <p className={`font-medium text-gray-900 whitespace-nowrap ${p.isCut ? 'line-through' : ''}`}>
                        {p.displayName}
                      </p>
                      <button
                        onClick={() => toggleExpand(p.espnId)}
                        className="text-gray-400 hover:text-gray-600 transition-colors ml-1 shrink-0"
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        <svg
                          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </td>

                  {/* Tier */}
                  <td className="py-3 pr-4 text-center">
                    {p.tier ? (
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {p.tier.name}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>

                  {/* Score */}
                  <td className="py-3 pr-4 text-right tabular-nums font-medium">
                    {isPreTournament ? (
                      <span className="text-gray-300">—</span>
                    ) : (
                      <span className={scoreNum < 0 ? 'text-red-600' : scoreNum > 0 ? 'text-gray-500' : 'text-gray-700'}>
                        {p.scoreDisplay}
                      </span>
                    )}
                  </td>

                  {/* Thru */}
                  <td className="py-3 pr-4 text-right tabular-nums text-gray-600">
                    {isPreTournament ? (
                      <span className="text-gray-300">—</span>
                    ) : p.state === 'in' && p.thru > 0 ? p.thru
                    : p.state === 'post' ? 'F'
                    : '—'}
                  </td>

                  {/* Cut % */}
                  <td className="py-3 pr-4 text-right tabular-nums font-medium">
                    {hasCutProb ? (
                      <span className={cutColor(p.cutProbability)}>
                        {(p.cutProbability * 100).toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>

                  {/* Live $ */}
                  <td className="py-3 pr-4 text-right tabular-nums font-medium">
                    {p.projectedEarnings > 0 ? (
                      <span className="text-green-700">{p.projectedEarningsDisplay}</span>
                    ) : (
                      <span className="text-gray-300">$0</span>
                    )}
                  </td>

                  {/* EV $ */}
                  <td className="py-3 pr-4 text-right tabular-nums font-medium">
                    {p.oddsEV > 0 ? (
                      <span className="text-blue-600">{p.oddsEVDisplay}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>

                  {/* Ownership % */}
                  <td className="py-3 pr-4 text-right tabular-nums font-medium">
                    {p.pickedBy.length > 0 ? (
                      <span className="text-gray-600">
                        {((p.pickedBy.length / standings.length) * 100).toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>

                  {/* Picked By */}
                  <td className="py-3 pr-2 text-right">
                    {p.pickedBy.length > 0 ? (
                      <div className="flex flex-wrap gap-1 justify-end">
                        {p.pickedBy.map((participant) => (
                          <a
                            key={participant.slug}
                            href={`/participant/${participant.slug}`}
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-800 hover:bg-green-200 transition-colors whitespace-nowrap"
                            title={participant.name}
                          >
                            {participant.teamName ?? participant.name}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-200 text-xs">—</span>
                    )}
                  </td>

                </tr>

                {/* Expanded round scores row */}
                {isExpanded && (
                  <tr key={`${p.espnId}-expanded`} className={`border-b border-gray-100 ${inPool ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <td colSpan={10} className="px-4 pb-3 pt-1">
                      <div className="flex items-center gap-6 flex-wrap">
                        {/* Round scores */}
                        {(['R1', 'R2', 'R3', 'R4'] as const).map((r) => {
                          const stat = p.roundScores.find((s) => s.name === r);
                          return (
                            <div key={r} className="text-center">
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{r}</p>
                              <p className="text-sm font-semibold text-gray-700 tabular-nums">
                                {stat ? stat.displayValue : <span className="text-gray-300">—</span>}
                              </p>
                            </div>
                          );
                        })}

                        {/* Divider */}
                        {hasCutProb && <div className="h-8 w-px bg-gray-200" />}

                        {/* Cut probability bar */}
                        {hasCutProb && (
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Make Cut</p>
                              <p className={`text-sm font-semibold tabular-nums ${cutColor(p.cutProbability)}`}>
                                {(p.cutProbability * 100).toFixed(1)}%
                              </p>
                            </div>
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  p.cutProbability >= 0.75 ? 'bg-green-500' :
                                  p.cutProbability >= 0.50 ? 'bg-yellow-400' : 'bg-red-400'
                                }`}
                                style={{ width: `${(p.cutProbability * 100).toFixed(0)}%` }}
                              />
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Miss Cut</p>
                              <p className="text-sm font-semibold text-gray-500 tabular-nums">
                                {((1 - p.cutProbability) * 100).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        )}

                        {/* EV breakdown */}
                        {p.oddsEV > 0 && (
                          <>
                            <div className="h-8 w-px bg-gray-200" />
                            <div className="text-center">
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">EV $</p>
                              <p className="text-sm font-semibold text-blue-600 tabular-nums">{p.oddsEVDisplay}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>

      <p className="text-xs text-gray-300 mt-4 text-center">
        {sorted.length} players · Cut % via Harville simulation from live odds
      </p>
    </div>
  );
}
