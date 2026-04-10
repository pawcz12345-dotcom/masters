'use client';

import { useState, useMemo, useCallback } from 'react';
import type { ESPNCompetitor, ESPNTournamentStatus, ParticipantScore, Tier, Player } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

// --- Scorecard types ---
interface HoleScore {
  period: number;   // hole number 1–18
  value: number;
  displayValue: string;
  par: number;
  scoreType: { name: string };
}

interface ScorecardRound {
  period: number;   // round number 1–4
  value: number | null;
  displayValue: string | null;
  outScore?: number;
  inScore?: number;
  holes: HoleScore[];
}

// --- Hole score cell with golf markings ---
function HoleCell({ hole }: { hole: HoleScore | undefined }) {
  if (!hole) {
    return <span className="text-masters-ink-4 dark:text-masters-d-ink-4">—</span>;
  }

  const type = hole.scoreType.name;
  const relToPar = hole.value - hole.par;
  const label = hole.displayValue;

  // Under par → red; over par → dark ink; even → default
  const textColor =
    relToPar < 0 ? 'text-masters-red dark:text-masters-d-red' :
    relToPar > 0 ? 'text-masters-ink dark:text-masters-d-ink' :
    'text-masters-ink-2 dark:text-masters-d-ink-2';

  const base = `inline-flex items-center justify-center w-6 h-6 text-[11px] font-semibold tabular-nums ${textColor}`;

  if (type === 'EAGLE' || type === 'DOUBLE_EAGLE' || type === 'ALBATROSS') {
    return (
      <span className={`${base} rounded-full border-2 border-masters-red dark:border-masters-d-red`}
        style={{ boxShadow: '0 0 0 2px var(--color-masters-red, #b91c1c), 0 0 0 4px transparent, 0 0 0 5px var(--color-masters-red, #b91c1c)' }}
        title={type.replace(/_/g, ' ')}>
        {label}
      </span>
    );
  }
  if (type === 'BIRDIE') {
    return (
      <span className={`${base} rounded-full border-2 border-masters-red dark:border-masters-d-red`} title="Birdie">
        {label}
      </span>
    );
  }
  if (type === 'DOUBLE_BOGEY') {
    return (
      <span className={`${base} border-2 border-masters-ink dark:border-masters-d-ink`}
        style={{ outline: '2px solid', outlineOffset: '2px', outlineColor: 'currentColor' }}
        title="Double Bogey">
        {label}
      </span>
    );
  }
  if (type === 'BOGEY') {
    return (
      <span className={`${base} border-2 border-masters-ink dark:border-masters-d-ink`} title="Bogey">
        {label}
      </span>
    );
  }
  if (type === 'TRIPLE_BOGEY' || relToPar >= 3) {
    return (
      <span className={`${base} border-2 border-masters-ink dark:border-masters-d-ink`}
        style={{ outline: '2px solid', outlineOffset: '3px', outlineColor: 'currentColor', outlineStyle: 'double' }}
        title={type.replace(/_/g, ' ')}>
        {label}
      </span>
    );
  }
  // PAR
  return <span className={`${base}`}>{label}</span>;
}

