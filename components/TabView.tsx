'use client';

import { useState } from 'react';
import type { ESPNCompetitor, ESPNTournamentStatus, ParticipantScore, Tier, Player } from '@/lib/types';
import Leaderboard from './Leaderboard';
import PlayersTab from './PlayersTab';

type Tab = 'standings' | 'players';

const TABS: { id: Tab; label: string }[] = [
  { id: 'standings', label: 'Standings' },
  { id: 'players', label: 'Players' },
];

export default function TabView({
  standings,
  competitors,
  players,
  tiers,
  status,
  evRecord,
  cutProbRecord,
}: {
  standings: ParticipantScore[];
  competitors: ESPNCompetitor[];
  players: Player[];
  tiers: Tier[];
  status: ESPNTournamentStatus;
  evRecord: Record<string, number>;
  cutProbRecord: Record<string, number>;
}) {
  const [activeTab, setActiveTab] = useState<Tab>('standings');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 px-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === 'standings' && (
          <>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              {standings.length} participants
            </p>
            <Leaderboard standings={standings} status={status} />
          </>
        )}
        {activeTab === 'players' && (
          <>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              {competitors.length} players in the field
            </p>
            <PlayersTab
              competitors={competitors}
              players={players}
              tiers={tiers}
              standings={standings}
              status={status}
              evRecord={evRecord}
              cutProbRecord={cutProbRecord}
            />
          </>
        )}
      </div>
    </div>
  );
}
