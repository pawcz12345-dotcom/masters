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

// All possible rounds in display order
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
  const [activeRound, setActiveRound] = useState<number>(99); // default: Live
  const [contentTab, setContentTab] = useState<ContentTab>('standings');

  // Pre (0) and Live (99) are always available; R1-R4 only when snapshot exists
  const availableRounds = new Set<number>([
    0,   // Pre always available
    ...snapshotRounds.map((r) => r.round),
    99,  // Live always available
  ]);

  // Get data for currently selected round
  // Pre with no snapshot → fall back to live data
  const roundData =
    activeRound === 99
      ? liveRound
      : snapshotRounds.find((r) => r.round === activeRound) ?? liveRound;

  const isLive = activeRound === 99;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">

      {/* Round selector */}
      <div className="flex items-center gap-1 px-6 pt-4 pb-0 flex-wrap border-b border-gray-100">
        {ALL_ROUNDS.map(({ round, label }) => {
          const available = availableRounds.has(round);
          const isActive = activeRound === round;
          const isLiveTab = round === 99;

          if (!available) {
            // Greyed out — round hasn't happened yet
            return (
              <div
                key={round}
                className="px-3 py-1.5 mb-3 rounded-full text-xs font-medium text-gray-300 cursor-not-allowed select-none flex items-center gap-1"
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
              className={`px-3 py-1.5 mb-3 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                isActive
                  ? isLiveTab
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-white'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              {isLiveTab && currentStatus.state === 'in' && (
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-300' : 'bg-green-500'} animate-pulse`} />
              )}
              {label}
              {!isLiveTab && round > 0 && available && !isActive && (
                <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
            </button>
          );
        })}

        {/* Spacer + snapshot timestamp */}
        <div className="ml-auto mb-3">
          {!isLive && roundData.savedAt && (
            <span className="text-[10px] text-gray-400">
              Snapshot: {new Date(roundData.savedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
              })}
            </span>
          )}
        </div>
      </div>

      {/* Content tabs (Standings / Players) */}
      <div className="flex border-b border-gray-200 px-6">
        {CONTENT_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setContentTab(tab.id)}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors -mb-px ${
              contentTab === tab.id
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {contentTab === 'standings' && (
          <>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              {roundData.standings.length} participants
            </p>
            <Leaderboard standings={roundData.standings} status={roundData.status} />
          </>
        )}
        {contentTab === 'players' && (
          <>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
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
