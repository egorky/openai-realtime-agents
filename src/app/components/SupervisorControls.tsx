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
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (enabled: boolean) => void;
  supervisorSdkScenarioMap: Record<string, SupervisorSdkScenario>; // Note: This will be editableScenarios from parent
  editableMetaprompt: string;
  setEditableMetaprompt: (text: string) => void;
  onResetMetaprompt: () => void;
  editableAgentSpecificTexts: EditableAgentTexts | null;
  setEditableAgentSpecificTexts: (texts: EditableAgentTexts | null) => void;
  onResetAgentSpecificTexts: () => void;
  allConversationIds: string[];
  selectedConversationId: string | null;
  onSelectConversationId: (id: string | null) => void;
  agentTools: SimpleToolDefinition[] | null;
  // Props for scenario editing
  isEditingScenarioMode: boolean;
  setIsEditingScenarioMode: (editing: boolean) => void;
  editableScenarios: Record<string, SupervisorSdkScenario>;
  setEditableScenarios: React.Dispatch<React.SetStateAction<Record<string, SupervisorSdkScenario>>>;
  editingScenario: { key: string; data: SupervisorSdkScenario } | null;
  setEditingScenario: (scenario: { key: string; data: SupervisorSdkScenario } | null) => void;
}

interface EditableAgentTexts {
  greeting?: string;
  instructions?: string;
}

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
  // supervisorSdkScenarioMap, // This prop is effectively replaced by editableScenarios for display logic
  editableMetaprompt,
  setEditableMetaprompt,
  onResetMetaprompt,
  editableAgentSpecificTexts,
  setEditableAgentSpecificTexts,
  onResetAgentSpecificTexts,
  allConversationIds,
  selectedConversationId,
  onSelectConversationId,
  agentTools,
  // Scenario editing props
  isEditingScenarioMode,
  setIsEditingScenarioMode,
  editableScenarios, // Use this for displaying list of scenarios
  setEditableScenarios,
  editingScenario,
  setEditingScenario,
}) => {

  // Handler for initiating scenario editing
  const handleEditScenario = (scenarioKey: string) => {
    if (editableScenarios[scenarioKey]) {
      // Deep copy for editing to avoid modifying state directly
      setEditingScenario({ key: scenarioKey, data: JSON.parse(JSON.stringify(editableScenarios[scenarioKey])) });
      setIsEditingScenarioMode(true);
    }
  };

  // Handler for creating a new scenario
  const handleCreateNewScenario = () => {
    const newKey = `newScenario_${Date.now()}`; // Simple unique key
    const newScenarioData: SupervisorSdkScenario = {
      displayName: "New Scenario",
      companyName: "Default Company",
      scenario: [{ // Default agent structure
        name: "defaultAgent",
        instructions: "Default instructions",
        model: "gpt-3.5-turbo",
        voice: "alloy",
        tools: [],
      }],
    };
    setEditingScenario({ key: newKey, data: newScenarioData });
    setIsEditingScenarioMode(true);
  };

  // Handler for saving edited/created scenario
  const handleSaveScenario = () => {
    if (editingScenario) {
      setEditableScenarios(prev => ({
        ...prev,
        [editingScenario.key]: editingScenario.data,
      }));
      setIsEditingScenarioMode(false);
      setEditingScenario(null);
      // Consider if the main page needs to be informed to update its currentAgentSetKey if it was just edited/created
      // This might require an additional callback or careful state management in the parent.
    }
  };

  // Handler for deleting a scenario
  const handleDeleteScenario = (scenarioKey: string) => {
    if (window.confirm(`Are you sure you want to delete scenario "${editableScenarios[scenarioKey]?.displayName || scenarioKey}"? This action cannot be undone.`)) {
      setEditableScenarios(prev => {
        const newScenarios = { ...prev };
        delete newScenarios[scenarioKey];
        return newScenarios;
      });
      // If the deleted scenario was the active one, the parent component (SupervisorApp)
      // will need to handle resetting currentAgentSetKey, possibly to the first available scenario or a default.
      // This is typically handled by useEffect in the parent watching changes to editableScenarios.
      if (currentAgentSetKey === scenarioKey) {
        // Inform parent or rely on parent's useEffect to pick a new default
        // For now, just deleting. Parent should adapt.
      }
    }
  };

  // Component for editing a single agent within a scenario
  const AgentEditor: React.FC<{ agent: RealtimeAgent, onChange: (updatedAgent: RealtimeAgent) => void, onDelete: () => void }> = ({ agent, onChange, onDelete }) => {
    const [localAgent, setLocalAgent] = React.useState<RealtimeAgent>(agent);

    // Update local state and propagate changes when an input field changes
    const handleChange = (field: keyof RealtimeAgent, value: any) => {
      const updatedAgent = { ...localAgent, [field]: value };
      setLocalAgent(updatedAgent);
      onChange(updatedAgent); // Propagate change up to the editingScenario state
    };

    const handleToolsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      try {
        const toolsArray = JSON.parse(e.target.value);
        if (Array.isArray(toolsArray)) {
          handleChange('tools', toolsArray);
        } else {
          // Optionally provide user feedback for invalid JSON structure
          console.warn("Tools input is not a valid JSON array.");
        }
      } catch (error) {
        // Optionally provide user feedback for invalid JSON
        console.warn("Error parsing tools JSON:", error);
      }
    };

    return (
      <div className="p-3 bg-gray-500 rounded-md mt-2 space-y-2 border border-gray-400 shadow-sm">
        <input type="text" value={localAgent.name} onChange={e => handleChange('name', e.target.value)} placeholder="Agent Name" className="w-full p-1.5 rounded bg-gray-400 text-white placeholder-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500" />
        <textarea value={localAgent.instructions || ""} onChange={e => handleChange('instructions', e.target.value)} placeholder="Instructions" rows={3} className="w-full p-1.5 rounded bg-gray-400 text-white placeholder-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500" />
        <input type="text" value={localAgent.model || ""} onChange={e => handleChange('model', e.target.value)} placeholder="Model (e.g., gpt-4, gpt-3.5-turbo)" className="w-full p-1.5 rounded bg-gray-400 text-white placeholder-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500" />
        {/* Common voices: alloy, echo, fable, onyx, nova, shimmer */}
        <input type="text" value={localAgent.voice || ""} onChange={e => handleChange('voice', e.target.value)} placeholder="Voice (e.g., alloy, echo)" className="w-full p-1.5 rounded bg-gray-400 text-white placeholder-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500" />
        <div>
          <label className="block text-xs text-gray-300 mb-0.5">Tools (JSON array of FunctionTool):</label>
          <textarea
            value={JSON.stringify(localAgent.tools || [], null, 2)}
            onChange={handleToolsChange}
            placeholder='[{"type": "function", "function": {"name": "func_name", "description": "...", "parameters": {"type": "object", "properties": {}}}}]'
            rows={5}
            className="w-full p-1.5 rounded bg-gray-400 text-white placeholder-gray-300 font-mono text-xs focus:ring-blue-500 focus:border-blue-500 custom-scrollbar-small"
          />
        </div>
        <button onClick={onDelete} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors">Delete Agent</button>
      </div>
    );
  };

  // Scenario Editing UI
  if (isEditingScenarioMode && editingScenario) {
    return (
      <div className="bg-gray-700 text-white p-4 space-y-4 h-full overflow-y-auto custom-scrollbar">
        <h2 className="text-xl font-semibold sticky top-0 bg-gray-700 py-3 z-10 border-b border-gray-600 mb-4">
          {editingScenario.key.startsWith("newScenario") ? "Create New Scenario" : `Edit Scenario: ${editingScenario.data.displayName}`}
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Display Name:</label>
            <input
              type="text"
              value={editingScenario.data.displayName}
              onChange={(e) => setEditingScenario({ ...editingScenario, data: { ...editingScenario.data, displayName: e.target.value } })}
              className="w-full p-2 rounded bg-gray-600 border border-gray-500 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Company Name (for Guardrails):</label>
            <input
              type="text"
              value={editingScenario.data.companyName}
              onChange={(e) => setEditingScenario({ ...editingScenario, data: { ...editingScenario.data, companyName: e.target.value } })}
              className="w-full p-2 rounded bg-gray-600 border border-gray-500 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-200 mt-4 pt-2 border-t border-gray-600">Agents:</h3>
        <div className="space-y-4">
          {editingScenario.data.scenario.map((agent, index) => (
            <AgentEditor
              key={index} // Using index as key is okay if list is not reordered; consider uuid if reordering is added.
              agent={agent}
              onChange={(updatedAgent) => {
                const updatedAgents = [...editingScenario.data.scenario];
                updatedAgents[index] = updatedAgent;
                setEditingScenario({ ...editingScenario, data: { ...editingScenario.data, scenario: updatedAgents } });
              }}
              onDelete={() => {
                const updatedAgents = editingScenario.data.scenario.filter((_, i) => i !== index);
                setEditingScenario({ ...editingScenario, data: { ...editingScenario.data, scenario: updatedAgents } });
              }}
            />
          ))}
        </div>
        <button
          onClick={() => {
            const newAgent: RealtimeAgent = { name: `agent${editingScenario.data.scenario.length + 1}`, instructions: "", model: "gpt-3.5-turbo", voice: "alloy", tools: [] };
            setEditingScenario({ ...editingScenario, data: { ...editingScenario.data, scenario: [...editingScenario.data.scenario, newAgent] } });
          }}
          className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded text-sm mt-3 transition-colors"
        >
          Add Agent
        </button>

        <div className="flex gap-x-3 mt-6 pt-4 sticky bottom-0 bg-gray-700 py-3 z-10 border-t border-gray-600">
          <button onClick={handleSaveScenario} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md transition-colors">Save Scenario</button>
          <button onClick={() => { setIsEditingScenarioMode(false); setEditingScenario(null); }} className="bg-gray-400 hover:bg-gray-500 text-gray-800 font-semibold px-4 py-2 rounded-md transition-colors">Cancel</button>
        </div>
      </div>
    );
  }

  // Main Controls UI (to be filled in next)
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
                disabled={Object.keys(editableScenarios).length === 0}
                className="appearance-none border border-gray-500 rounded-md text-sm px-3 py-1.5 pr-7 cursor-pointer font-normal bg-gray-600 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
              >
                {Object.keys(editableScenarios).length === 0 && <option value="">No Scenarios</option>}
                {Object.entries(editableScenarios).map(([key, { displayName }]) => (
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

      {/* Metaprompt Editing Section */}
      <div className="w-full p-3 bg-gray-600 rounded-md shadow">
        <h3 className="text-md font-semibold mb-1.5 text-white">Global Metaprompt</h3>
        <textarea
          value={editableMetaprompt}
          onChange={(e) => setEditableMetaprompt(e.target.value)}
          rows={5}
          className="w-full p-2 rounded-md text-sm text-gray-900 bg-gray-100 border border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 custom-scrollbar-small"
          placeholder="Metaprompt content..."
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={onResetMetaprompt}
            className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-1 px-3 rounded-md text-xs"
          >
            Reset Metaprompt
          </button>
        </div>
      </div>

      {/* Agent-Specific Text Editing Section */}
      {editableAgentSpecificTexts && (currentAgentConfigSet && currentAgentConfigSet.find(a => a.name === selectedAgentName)) && (
        <div className="w-full p-3 bg-gray-600 rounded-md shadow border border-gray-500">
          <h4 className="text-md font-semibold mb-1.5 text-white">Texts for Agent: <span className="font-bold text-cyan-300">{selectedAgentName}</span></h4>
          {typeof editableAgentSpecificTexts.greeting === 'string' && (
            <div className="mb-2">
              <label htmlFor="agent-greeting-editor" className="block text-xs font-medium text-gray-300 mb-0.5">Greeting:</label>
              <textarea
                id="agent-greeting-editor"
                value={editableAgentSpecificTexts.greeting}
                onChange={(e) => setEditableAgentSpecificTexts({ ...editableAgentSpecificTexts, greeting: e.target.value })}
                rows={2}
                className="w-full p-1.5 rounded-md text-sm text-gray-900 bg-gray-100 border border-gray-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 custom-scrollbar-small"
                placeholder="Agent greeting..."
              />
            </div>
          )}
          {typeof editableAgentSpecificTexts.instructions === 'string' && (
            <div className="mb-2">
              <label htmlFor="agent-instructions-editor" className="block text-xs font-medium text-gray-300 mb-0.5">Instructions:</label>
              <textarea
                id="agent-instructions-editor"
                value={editableAgentSpecificTexts.instructions}
                onChange={(e) => setEditableAgentSpecificTexts({ ...editableAgentSpecificTexts, instructions: e.target.value })}
                rows={3}
                className="w-full p-1.5 rounded-md text-sm text-gray-900 bg-gray-100 border border-gray-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 custom-scrollbar-small"
                placeholder="Agent instructions..."
              />
            </div>
          )}
          {(typeof editableAgentSpecificTexts.greeting !== 'undefined' || typeof editableAgentSpecificTexts.instructions !== 'undefined') &&
            <div className="mt-2 flex justify-end">
              <button
                onClick={onResetAgentSpecificTexts}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-1 px-3 rounded-md text-xs"
              >
                Reset Agent Texts
              </button>
            </div>
          }
        </div>
      )}

      {/* Conversation ID Filter Section */}
      {allConversationIds.length > 0 && (
        <div className="w-full p-3 bg-gray-600 rounded-md shadow border border-gray-500">
          <label htmlFor="convo-filter-select" className="block text-sm font-medium text-gray-300 mb-1">Filter Logs by Conversation ID:</label>
          <select
            id="convo-filter-select"
            value={selectedConversationId || ""}
            onChange={(e) => onSelectConversationId(e.target.value === "" ? null : e.target.value)}
            className="appearance-none w-full md:w-auto border border-gray-500 rounded-md text-sm px-3 py-1.5 pr-7 cursor-pointer font-normal bg-gray-600 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Conversations</option>
            {allConversationIds.map(id => (
              <option key={id} value={id}>{id.substring(0, 8)}...</option>
            ))}
          </select>
        </div>
      )}

      {/* Scenario Management Section */}
      <div className="w-full p-3 bg-gray-600 rounded-md shadow">
          <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-semibold text-white">Manage Scenarios</h3>
              <button onClick={handleCreateNewScenario} className="bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-3 rounded-md text-sm transition-colors">
                  Create New
              </button>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar-small">
              {Object.entries(editableScenarios).map(([key, scenario]) => (
                  <div key={key} className="flex justify-between items-center p-1.5 bg-gray-500 rounded-md">
                      <span className="text-xs truncate" title={scenario.displayName}>{scenario.displayName} <span className="text-gray-300">({key.length > 10 ? key.substring(0,10) + "..." : key})</span></span>
                      <div className="flex gap-1.5">
                          <button onClick={() => handleEditScenario(key)} className="bg-blue-500 hover:bg-blue-600 text-white px-1.5 py-0.5 rounded-sm text-xs">Edit</button>
                          <button onClick={() => handleDeleteScenario(key)} className="bg-red-500 hover:bg-red-600 text-white px-1.5 py-0.5 rounded-sm text-xs">Delete</button>
                      </div>
                  </div>
              ))}
              {Object.keys(editableScenarios).length === 0 && <p className="text-xs text-gray-400 italic">No scenarios defined. Click "Create New" to add one.</p>}
          </div>
      </div>

      {/* Agent Tools Display Section */}
      {agentTools && agentTools.length > 0 && (currentAgentConfigSet && currentAgentConfigSet.find(a => a.name === selectedAgentName)) && (
        <div className="w-full p-3 bg-gray-550 rounded-md border border-gray-500">
          <h4 className="text-md font-semibold mb-1.5 text-white">Tools for Agent: <span className="font-bold text-purple-300">{selectedAgentName}</span></h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {agentTools.map((tool, index) => (
              <div key={index} className="p-2 bg-gray-600 rounded-md shadow">
                <p className="text-sm font-semibold text-teal-300 break-all">{tool.name}</p>
                {tool.description && <p className="text-xs text-gray-200 mt-0.5">{tool.description}</p>}
                {tool.parameters && (
                  <div className="mt-1">
                    <p className="text-xs font-medium text-gray-300 mb-0.5">Parameters:</p>
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
