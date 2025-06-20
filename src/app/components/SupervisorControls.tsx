"use client";
import React from "react";
import Image from "next/image";
import { SessionStatus } from "@/app/types";
import type { RealtimeAgent } from '@openai/agents/realtime';

// Assuming supervisorSdkScenarioMap is defined in a shared config or passed as a prop.
// For this example, let's assume it's passed as a prop.
interface SupervisorSdkScenario {
  scenario: RealtimeAgent[];
  companyName: string;
  displayName: string;
}

interface SupervisorControlsProps {
  sessionStatus: SessionStatus;
  onToggleConnection: () => void;
  currentAgentSetKey: string;
  handleAgentScenarioChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  selectedAgentName: string;
  handleSelectedAgentNameChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  currentAgentConfigSet: RealtimeAgent[] | null;
  isEventsPaneExpanded: boolean;
  setIsEventsPaneExpanded: (expanded: boolean) => void;
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (enabled: boolean) => void;
  supervisorSdkScenarioMap: Record<string, SupervisorSdkScenario>;
}

const SupervisorControls: React.FC<SupervisorControlsProps> = ({
  sessionStatus,
  onToggleConnection,
  currentAgentSetKey,
  handleAgentScenarioChange,
  selectedAgentName,
  handleSelectedAgentNameChange,
  currentAgentConfigSet,
  isEventsPaneExpanded,
  setIsEventsPaneExpanded,
  isAudioPlaybackEnabled,
  setIsAudioPlaybackEnabled,
  supervisorSdkScenarioMap,
}) => {
  return (
    <div className="bg-gray-700 text-white p-3 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <span className="mr-3">Status: <span className={`font-semibold ${sessionStatus === "CONNECTED" ? "text-green-300" : "text-yellow-300"}`}>{sessionStatus}</span></span>
        <button
          onClick={onToggleConnection}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md text-sm"
        >
          {sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING" ? "Disconnect Session" : "Connect Session"}
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div>
          <label htmlFor="scenario-select" className="block text-sm font-medium text-gray-300 mb-1">Scenario</label>
          <div className="relative">
            <select
              id="scenario-select"
              value={currentAgentSetKey}
              onChange={handleAgentScenarioChange}
              className="appearance-none border border-gray-500 rounded-md text-sm px-3 py-2 pr-8 cursor-pointer font-normal bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.entries(supervisorSdkScenarioMap).map(([key, { displayName }]) => (
                <option key={key} value={key}>
                  {displayName}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
            </div>
          </div>
        </div>

        {currentAgentConfigSet && (
          <div>
            <label htmlFor="agent-select" className="block text-sm font-medium text-gray-300 mb-1">Agent</label>
            <div className="relative">
              <select
                id="agent-select"
                value={selectedAgentName}
                onChange={handleSelectedAgentNameChange}
                className="appearance-none border border-gray-500 rounded-md text-sm px-3 py-2 pr-8 cursor-pointer font-normal bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {currentAgentConfigSet.map((agent) => (
                  <option key={agent.name} value={agent.name}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400">
               <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isEventsPaneExpanded}
            onChange={(e) => setIsEventsPaneExpanded(e.target.checked)}
            className="form-checkbox h-4 w-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-gray-300">Show Logs</span>
        </label>
        <label className="flex items-center text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isAudioPlaybackEnabled}
            onChange={(e) => setIsAudioPlaybackEnabled(e.target.checked)}
            className="form-checkbox h-4 w-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-gray-300">Enable Audio</span>
        </label>
      </div>
    </div>
  );
};

export default SupervisorControls;
