"use client";
import React from "react";
import { SessionStatus } from "@/app/types";
import type { RealtimeAgent } from '@openai/agents/realtime';
import Link from 'next/link'; // Import Link

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
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (enabled: boolean) => void;
  // This will now receive the possibly modified scenarios from SupervisorApp (which might load them from localStorage)
  supervisorSdkScenarioMap: Record<string, SupervisorSdkScenario>;
  allConversationIds: string[];
  selectedConversationId: string | null;
  onSelectConversationId: (id: string | null) => void;
  agentTools: SimpleToolDefinition[] | null; // For display only
}

// Define SimpleToolDefinition locally if not imported from a shared types file
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
  isAudioPlaybackEnabled,
  setIsAudioPlaybackEnabled,
  supervisorSdkScenarioMap, // Use this for scenario dropdown
  allConversationIds,
  selectedConversationId,
  onSelectConversationId,
  agentTools,
}) => {
  return (
    <div className="bg-gray-700 text-white p-3 flex flex-col gap-3 h-full overflow-y-auto custom-scrollbar">
      {/* Connection and Scenario Selection Controls */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-2 bg-gray-650 rounded-md shadow">
        <div className="flex items-center gap-3">
          <span className="text-sm">Status: <span className={`font-semibold ${sessionStatus === "CONNECTED" ? "text-green-300" : "text-yellow-300"}`}>{sessionStatus}</span></span>
          <button
            onClick={onToggleConnection}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1.5 px-3 rounded-md text-sm transition-colors"
          >
            {sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING" ? "Disconnect" : "Connect"}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <label htmlFor="scenario-select" className="sr-only">Scenario</label>
            <div className="relative">
              <select
                id="scenario-select"
                value={currentAgentSetKey}
                onChange={handleAgentScenarioChange}
                disabled={Object.keys(supervisorSdkScenarioMap).length === 0} // Use supervisorSdkScenarioMap here
                className="appearance-none border border-gray-500 rounded-md text-sm px-3 py-1.5 pr-7 cursor-pointer font-normal bg-gray-600 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
              >
                {Object.keys(supervisorSdkScenarioMap).length === 0 && <option value="">No Scenarios</option>}
                {Object.entries(supervisorSdkScenarioMap).map(([key, { displayName }]) => (
                  <option key={key} value={key}>
                    {displayName}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5 text-gray-400">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
              </div>
            </div>
          </div>

          {currentAgentConfigSet && currentAgentConfigSet.length > 0 && (
            <div>
              <label htmlFor="agent-select" className="sr-only">Agent</label>
              <div className="relative">
                <select
                  id="agent-select"
                  value={selectedAgentName}
                  onChange={handleSelectedAgentNameChange}
                  className="appearance-none border border-gray-500 rounded-md text-sm px-3 py-1.5 pr-7 cursor-pointer font-normal bg-gray-600 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  {currentAgentConfigSet.map((agent) => (
                    <option key={agent.name} value={agent.name}>
                      {agent.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1.5 text-gray-400">
                 <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                </div>
              </div>
            </div>
          )}
        </div>
        <label className="flex items-center text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isAudioPlaybackEnabled}
            onChange={(e) => setIsAudioPlaybackEnabled(e.target.checked)}
            className="form-checkbox h-3.5 w-3.5 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
          />
          <span className="ml-1.5 text-gray-300">Audio</span>
        </label>
      </div>
      <p className="text-xs text-gray-400 px-2 pb-1">
        Nota: El botón "Connect" inicia una sesión de monitoreo/prueba con la configuración de IA seleccionada. No es para conversar como cliente.
      </p>

      <div className="my-2 p-3 bg-gray-600 rounded-md shadow">
        <Link href="/supervisor/settings" className="text-blue-400 hover:text-blue-300 text-sm font-medium">
          Ir a Configuración (Editar Escenarios y Metaprompt Global) &rarr;
        </Link>
      </div>

      {/* Conversation ID Filter Section */}
      {allConversationIds.length > 0 && (
        <div className="w-full p-3 bg-gray-600 rounded-md shadow border border-gray-500">
          <label htmlFor="convo-filter-select" className="block text-sm font-medium text-gray-300 mb-1">Filtrar Logs por ID de Conversación:</label>
          <select
            id="convo-filter-select"
            value={selectedConversationId || ""}
            onChange={(e) => onSelectConversationId(e.target.value === "" ? null : e.target.value)}
            className="appearance-none w-full md:w-auto border border-gray-500 rounded-md text-sm px-3 py-1.5 pr-7 cursor-pointer font-normal bg-gray-600 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todas las Conversaciones</option>
            {allConversationIds.map(id => (
              <option key={id} value={id}>{id.substring(0, 8)}...</option>
            ))}
          </select>
        </div>
      )}

      {/* Agent Tools Display Section (Read-only) */}
      {agentTools && agentTools.length > 0 && (currentAgentConfigSet && currentAgentConfigSet.find(a => a.name === selectedAgentName)) && (
        <div className="w-full p-3 bg-gray-550 rounded-md border border-gray-500">
          <h4 className="text-md font-semibold mb-1.5 text-white">Herramientas para Agente: <span className="font-bold text-purple-300">{selectedAgentName}</span></h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {agentTools.map((tool, index) => (
              <div key={index} className="p-2 bg-gray-600 rounded-md shadow">
                <p className="text-sm font-semibold text-teal-300 break-all">{tool.name}</p>
                {tool.description && <p className="text-xs text-gray-200 mt-0.5">{tool.description}</p>}
                {tool.parameters && (
                  <div className="mt-1">
                    <p className="text-xs font-medium text-gray-300 mb-0.5">Parámetros:</p>
                    <pre className="text-xs text-gray-100 bg-gray-700 p-1.5 rounded-sm whitespace-pre-wrap break-all custom-scrollbar-small">
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