function Scorecard({ rounds }: { rounds: ScorecardRound[] }) {
  const playedRounds = rounds.filter((r) => r.value !== null && r.holes.length > 0);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(
    playedRounds.length > 0 ? playedRounds[playedRounds.length - 1].period : 1
  );

  const round = playedRounds.find((r) => r.period === selectedPeriod) ?? playedRounds[0];
  if (!round) return <p className="text-xs text-masters-ink-4 dark:text-masters-d-ink-4">No round data</p>;

  const front = round.holes.filter((h) => h.period <= 9);
  const back = round.holes.filter((h) => h.period > 9);
  const frontPar = front.reduce((s, h) => s + h.par, 0);
  const backPar = back.reduce((s, h) => s + h.par, 0);
  const frontScore = front.reduce((s, h) => s + h.value, 0);
  const backScore = back.reduce((s, h) => s + h.value, 0);

  const scoreToPar = (score: number, par: number) => {
    const diff = score - par;
    if (diff === 0) return 'E';
    return diff > 0 ? `+${diff}` : `${diff}`;
  };
  const toParColor = (score: number, par: number) => {
    const diff = score - par;
    return diff < 0 ? 'text-masters-red dark:text-masters-d-red' :
           diff > 0 ? 'text-masters-ink-3 dark:text-masters-d-ink-3' :
           'text-masters-ink dark:text-masters-d-ink';
  };

  const holeHeaderClass = 'text-center text-[10px] font-semibold text-white/80 px-1.5 py-1.5 min-w-[28px]';
  const subtotalHeaderClass = 'text-center text-[10px] font-bold text-white px-2 py-1.5 min-w-[36px] bg-masters-green/60 dark:bg-masters-d-green/60';
  const parCellClass = 'text-center text-[11px] text-masters-ink-2 dark:text-masters-d-ink-2 px-1 py-1';
  const subtotalParClass = 'text-center text-[11px] font-semibold text-masters-ink dark:text-masters-d-ink px-2 py-1 bg-masters-hover dark:bg-masters-d-hover';
  const scoreCellClass = 'text-center px-1 py-1.5';
  const subtotalScoreClass = 'text-center px-2 py-1.5 bg-masters-hover dark:bg-masters-d-hover';

  return (
    <div>
      {/* Round tabs */}
      <div className="flex gap-1.5 mb-3">
        {[1, 2, 3, 4].map((period) => {
          const r = rounds.find((x) => x.period === period);
          const available = r && r.value !== null && r.holes.length > 0;
          if (!available) {
            return (
              <span key={period} className="px-2.5 py-1 rounded text-xs font-medium text-masters-ink-4 dark:text-masters-d-ink-4 border border-masters-border dark:border-masters-d-border cursor-not-allowed select-none">
                R{period}
              </span>
            );
          }
          const isActive = selectedPeriod === period;
          return (
            <button key={period} type="button"
              onClick={() => setSelectedPeriod(period)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors focus:outline-none ${
                isActive
                  ? 'bg-masters-green dark:bg-masters-d-green text-white'
                  : 'text-masters-ink-2 dark:text-masters-d-ink-2 border border-masters-border dark:border-masters-d-border hover:bg-masters-hover dark:hover:bg-masters-d-hover'
              }`}>
              R{period}
            </button>
          );
        })}
      </div>

      {/* Scorecard table */}
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs" style={{ minWidth: 'max-content' }}>
          <thead>
            <tr className="bg-masters-green dark:bg-masters-d-green">
              <th className="text-left text-[10px] font-semibold text-white/80 px-2 py-1.5 min-w-[40px]">Hole</th>
              {[1,2,3,4,5,6,7,8,9].map((h) => <th key={h} className={holeHeaderClass}>{h}</th>)}
              <th className={subtotalHeaderClass}>OUT</th>
              {[10,11,12,13,14,15,16,17,18].map((h) => <th key={h} className={holeHeaderClass}>{h}</th>)}
              <th className={subtotalHeaderClass}>IN</th>
              <th className={subtotalHeaderClass}>TOT</th>
            </tr>
          </thead>
          <tbody>
            {/* Par row */}
            <tr className="border-b border-masters-border/50 dark:border-masters-d-border/50 bg-masters-green/10 dark:bg-masters-d-green/10">
              <td className="text-left text-[11px] font-semibold text-masters-ink dark:text-masters-d-ink px-2 py-1">Par</td>
              {front.map((h) => <td key={h.period} className={parCellClass}>{h.par}</td>)}
              {front.length < 9 && Array.from({ length: 9 - front.length }).map((_, i) => <td key={`fp${i}`} className={parCellClass}>—</td>)}
              <td className={subtotalParClass}>{frontPar}</td>
              {back.map((h) => <td key={h.period} className={parCellClass}>{h.par}</td>)}
              {back.length < 9 && Array.from({ length: 9 - back.length }).map((_, i) => <td key={`bp${i}`} className={parCellClass}>—</td>)}
              <td className={subtotalParClass}>{backPar}</td>
              <td className={subtotalParClass}>{frontPar + backPar}</td>
            </tr>

            {/* Score row */}
            <tr className="bg-masters-card dark:bg-masters-d-card">
              <td className="text-left text-[11px] font-semibold text-masters-ink dark:text-masters-d-ink px-2 py-1.5">R{round.period}</td>
              {[...Array(9)].map((_, i) => (
                <td key={i} className={scoreCellClass}>
                  <div className="flex justify-center">
                    <HoleCell hole={front[i]} />
                  </div>
                </td>
              ))}
              <td className={subtotalScoreClass}>
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-masters-ink dark:text-masters-d-ink tabular-nums">{frontScore || '—'}</span>
                  <span className={`text-[9px] tabular-nums ${front.length > 0 ? toParColor(frontScore, frontPar) : ''}`}>
                    {front.length > 0 ? scoreToPar(frontScore, frontPar) : ''}
                  </span>
                </div>
              </td>
              {[...Array(9)].map((_, i) => (
                <td key={i} className={scoreCellClass}>
                  <div className="flex justify-center">
                    <HoleCell hole={back[i]} />
                  </div>
                </td>
              ))}
              <td className={subtotalScoreClass}>
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-masters-ink dark:text-masters-d-ink tabular-nums">{backScore || '—'}</span>
                  <span className={`text-[9px] tabular-nums ${back.length > 0 ? toParColor(backScore, backPar) : ''}`}>
                    {back.length > 0 ? scoreToPar(backScore, backPar) : ''}
                  </span>
                </div>
              </td>
              <td className={subtotalScoreClass}>
                <div className="flex flex-col items-center">
                  <span className="font-bold text-masters-ink dark:text-masters-d-ink tabular-nums">{round.value != null ? Math.round(round.value) : '—'}</span>
                  <span className={`text-[9px] tabular-nums ${round.displayValue ? (
                    round.displayValue.startsWith('-') ? 'text-masters-red dark:text-masters-d-red' :
                    round.displayValue === 'E' ? 'text-masters-ink dark:text-masters-d-ink' :
                    'text-masters-ink-3 dark:text-masters-d-ink-3'
                  ) : ''}`}>
                    {round.displayValue ?? ''}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
  const [scorecardCache, setScorecardCache] = useState<Record<string, ScorecardRound[]>>({});
  const [scorecardLoading, setScorecardLoading] = useState<Set<string>>(new Set());

  const fetchScorecard = useCallback(async (espnId: string) => {
    if (scorecardCache[espnId] || scorecardLoading.has(espnId)) return;
    setScorecardLoading((prev) => new Set(prev).add(espnId));
    try {
      const res = await fetch(`/api/scorecard/${espnId}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const rounds: ScorecardRound[] = (data.items ?? []).map((item: {
        period: number; value?: number; displayValue?: string;
        outScore?: number; inScore?: number;
        linescores?: Array<{ period: number; value: number; displayValue: string; par: number; scoreType: { name: string } }>;
      }) => ({
        period: item.period,
        value: item.value ?? null,
        displayValue: item.displayValue ?? null,
        outScore: item.outScore,
        inScore: item.inScore,
        holes: (item.linescores ?? []).map((h) => ({
          period: h.period,
          value: h.value,
          displayValue: h.displayValue,
          par: h.par,
          scoreType: h.scoreType,
        })),
      }));
      setScorecardCache((prev) => ({ ...prev, [espnId]: rounds }));
    } catch {
      setScorecardCache((prev) => ({ ...prev, [espnId]: [] }));
    } finally {
      setScorecardLoading((prev) => { const s = new Set(prev); s.delete(espnId); return s; });
    }
  }, [scorecardCache, scorecardLoading]);

  function toggleExpand(espnId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(espnId)) {
        next.delete(espnId);
      } else {
        next.add(espnId);
        fetchScorecard(espnId);
      }
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
                  {isExpanded && (
                    <tr key={`${p.espnId}-exp`} className={`border-b border-masters-border dark:border-masters-d-border ${inPool ? 'bg-masters-green/5 dark:bg-masters-d-green/5' : 'bg-masters-hover/60 dark:bg-masters-d-hover/60'}`}>
                      <td colSpan={999} className="px-4 sm:px-0 pb-4 pt-3">

                        {/* Hole-by-hole scorecard */}
                        <div className="mb-4" onClick={(e) => e.stopPropagation()}>
                          {scorecardLoading.has(p.espnId) ? (
                            <p className="text-xs text-masters-ink-4 dark:text-masters-d-ink-4">Loading scorecard…</p>
                          ) : scorecardCache[p.espnId] ? (
                            <Scorecard rounds={scorecardCache[p.espnId]} />
                          ) : (
                            <p className="text-xs text-masters-ink-4 dark:text-masters-d-ink-4">No scorecard available</p>
                          )}
                        </div>

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
                  )}
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
