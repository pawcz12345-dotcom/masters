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
  linescores: Array<{ value?: number; displayValue?: string; period: number; inScore?: number; outScore?: number }>;
  pickedBy: Array<{ name: string; teamName?: string; slug: string }>;
}

type SortKey = 'pos' | 'tier' | 'score' | 'earnings' | 'ev' | 'cut' | 'ownership';

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  return (
    <span className="inline-block ml-1 opacity-50">
      {active ? (dir === 'asc' ? '↑' : '↓') : <span className="text-masters-ink-4 dark:text-masters-d-ink-4">↕</span>}
    </span>
  );
}

function cutColorClass(prob: number): string {
  if (prob >= 0.75) return 'text-masters-green dark:text-masters-d-green';
  if (prob >= 0.50) return 'text-masters-gold dark:text-masters-d-gold';
  return 'text-masters-red dark:text-masters-d-red';
}

export default function PlayersTab({
  competitors, players, tiers, standings, status, evRecord, cutProbRecord, projectedRecord,
}: {
  competitors: ESPNCompetitor[];
  players: Player[];
  tiers: Tier[];
  standings: ParticipantScore[];
  status: ESPNTournamentStatus;
  evRecord: Record<string, number>;
  cutProbRecord: Record<string, number>;
  projectedRecord: Record<string, number>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('ev');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filterTier, setFilterTier] = useState<string | null>(null);  // tier id or null = all
  const [filterOwned, setFilterOwned] = useState(false);
  const [scorecardRound, setScorecardRound] = useState<Record<string, number>>({});

  function toggleExpand(espnId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(espnId)) next.delete(espnId); else next.add(espnId);
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
        m.get(player.espnId)!.push({ name: s.participant.name, teamName: s.participant.teamName, slug: s.participant.slug });
      }
    }
    return m;
  }, [standings]);

  const richPlayers = useMemo((): RichPlayer[] => {
    return competitors.map((c) => {
      const ourPlayer = playerByEspnId.get(c.athlete.id);
      const tier = ourPlayer ? (tierMap.get(ourPlayer.tierId) ?? null) : null;
      const isCut = c.status?.type?.state === 'post' && status.period > 2 && (c.earnings ?? 0) === 0;

      let oddsEV = evRecord[c.athlete.id] ?? 0;
      let oddsEVDisplay = oddsEV > 0 ? formatCurrency(oddsEV) : '—';
      // Fall back to projectedRecord so unowned players still show a Live $ value
      let projectedEarnings = projectedRecord[c.athlete.id] ?? 0;
      let projectedEarningsDisplay = projectedEarnings > 0 ? formatCurrency(projectedEarnings) : '$0';

      for (const s of standings) {
        for (const { player, liveData } of s.picks) {
          if (player.espnId === c.athlete.id && liveData) {
            // Use liveData values for owned players (already computed with odds EV etc.)
            projectedEarnings = liveData.projectedEarnings;
            projectedEarningsDisplay = liveData.projectedEarningsDisplay;
            oddsEV = liveData.oddsEV;
            oddsEVDisplay = liveData.oddsEVDisplay;
            break;
          }
        }
      }

      const ROUND_NAMES = new Set(['R1', 'R2', 'R3', 'R4']);
      const roundScores = (c.statistics ?? []).filter(
        (s) => ROUND_NAMES.has(s.name) && s.displayValue && s.displayValue !== '--'
      );
      const linescores = (c.linescores ?? []).filter((ls) => ls.value !== undefined);

      const scoreToParStat = c.statistics?.find((s) => s.name === 'scoreToPar')?.displayValue;
      const rawScore = scoreToParStat && scoreToParStat !== '-' ? scoreToParStat : (c.score?.displayValue ?? 'E');
      const scoreDisplay = rawScore === '-' ? 'E' : rawScore;

      return {
        espnId: c.athlete.id, displayName: c.athlete.displayName, tier,
        sortOrder: c.sortOrder ?? 999,
        position: isCut ? 'CUT' : (c.status?.position?.displayName ?? '—'),
        scoreDisplay,
        thru: c.status?.thru ?? 0,
        state: c.status?.type?.state ?? 'pre',
        isCut, projectedEarnings, projectedEarningsDisplay,
        oddsEV, oddsEVDisplay,
        cutProbability: cutProbRecord[c.athlete.id] ?? 0,
        roundScores,
        linescores,
        pickedBy: pickedByMap.get(c.athlete.id) ?? [],
      };
    });
  }, [competitors, playerByEspnId, tierMap, pickedByMap, standings, status, evRecord, cutProbRecord]);

  const filtered = useMemo(() => {
    return richPlayers.filter((p) => {
      if (search.trim() && !p.displayName.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterTier && p.tier?.id !== filterTier) return false;
      if (filterOwned && p.pickedBy.length === 0) return false;
      return true;
    });
  }, [richPlayers, search, filterTier, filterOwned]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let diff = 0;
      switch (sortKey) {
        case 'pos':       diff = a.sortOrder - b.sortOrder; break;
        case 'tier':      diff = (a.tier?.order ?? 99) - (b.tier?.order ?? 99); break;
        case 'score': {
          const aV = a.scoreDisplay === 'E' ? 0 : parseFloat(a.scoreDisplay) || 0;
          const bV = b.scoreDisplay === 'E' ? 0 : parseFloat(b.scoreDisplay) || 0;
          diff = aV - bV; break;
        }
        case 'earnings':  diff = b.projectedEarnings - a.projectedEarnings; break;
        case 'ev':        diff = b.oddsEV - a.oddsEV; break;
        case 'cut':       diff = b.cutProbability - a.cutProbability; break;
        case 'ownership': diff = b.pickedBy.length - a.pickedBy.length; break;
      }
      return sortDir === 'asc' ? diff : -diff;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  const thClass = 'pb-3 pr-3 sm:pr-4 text-xs uppercase tracking-wider text-masters-ink-3 dark:text-masters-d-ink-3 cursor-pointer select-none hover:text-masters-ink dark:hover:text-masters-d-ink transition-colors whitespace-nowrap';

  function th(key: SortKey, label: string, extra = '') {
    return (
      <th className={`${thClass} ${extra}`} onClick={() => handleSort(key)}>
        {label}<SortIcon active={sortKey === key} dir={sortDir} />
      </th>
    );
  }

  const isPreTournament = status.state === 'pre';

  const pillBase = 'px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer select-none';
  const pillOn  = 'bg-masters-green dark:bg-masters-d-green text-white dark:text-masters-d-bg border-masters-green dark:border-masters-d-green';
  const pillOff = 'bg-transparent text-masters-ink-2 dark:text-masters-d-ink-2 border-masters-border dark:border-masters-d-border hover:border-masters-ink-3 dark:hover:border-masters-d-ink-3';

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3">
        {/* Search */}
        <input
          type="text"
          placeholder="Search player…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64 px-3 py-1.5 text-sm bg-masters-hover dark:bg-masters-d-hover border border-masters-border dark:border-masters-d-border rounded-lg text-masters-ink dark:text-masters-d-ink placeholder-masters-ink-3 dark:placeholder-masters-d-ink-3 focus:outline-none focus:ring-2 focus:ring-masters-green dark:focus:ring-masters-d-green focus:border-transparent"
        />

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-masters-ink-3 dark:text-masters-d-ink-3 uppercase tracking-wider">Filter:</span>

          {/* Owned only */}
          <button
            type="button"
            onClick={() => setFilterOwned((v) => !v)}
            className={`${pillBase} ${filterOwned ? pillOn : pillOff}`}
          >
            In Pool
          </button>

          {/* Tier pills */}
          {tiers.sort((a, b) => a.order - b.order).map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => setFilterTier((prev) => prev === tier.id ? null : tier.id)}
              className={`${pillBase} ${filterTier === tier.id ? pillOn : pillOff}`}
            >
              {tier.name}
            </button>
          ))}

          {/* Clear */}
          {(filterTier || filterOwned) && (
            <button
              type="button"
              onClick={() => { setFilterTier(null); setFilterOwned(false); }}
              className="text-xs text-masters-ink-3 dark:text-masters-d-ink-3 hover:text-masters-ink dark:hover:text-masters-d-ink underline ml-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="border-b border-masters-border dark:border-masters-d-border text-left">
              {th('pos', 'Pos', 'w-10 pl-4 sm:pl-0')}
              <th className={`${thClass} cursor-default hover:text-masters-ink-3 dark:hover:text-masters-d-ink-3 pl-4 sm:pl-0`}>Player</th>
              {th('tier', 'Tier', 'text-center')}
              {th('score', 'Score', 'text-right')}
              <th className={`${thClass} cursor-default hover:text-masters-ink-3 dark:hover:text-masters-d-ink-3 text-right`}>Thru</th>
              {th('cut', 'Cut %', 'text-right')}
              {th('earnings', 'Live $', 'text-right')}
              {th('ev', 'EV $', 'text-right')}
              {th('ownership', 'Own%', 'text-right')}
              <th className={`${thClass} cursor-default hover:text-masters-ink-3 dark:hover:text-masters-d-ink-3 text-right pr-2`}>Picked By</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const scoreNum = p.scoreDisplay === 'E' ? 0 : parseFloat(p.scoreDisplay) || 0;
              const inPool = p.pickedBy.length > 0;
              const isExpanded = expanded.has(p.espnId);
              const hasCutProb = p.cutProbability > 0;

              const rowBg = isExpanded
                ? inPool ? 'bg-masters-green/5 dark:bg-masters-d-green/5' : 'bg-masters-hover dark:bg-masters-d-hover'
                : inPool ? 'hover:bg-masters-green/5 dark:hover:bg-masters-d-green/5' : 'hover:bg-masters-hover dark:hover:bg-masters-d-hover';

              return (
                <>
                  <tr
                    key={p.espnId}
                    className={`border-b border-masters-border dark:border-masters-d-border transition-colors cursor-pointer ${p.isCut ? 'opacity-40' : ''} ${rowBg}`}
                    onClick={() => toggleExpand(p.espnId)}
                  >
                    {/* Pos */}
                    <td className="py-3 pr-3 sm:pr-4 pl-4 sm:pl-0">
                      <span className="font-semibold text-masters-ink-2 dark:text-masters-d-ink-2 tabular-nums text-sm">
                        {isPreTournament ? <span className="text-masters-ink-4 dark:text-masters-d-ink-4">—</span> : p.position}
                      </span>
                    </td>

                    {/* Player */}
                    <td className="py-3 pr-3 sm:pr-4 pl-4 sm:pl-0">
                      <div className="flex items-center gap-2">
                        <img
                          src={`https://a.espncdn.com/i/headshots/golf/players/full/${p.espnId}.png`}
                          alt={p.displayName} width={28} height={28}
                          className={`rounded-full object-cover bg-masters-hover dark:bg-masters-d-hover ring-1 ring-masters-border dark:ring-masters-d-border shrink-0 ${p.isCut ? 'grayscale' : ''}`}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <p className={`font-semibold whitespace-nowrap ${p.isCut ? 'line-through text-masters-ink-3 dark:text-masters-d-ink-3' : 'text-masters-ink dark:text-masters-d-ink'}`}>
                          {p.displayName}
                        </p>
                        <span className={`text-masters-ink-4 dark:text-masters-d-ink-4 transition-transform inline-block shrink-0 ml-1 ${isExpanded ? 'rotate-180' : ''}`}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </div>
                    </td>

                    {/* Tier */}
                    <td className="py-3 pr-3 sm:pr-4 text-center">
                      {p.tier ? (
                        <span className="text-xs font-medium text-masters-ink-2 dark:text-masters-d-ink-2 bg-masters-hover dark:bg-masters-d-hover border border-masters-border dark:border-masters-d-border px-2 py-0.5 rounded-full whitespace-nowrap">
                          {p.tier.name}
                        </span>
                      ) : (
                        <span className="text-masters-ink-4 dark:text-masters-d-ink-4">—</span>
                      )}
                    </td>

                    {/* Score */}
                    <td className="py-3 pr-3 sm:pr-4 text-right tabular-nums font-medium text-sm">
                      {isPreTournament ? (
                        <span className="text-masters-ink-4 dark:text-masters-d-ink-4">—</span>
                      ) : (
                        <span className={
                          scoreNum < 0 ? 'text-masters-red dark:text-masters-d-red' :
                          scoreNum > 0 ? 'text-masters-ink-3 dark:text-masters-d-ink-3' :
                          'text-masters-ink dark:text-masters-d-ink'
                        }>{p.scoreDisplay}</span>
                      )}
                    </td>

                    {/* Thru */}
                    <td className="py-3 pr-3 sm:pr-4 text-right tabular-nums text-masters-ink-2 dark:text-masters-d-ink-2 text-sm">
                      {isPreTournament ? <span className="text-masters-ink-4 dark:text-masters-d-ink-4">—</span>
                        : p.state === 'in' && p.thru > 0 ? p.thru
                        : p.state === 'post' ? 'F' : '—'}
                    </td>

                    {/* Cut % */}
                    <td className="py-3 pr-3 sm:pr-4 text-right tabular-nums font-medium text-sm">
                      {hasCutProb ? (
                        <span className={cutColorClass(p.cutProbability)}>
                          {(p.cutProbability * 100).toFixed(0)}%
                        </span>
                      ) : <span className="text-masters-ink-4 dark:text-masters-d-ink-4">—</span>}
                    </td>

                    {/* Live $ */}
                    <td className="py-3 pr-3 sm:pr-4 text-right tabular-nums font-medium text-sm">
                      {p.projectedEarnings > 0 ? (
                        <span className="text-masters-green dark:text-masters-d-green">{p.projectedEarningsDisplay}</span>
                      ) : <span className="text-masters-ink-4 dark:text-masters-d-ink-4">$0</span>}
                    </td>

                    {/* EV $ — gold */}
                    <td className="py-3 pr-3 sm:pr-4 text-right tabular-nums font-medium text-sm">
                      {p.oddsEV > 0 ? (
                        <span className="text-masters-gold dark:text-masters-d-gold">{p.oddsEVDisplay}</span>
                      ) : <span className="text-masters-ink-4 dark:text-masters-d-ink-4">—</span>}
                    </td>

                    {/* Own% */}
                    <td className="py-3 pr-3 sm:pr-4 text-right tabular-nums font-medium text-sm">
                      {p.pickedBy.length > 0 ? (
                        <span className="text-masters-ink-2 dark:text-masters-d-ink-2">
                          {((p.pickedBy.length / standings.length) * 100).toFixed(0)}%
                        </span>
                      ) : <span className="text-masters-ink-4 dark:text-masters-d-ink-4">—</span>}
                    </td>

                    {/* Picked By */}
                    <td className="py-3 pr-2 text-right">
                      {p.pickedBy.length > 0 ? (
                        <div className="flex flex-wrap gap-1 justify-end">
                          {p.pickedBy.map((participant) => (
                            <a
                              key={participant.slug}
                              href={`/participant/${participant.slug}`}
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-masters-green/10 dark:bg-masters-d-green/10 text-masters-green dark:text-masters-d-green border border-masters-green/20 dark:border-masters-d-green/20 hover:bg-masters-green/20 dark:hover:bg-masters-d-green/20 transition-colors whitespace-nowrap"
                              title={participant.name}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {participant.teamName ?? participant.name}
                            </a>
                          ))}
                        </div>
                      ) : <span className="text-masters-ink-4 dark:text-masters-d-ink-4 text-xs">—</span>}
                    </td>
                  </tr>

                  {/* Expanded row — scorecard */}
                  {isExpanded && (() => {
                    const availableRounds = p.linescores.filter((ls) => ls.value !== undefined);
                    const defaultRound = availableRounds.length > 0 ? availableRounds[availableRounds.length - 1].period : null;
                    const selectedPeriod = scorecardRound[p.espnId] ?? defaultRound;
                    const selectedLs = availableRounds.find((ls) => ls.period === selectedPeriod);

                    return (
                      <tr key={`${p.espnId}-exp`} className={`border-b border-masters-border dark:border-masters-d-border ${inPool ? 'bg-masters-green/5 dark:bg-masters-d-green/5' : 'bg-masters-hover/60 dark:bg-masters-d-hover/60'}`}>
                        <td colSpan={999} className="px-4 sm:px-0 pb-4 pt-3">

                          {/* Scorecard section */}
                          {availableRounds.length > 0 ? (
                            <div className="mb-4">
                              {/* Round selector tabs */}
                              <div className="flex gap-1.5 mb-3">
                                {[1, 2, 3, 4].map((period) => {
                                  const ls = p.linescores.find((l) => l.period === period && l.value !== undefined);
                                  if (!ls) return (
                                    <span key={period} className="px-2.5 py-1 rounded text-xs font-medium text-masters-ink-4 dark:text-masters-d-ink-4 border border-masters-border dark:border-masters-d-border cursor-not-allowed select-none">
                                      R{period}
                                    </span>
                                  );
                                  const isActive = selectedPeriod === period;
                                  return (
                                    <button
                                      key={period}
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setScorecardRound((prev) => ({ ...prev, [p.espnId]: period })); }}
                                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors focus:outline-none ${
                                        isActive
                                          ? 'bg-masters-green dark:bg-masters-d-green text-white'
                                          : 'text-masters-ink-2 dark:text-masters-d-ink-2 border border-masters-border dark:border-masters-d-border hover:bg-masters-hover dark:hover:bg-masters-d-hover'
                                      }`}
                                    >
                                      R{period}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Scorecard table */}
                              {selectedLs && (
                                <div className="overflow-x-auto">
                                  <table className="text-xs border-collapse rounded-lg overflow-hidden">
                                    <thead>
                                      <tr className="bg-masters-green dark:bg-masters-d-green text-white">
                                        <th className="px-3 py-1.5 text-left font-semibold w-16"> </th>
                                        <th className="px-4 py-1.5 text-center font-semibold">FRONT 9</th>
                                        <th className="px-4 py-1.5 text-center font-semibold">BACK 9</th>
                                        <th className="px-4 py-1.5 text-center font-semibold">TOTAL</th>
                                        <th className="px-4 py-1.5 text-center font-semibold">TO PAR</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr className="bg-masters-green/80 dark:bg-masters-d-green/80 text-white/90">
                                        <td className="px-3 py-1 text-left font-medium">Par</td>
                                        <td className="px-4 py-1 text-center tabular-nums">36</td>
                                        <td className="px-4 py-1 text-center tabular-nums">36</td>
                                        <td className="px-4 py-1 text-center tabular-nums font-semibold">72</td>
                                        <td className="px-4 py-1 text-center">—</td>
                                      </tr>
                                      <tr className="bg-masters-card dark:bg-masters-d-card border-t border-masters-border dark:border-masters-d-border">
                                        <td className="px-3 py-1.5 text-left font-semibold text-masters-ink dark:text-masters-d-ink">R{selectedLs.period}</td>
                                        <td className="px-4 py-1.5 text-center tabular-nums text-masters-ink-2 dark:text-masters-d-ink-2">
                                          {selectedLs.outScore ?? '—'}
                                        </td>
                                        <td className="px-4 py-1.5 text-center tabular-nums text-masters-ink-2 dark:text-masters-d-ink-2">
                                          {selectedLs.inScore ?? '—'}
                                        </td>
                                        <td className="px-4 py-1.5 text-center tabular-nums font-semibold text-masters-ink dark:text-masters-d-ink">
                                          {selectedLs.value != null ? Math.round(selectedLs.value) : '—'}
                                        </td>
                                        <td className={`px-4 py-1.5 text-center tabular-nums font-semibold ${
                                          selectedLs.displayValue && selectedLs.displayValue.startsWith('-')
                                            ? 'text-masters-red dark:text-masters-d-red'
                                            : selectedLs.displayValue === 'E'
                                            ? 'text-masters-ink dark:text-masters-d-ink'
                                            : 'text-masters-ink-3 dark:text-masters-d-ink-3'
                                        }`}>
                                          {selectedLs.displayValue ?? '—'}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-masters-ink-4 dark:text-masters-d-ink-4 mb-4">No round data yet</p>
                          )}

                          {/* Cut probability + EV */}
                          <div className="flex items-center gap-6 flex-wrap">
                            {hasCutProb && (
                              <div className="flex items-center gap-3">
                                <div className="text-center">
                                  <p className="text-[10px] text-masters-ink-3 dark:text-masters-d-ink-3 uppercase tracking-wider mb-0.5">Make Cut</p>
                                  <p className={`text-sm font-semibold tabular-nums ${cutColorClass(p.cutProbability)}`}>
                                    {(p.cutProbability * 100).toFixed(1)}%
                                  </p>
                                </div>
                                <div className="w-24 h-1.5 bg-masters-border dark:bg-masters-d-border rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      p.cutProbability >= 0.75 ? 'bg-masters-green dark:bg-masters-d-green' :
                                      p.cutProbability >= 0.50 ? 'bg-masters-gold dark:bg-masters-d-gold' :
                                      'bg-masters-red dark:bg-masters-d-red'
                                    }`}
                                    style={{ width: `${(p.cutProbability * 100).toFixed(0)}%` }}
                                  />
                                </div>
                                <div className="text-center">
                                  <p className="text-[10px] text-masters-ink-3 dark:text-masters-d-ink-3 uppercase tracking-wider mb-0.5">Miss Cut</p>
                                  <p className="text-sm font-semibold text-masters-ink-3 dark:text-masters-d-ink-3 tabular-nums">
                                    {((1 - p.cutProbability) * 100).toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                            )}

                            {p.oddsEV > 0 && (
                              <>
                                {hasCutProb && <div className="h-8 w-px bg-masters-border dark:bg-masters-d-border" />}
                                <div className="text-center">
                                  <p className="text-[10px] text-masters-ink-3 dark:text-masters-d-ink-3 uppercase tracking-wider mb-0.5">EV $</p>
                                  <p className="text-sm font-semibold text-masters-gold dark:text-masters-d-gold tabular-nums">{p.oddsEVDisplay}</p>
                                </div>
                              </>
                            )}
                          </div>

                        </td>
                      </tr>
                    );
                  })()}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-masters-ink-4 dark:text-masters-d-ink-4 mt-4 text-center">
        {sorted.length} players · Cut % via Harville simulation from live odds
      </p>
    </div>
  );
}
