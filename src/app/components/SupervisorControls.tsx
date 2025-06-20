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
  // isEventsPaneExpanded: boolean; // Removed
  // setIsEventsPaneExpanded: (expanded: boolean) => void; // Removed
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (enabled: boolean) => void;
  supervisorSdkScenarioMap: Record<string, SupervisorSdkScenario>;
  editableMetaprompt: string;
  setEditableMetaprompt: (text: string) => void;
  onResetMetaprompt: () => void;
  editableAgentSpecificTexts: EditableAgentTexts | null;
  setEditableAgentSpecificTexts: (texts: EditableAgentTexts | null) => void;
  onResetAgentSpecificTexts: () => void;
  allConversationIds: string[];
  selectedConversationId: string | null;
  onSelectConversationId: (id: string | null) => void;
  agentTools: SimpleToolDefinition[] | null; // Added new prop
}

// Define EditableAgentTexts interface if not already globally available
// For this component, it might be better to import it or assume it's passed correctly.
interface EditableAgentTexts {
  greeting?: string;
  instructions?: string;
}

// Define SimpleToolDefinition locally if not imported
interface SimpleToolDefinition {
  name: string;
  description?: string;
  parameters?: object; // JSON schema
}

const SupervisorControls: React.FC<SupervisorControlsProps> = ({
  sessionStatus,
  onToggleConnection,
  currentAgentSetKey,
  handleAgentScenarioChange,
  selectedAgentName,
  handleSelectedAgentNameChange,
  currentAgentConfigSet,
  // isEventsPaneExpanded, // Removed
  // setIsEventsPaneExpanded, // Removed
  isAudioPlaybackEnabled,
  setIsAudioPlaybackEnabled,
  supervisorSdkScenarioMap,
  editableMetaprompt,
  setEditableMetaprompt,
  onResetMetaprompt,
  editableAgentSpecificTexts,
  setEditableAgentSpecificTexts,
  onResetAgentSpecificTexts,
  // selectedAgentName, // This was the duplicate, now removed. The actual prop is destructured below - it's just 'selectedAgentName'
  allConversationIds,
  selectedConversationId,
  onSelectConversationId,
  agentTools, // Added new prop
}) => {
  return (
    <div className="bg-gray-700 text-white p-3 flex flex-col gap-4"> {/* Changed to flex-col for better layout with textarea */}
      <div className="flex flex-wrap items-center justify-between gap-4"> {/* Original controls row */}
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
        {/* "Show Logs" toggle removed */}
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

    {/* Metaprompt Editing Section */}
    <div className="w-full mt-2 p-3 bg-gray-600 rounded-md shadow"> {/* Added shadow for better separation */}
      <h3 className="text-md font-semibold mb-2 text-white">Edit Global Metaprompt (Applied on next Connect)</h3>
      <textarea
        value={editableMetaprompt}
        onChange={(e) => setEditableMetaprompt(e.target.value)}
        rows={8} // Adjusted rows for typical screen space
        className="w-full p-2 rounded-md text-sm text-gray-900 bg-gray-100 border border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder="Metaprompt content..."
      />
      <div className="mt-2 flex justify-end"> {/* Aligned buttons to the right */}
        <button
          onClick={onResetMetaprompt}
          className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-1.5 px-4 rounded-md text-sm" // Adjusted padding
        >
          Reset Metaprompt
        </button>
        {/* Placeholder for Apply button - functionality to be fully integrated later */}
        {/* <button
          onClick={() => console.log("Apply Metaprompt clicked. Current content:", editableMetaprompt)}
          className="ml-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-1.5 px-4 rounded-md text-sm"
        >
          Apply for Next Session (Logs to Console)
        </button> */}
      </div>
    </div>

    {/* Agent-Specific Text Editing Section */}
    {editableAgentSpecificTexts && (
      <div className="w-full mt-1 p-3 bg-gray-600 rounded-md shadow border border-gray-500"> {/* Slightly different bg or border for visual grouping */}
        <h4 className="text-md font-semibold mb-2 text-white">Edit Texts for Agent: <span className="font-bold text-cyan-300">{selectedAgentName}</span> (Applied on next Connect)</h4>

        {/* Greeting Editor */}
        {typeof editableAgentSpecificTexts.greeting === 'string' && (
          <div className="mb-3">
            <label htmlFor="agent-greeting-editor" className="block text-sm font-medium text-gray-300 mb-1">Greeting:</label>
            <textarea
              id="agent-greeting-editor"
              value={editableAgentSpecificTexts.greeting}
              onChange={(e) =>
                setEditableAgentSpecificTexts({
                  ...editableAgentSpecificTexts,
                  greeting: e.target.value
                })
              }
              rows={2}
              className="w-full p-1.5 rounded-md text-sm text-gray-900 bg-gray-100 border border-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              placeholder="Agent greeting..."
            />
          </div>
        )}

        {/* Instructions Editor */}
        {typeof editableAgentSpecificTexts.instructions === 'string' && (
          <div className="mb-3">
            <label htmlFor="agent-instructions-editor" className="block text-sm font-medium text-gray-300 mb-1">Instructions:</label>
            <textarea
              id="agent-instructions-editor"
              value={editableAgentSpecificTexts.instructions}
              onChange={(e) =>
                setEditableAgentSpecificTexts({
                  ...editableAgentSpecificTexts,
                  instructions: e.target.value
                })
              }
              rows={5}
              className="w-full p-1.5 rounded-md text-sm text-gray-900 bg-gray-100 border border-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              placeholder="Agent instructions..."
            />
          </div>
        )}

        { (typeof editableAgentSpecificTexts.greeting !== 'undefined' || typeof editableAgentSpecificTexts.instructions !== 'undefined') &&
          <div className="mt-2 flex justify-end">
            <button
              onClick={onResetAgentSpecificTexts}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-1.5 px-4 rounded-md text-sm"
            >
              Reset Agent Texts
            </button>
          </div>
        }
      </div>
    )}

    {/* Conversation ID Filter Section */}
    {allConversationIds.length > 0 && (
      <div className="w-full mt-1 p-3 bg-gray-600 rounded-md shadow border border-gray-500">
        <label htmlFor="convo-filter-select" className="block text-sm font-medium text-gray-300 mb-1">Filter Logs by Conversation ID:</label>
        <select
          id="convo-filter-select"
          value={selectedConversationId || ""}
          onChange={(e) => onSelectConversationId(e.target.value === "" ? null : e.target.value)}
          className="appearance-none w-full md:w-auto border border-gray-500 rounded-md text-sm px-3 py-2 pr-8 cursor-pointer font-normal bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Conversations</option>
          {allConversationIds.map(id => (
            <option key={id} value={id}>{id.substring(0, 8)}...</option>
          ))}
        </select>
      </div>
    )}

    {/* Agent Tools Display Section */}
    {agentTools && agentTools.length > 0 && (
      <div className="w-full mt-3 p-3 bg-gray-550 rounded-md border border-gray-500">
        <h4 className="text-md font-semibold mb-2 text-white">Tools for Agent: <span className="font-bold text-purple-300">{selectedAgentName}</span></h4>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar"> {/* Added custom-scrollbar if defined */}
          {agentTools.map((tool, index) => (
            <div key={index} className="p-2.5 bg-gray-600 rounded-md shadow">
              <p className="text-sm font-semibold text-teal-300 break-all">{tool.name}</p>
              {tool.description && <p className="text-xs text-gray-200 mt-1">{tool.description}</p>}
              {tool.parameters && (
                <div className="mt-1.5">
                  <p className="text-xs font-medium text-gray-300 mb-0.5">Parameters:</p>
                  <pre className="text-xs text-gray-100 bg-gray-700 p-2 rounded-sm whitespace-pre-wrap break-all custom-scrollbar-small">
                    {JSON.stringify(tool.parameters, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
  );
};

export default SupervisorControls;
