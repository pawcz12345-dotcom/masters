'use client';

import { useState } from 'react';
import type { ESPNTournamentStatus, RoundData, Tier, Player } from '@/lib/types';
import Leaderboard from './Leaderboard';
import PlayersTab from './PlayersTab';

type ContentTab = 'standings' | 'players';

const CONTENT_TABS: { id: ContentTab; label: string }[] = [
  { id: 'standings', label: 'Standings' },
  { id: 'players', label: 'Players' },
];

const ALL_ROUNDS = [
  { round: 0, label: 'Pre' },
  { round: 1, label: 'R1' },
  { round: 2, label: 'R2' },
  { round: 3, label: 'R3' },
  { round: 4, label: 'R4' },
  { round: 99, label: 'Live' },
];

export default function TabView({
  liveRound,
  snapshotRounds,
  currentStatus,
  players,
  tiers,
}: {
  liveRound: RoundData;
  snapshotRounds: RoundData[];
  currentStatus: ESPNTournamentStatus;
  players: Player[];
  tiers: Tier[];
}) {
  const isPreTournament = currentStatus.state === 'pre';
  const [activeRound, setActiveRound] = useState<number>(isPreTournament ? 0 : 99);
  const [contentTab, setContentTab] = useState<ContentTab>('standings');

  const availableRounds = new Set<number>([
    0,
    ...snapshotRounds.map((r) => r.round),
    ...(isPreTournament ? [] : [99]),
  ]);

  const roundData =
    activeRound === 99
      ? liveRound
      : snapshotRounds.find((r) => r.round === activeRound) ?? liveRound;

  const isLive = activeRound === 99;

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700/50 overflow-hidden">

      {/* Round selector */}
      <div className="flex items-center gap-1 px-4 sm:px-6 pt-4 pb-0 flex-wrap border-b border-slate-700/50">
        {ALL_ROUNDS.map(({ round, label }) => {
          const available = availableRounds.has(round);
          const isActive = activeRound === round;
          const isLiveTab = round === 99;

          if (!available) {
            return (
              <div
                key={round}
                className="px-3 py-1.5 mb-3 rounded-full text-xs font-medium text-slate-600 cursor-not-allowed select-none flex items-center gap-1"
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
              onClick={() => setActiveRound(round)}
              className={`px-3 py-1.5 mb-3 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                isActive
                  ? isLiveTab
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {isLiveTab && currentStatus.state === 'in' && (
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-300' : 'bg-emerald-500'} animate-pulse`} />
              )}
              {label}
              {!isLiveTab && round > 0 && available && !isActive && (
                <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
            </button>
          );
        })}

        {/* Spacer + snapshot timestamp */}
        <div className="ml-auto mb-3">
          {!isLive && roundData.savedAt && (
            <span className="text-[10px] text-slate-600">
              Snapshot: {new Date(roundData.savedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
              })}
            </span>
          )}
        </div>
      </div>

      {/* Content tabs */}
      <div className="flex border-b border-slate-700/50 px-4 sm:px-6">
        {CONTENT_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setContentTab(tab.id)}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors -mb-px ${
              contentTab === tab.id
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
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
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
              {roundData.standings.length} participants
            </p>
            <Leaderboard standings={roundData.standings} status={roundData.status} />
          </>
        )}
        {contentTab === 'players' && (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
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
