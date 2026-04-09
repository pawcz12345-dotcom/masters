'use client';

import { useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { ESPNTournamentStatus, RoundData, Tier, Player } from '@/lib/types';
import Leaderboard from './Leaderboard';
import PlayersTab from './PlayersTab';

type ContentTab = 'standings' | 'players';

const CONTENT_TABS: { id: ContentTab; label: string }[] = [
  { id: 'standings', label: 'Standings' },
  { id: 'players', label: 'Players' },
];

const ALL_ROUNDS = [
  { round: 0, label: 'Pre-Tournament' },
  { round: 1, label: 'R1' },
  { round: 2, label: 'R2' },
  { round: 3, label: 'R3' },
  { round: 4, label: 'R4' },
  { round: 99, label: 'Live' },
];

export default function TabView({
  liveRound, snapshotRounds, currentStatus, players, tiers,
}: {
  liveRound: RoundData;
  snapshotRounds: RoundData[];
  currentStatus: ESPNTournamentStatus;
  players: Player[];
  tiers: Tier[];
}) {
  const isPreTournament = currentStatus.state === 'pre';

  const availableRounds = new Set<number>([
    0,
    ...snapshotRounds.map((r) => r.round),
    ...(isPreTournament ? [] : [99]),
  ]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  function parseRoundParam(): number {
    const raw = searchParams.get('round');
    if (raw === null) return isPreTournament ? 0 : 99;
    const n = parseInt(raw, 10);
    return availableRounds.has(n) ? n : (isPreTournament ? 0 : 99);
  }

  function parseTabParam(): ContentTab {
    return searchParams.get('tab') === 'players' ? 'players' : 'standings';
  }

  const [activeRound, setActiveRound] = useState<number>(parseRoundParam);
  const [contentTab, setContentTab] = useState<ContentTab>(parseTabParam);

  function updateRound(round: number) {
    setActiveRound(round);
    const params = new URLSearchParams(searchParams.toString());
    params.set('round', String(round));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function updateTab(tab: ContentTab) {
    setContentTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const roundData =
    activeRound === 99
      ? liveRound
      : snapshotRounds.find((r) => r.round === activeRound) ?? liveRound;

  // True when viewing a snapshot round that exists
  const hasSnapshot = activeRound === 99 || snapshotRounds.some((r) => r.round === activeRound);

  const isLive = activeRound === 99;

  return (
    <div className="bg-masters-card dark:bg-masters-d-card rounded-xl border border-masters-border dark:border-masters-d-border overflow-hidden shadow-sm">

      {/* Round selector */}
      <div className="border-b border-masters-border dark:border-masters-d-border overflow-x-auto">
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-4 pb-3 min-w-max">
          {ALL_ROUNDS.map(({ round, label }) => {
            const available = availableRounds.has(round);
            const isActive = activeRound === round;
            const isLiveTab = round === 99;

            if (!available) {
              return (
                <div
                  key={round}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-masters-ink-4 dark:text-masters-d-ink-4 cursor-not-allowed select-none flex items-center gap-1"
                  title="Not yet available"
                >
                  {label}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              );
            }

            return (
              <button
                key={round}
                onClick={() => updateRound(round)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-masters-green dark:focus-visible:ring-masters-d-green ${
                  isActive
                    ? isLiveTab
                      ? 'bg-masters-green dark:bg-masters-d-green text-white'
                      : 'bg-masters-ink dark:bg-masters-d-ink text-white dark:text-masters-d-bg'
                    : 'text-masters-ink-2 dark:text-masters-d-ink-2 hover:text-masters-ink dark:hover:text-masters-d-ink hover:bg-masters-hover dark:hover:bg-masters-d-hover'
                }`}
              >
                {isLiveTab && currentStatus.state === 'in' && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white/70' : 'bg-masters-green dark:bg-masters-d-green'} animate-pulse`} />
                )}
                {label}
              </button>
            );
          })}

          {!isLive && roundData.savedAt && (
            <span className="ml-4 text-[10px] text-masters-ink-3 dark:text-masters-d-ink-3 whitespace-nowrap">
              Snapshot: {new Date(roundData.savedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
              })}
            </span>
          )}
        </div>
      </div>

      {/* Content tabs */}
      <div className="flex border-b border-masters-border dark:border-masters-d-border px-4 sm:px-6">
        {CONTENT_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => updateTab(tab.id)}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors -mb-px focus:outline-none focus-visible:ring-2 focus-visible:ring-masters-green dark:focus-visible:ring-masters-d-green ${
              contentTab === tab.id
                ? 'border-masters-green dark:border-masters-d-green text-masters-green dark:text-masters-d-green'
                : 'border-transparent text-masters-ink-3 dark:text-masters-d-ink-3 hover:text-masters-ink dark:hover:text-masters-d-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {contentTab === 'standings' && (
          <>
            <p className="text-xs font-semibold text-masters-ink-3 dark:text-masters-d-ink-3 uppercase tracking-wider mb-4">
              {roundData.standings.length} participants
            </p>
            <Leaderboard standings={roundData.standings} status={roundData.status} />
          </>
        )}
        {contentTab === 'players' && (
          <>
            <p className="text-xs font-semibold text-masters-ink-3 dark:text-masters-d-ink-3 uppercase tracking-wider mb-4">
              {roundData.competitors.length} players in the field
            </p>
            <PlayersTab
              competitors={roundData.competitors}
              players={players}
              tiers={tiers}
              standings={roundData.standings}
              status={roundData.status}
              evRecord={roundData.evRecord}
              cutProbRecord={roundData.cutProbRecord}
            />
          </>
        )}
      </div>
    </div>
  );
}
