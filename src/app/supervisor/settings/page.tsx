"use client";
import React, { useState, useEffect } from "react";
import type { RealtimeAgent } from '@openai/agents/realtime';
import { supervisorSdkScenarioMap, defaultAgentSetKey } from "@/app/agentConfigs"; // Assuming these might be needed for initial state

// TODO: Consider moving these to a shared types file if not already there
interface SupervisorSdkScenario {
  scenario: RealtimeAgent[];
  companyName: string;
  displayName: string;
}

interface EditableAgentTexts { // If used by metaprompt or agent specific text editors moved here
  greeting?: string;
  instructions?: string;
}

// Placeholder for initial metaprompt, ideally loaded from a config or constants file
const INITIAL_METAPROMPT_CONTENT = `Eres un asistente de IA de voz. Responde al usuario de forma conversacional y concisa. No incluyas ningún formato especial en tus respuestas. No incluyas nada que no deba ser leído por la conversión de texto a voz. No necesitas decir cosas como 'Claro', 'Por supuesto', o 'Entendido' a menos que sea una respuesta afirmativa a una pregunta directa. En su lugar, ve directo a la respuesta. Si no puedes ayudar con algo, dilo y explica por qué. Puedes usar las siguientes herramientas para ayudarte a responder al usuario. Para usar una herramienta, responde únicamente con un bloque de código JSON que especifique el nombre de la herramienta y las entradas que necesita. El bloque de código JSON debe ser el único contenido en tu respuesta. No lo envuelves con \`\`\`json.

<TOOL_DESCRIPTIONS>`;

function SupervisorSettingsPage() {
  // State for managing scenarios (volatile, not persisted beyond this page/session unless localStorage is used)
  const [editableScenarios, setEditableScenarios] = useState<Record<string, SupervisorSdkScenario>>(() => {
    // Deep copy for editing. Consider loading from localStorage if semi-persistence is desired
    // For now, initialize from the base map.
    return JSON.parse(JSON.stringify(supervisorSdkScenarioMap));
  });
  const [editingScenario, setEditingScenario] = useState<{ key: string, data: SupervisorSdkScenario } | null>(null);
  const [isEditingMode, setIsEditingMode] = useState<boolean>(false); // To toggle scenario editing UI

  // State for metaprompt editing
  const [editableMetaprompt, setEditableMetaprompt] = useState<string>(INITIAL_METAPROMPT_CONTENT);
  const [originalMetaprompt, setOriginalMetaprompt] = useState<string>(INITIAL_METAPROMPT_CONTENT);

  // TODO: Move scenario CRUD handlers (handleEditScenario, handleCreateNewScenario, handleSaveScenario, handleDeleteScenario) here
  // TODO: Move AgentEditor component definition here or import from a shared location
  // TODO: Move Metaprompt editing UI here
  // TODO: Move Scenario Management UI (list, create, edit, delete buttons) here

  // AgentEditor Component (copied from SupervisorControls.tsx and adapted)
  const AgentEditor: React.FC<{ agent: RealtimeAgent, onChange: (updatedAgent: RealtimeAgent) => void, onDelete: () => void }> = ({ agent: initialAgent, onChange, onDelete }) => {
    const [localAgent, setLocalAgent] = React.useState<RealtimeAgent>(initialAgent);

    React.useEffect(() => {
      setLocalAgent(initialAgent);
    }, [initialAgent]);

    const handleChange = (field: keyof RealtimeAgent, value: any) => {
      const updatedAgent = { ...localAgent, [field]: value };
      setLocalAgent(updatedAgent);
      onChange(updatedAgent);
    };

    const handleToolsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      try {
        const toolsArray = JSON.parse(e.target.value);
        if (Array.isArray(toolsArray)) {
          handleChange('tools', toolsArray);
        } else {
          console.warn("Tools input is not a valid JSON array.");
        }
      } catch (error) {
        console.warn("Error parsing tools JSON:", error);
      }
    };

    return (
      <div className="p-3 bg-gray-500 rounded-md mt-2 space-y-2 border border-gray-400 shadow-sm">
        <input type="text" value={localAgent.name} onChange={e => handleChange('name', e.target.value)} placeholder="Agent Name" className="w-full p-1.5 rounded bg-gray-400 text-white placeholder-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500" />
        <textarea value={localAgent.instructions || ""} onChange={e => handleChange('instructions', e.target.value)} placeholder="Instructions" rows={3} className="w-full p-1.5 rounded bg-gray-400 text-white placeholder-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500" />
        <input type="text" value={localAgent.model || ""} onChange={e => handleChange('model', e.target.value)} placeholder="Model (e.g., gpt-4o-mini-realtime-preview)" className="w-full p-1.5 rounded bg-gray-400 text-white placeholder-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500" />
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


  // CRUD Handlers
  const handleEditScenario = (scenarioKey: string) => {
    if (editableScenarios[scenarioKey]) {
      const scenarioToEdit = JSON.parse(JSON.stringify(editableScenarios[scenarioKey]));
      setEditingScenario({ key: scenarioKey, data: scenarioToEdit });
      setIsEditingMode(true);
    }
  };

  const handleCreateNewScenario = () => {
    const newKey = `newScenario_${Date.now()}`;
    const newScenarioData: SupervisorSdkScenario = {
      displayName: "New Scenario",
      companyName: "Default Company",
      scenario: [{
        name: "defaultAgent",
        instructions: "Default instructions",
        model: "gpt-4o-mini-realtime-preview",
        voice: "alloy",
        tools: [],
      }],
    };
    setEditingScenario({ key: newKey, data: newScenarioData });
    setIsEditingMode(true);
  };

  const handleSaveScenario = () => {
    if (editingScenario) {
      setEditableScenarios(prev => ({
        ...prev,
        [editingScenario.key]: editingScenario.data,
      }));
      // Persist to localStorage (optional, for changes to be seen by main supervisor page on next load)
      localStorage.setItem("supervisorCustomScenarios", JSON.stringify({
        ...editableScenarios,
        [editingScenario.key]: editingScenario.data,
      }));
      localStorage.setItem("supervisorCustomMetaprompt", editableMetaprompt); // Save metaprompt too

      setIsEditingMode(false);
      setEditingScenario(null);
    }
  };

  const handleDeleteScenario = (scenarioKey: string) => {
    if (window.confirm(`Are you sure you want to delete scenario "${editableScenarios[scenarioKey]?.displayName || scenarioKey}"?`)) {
      const newScenarios = { ...editableScenarios };
      delete newScenarios[scenarioKey];
      setEditableScenarios(newScenarios);
      localStorage.setItem("supervisorCustomScenarios", JSON.stringify(newScenarios));
    }
  };

  // Effect to load scenarios and metaprompt from localStorage on initial mount
  useEffect(() => {
    const storedScenarios = localStorage.getItem("supervisorCustomScenarios");
    if (storedScenarios) {
      try {
        setEditableScenarios(JSON.parse(storedScenarios));
      } catch (e) {
        console.error("Failed to parse stored scenarios from localStorage", e);
        // Fallback to default if parsing fails
        setEditableScenarios(JSON.parse(JSON.stringify(supervisorSdkScenarioMap)));
      }
    }
    const storedMetaprompt = localStorage.getItem("supervisorCustomMetaprompt");
    if (storedMetaprompt) {
      setEditableMetaprompt(storedMetaprompt);
      setOriginalMetaprompt(storedMetaprompt); // Or keep original as constant if reset should go to app default
    }
  }, []);


  if (isEditingMode && editingScenario) {
    // Scenario Editing Form UI (simplified, actual AgentEditor will be more complex)
    return (
      <div className="bg-gray-800 text-white p-6 min-h-screen">
        <header className="mb-6">
          <a href="/supervisor" className="text-blue-400 hover:text-blue-300">&larr; Back to Supervisor Dashboard</a>
          <h1 className="text-2xl font-semibold mt-2">
            {editingScenario.key.startsWith("newScenario") ? "Create New Scenario" : `Edit Scenario: ${editingScenario.data.displayName}`}
          </h1>
        </header>

        <div className="space-y-4 bg-gray-700 p-4 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-300">Display Name:</label>
            <input
              type="text"
              value={editingScenario.data.displayName}
              onChange={(e) => setEditingScenario({ ...editingScenario, data: { ...editingScenario.data, displayName: e.target.value } })}
              className="w-full p-2 rounded bg-gray-600 border border-gray-500 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Company Name:</label>
            <input
              type="text"
              value={editingScenario.data.companyName}
              onChange={(e) => setEditingScenario({ ...editingScenario, data: { ...editingScenario.data, companyName: e.target.value } })}
              className="w-full p-2 rounded bg-gray-600 border border-gray-500 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <h3 className="text-lg font-medium pt-2">Agents:</h3>
          {editingScenario.data.scenario.map((agent, index) => (
            <AgentEditor // This will be the full AgentEditor component
              key={index}
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
          <button
            onClick={() => {
                const newAgent: RealtimeAgent = { name: `agent${editingScenario.data.scenario.length + 1}`, instructions: "", model: "gpt-4o-mini-realtime-preview", voice: "alloy", tools:[] };
                setEditingScenario({ ...editingScenario, data: { ...editingScenario.data, scenario: [...editingScenario.data.scenario, newAgent] }});
            }}
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-sm"
          >
            Add Agent
          </button>

          <div className="flex gap-3 mt-4">
            <button onClick={handleSaveScenario} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">Save Scenario Changes</button>
            <button onClick={() => { setIsEditingMode(false); setEditingScenario(null); }} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  // Main Settings Page UI (List scenarios, edit metaprompt)
  return (
    <div className="bg-gray-800 text-white p-6 min-h-screen">
      <header className="mb-6">
        <a href="/supervisor" className="text-blue-400 hover:text-blue-300">&larr; Back to Supervisor Dashboard</a>
        <h1 className="text-3xl font-semibold mt-2">Supervisor Settings</h1>
      </header>

      {/* Metaprompt Editing Section */}
      <section className="mb-8 p-4 bg-gray-700 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-3 text-gray-100">Global Metaprompt</h2>
        <textarea
          value={editableMetaprompt}
          onChange={(e) => setEditableMetaprompt(e.target.value)}
          rows={10}
          className="w-full p-2 rounded-md text-sm text-gray-900 bg-gray-100 border border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 custom-scrollbar"
          placeholder="Metaprompt content..."
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={() => {
                setEditableMetaprompt(INITIAL_METAPROMPT_CONTENT);
                setOriginalMetaprompt(INITIAL_METAPROMPT_CONTENT);
            }}
            className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-1.5 px-4 rounded-md text-sm"
          >
            Reset Metaprompt
          </button>
          <button
            onClick={() => {
                localStorage.setItem("supervisorCustomMetaprompt", editableMetaprompt);
                alert("Metaprompt saved to local storage for next session on main dashboard.");
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1.5 px-4 rounded-md text-sm"
          >
            Save Metaprompt
          </button>
        </div>
      </section>

      {/* Scenario Management Section */}
      <section className="p-4 bg-gray-700 rounded-lg shadow">
        <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold text-gray-100">Manage Scenarios</h2>
            <button onClick={handleCreateNewScenario} className="bg-green-500 hover:bg-green-600 text-white font-semibold py-1.5 px-3 rounded-md text-sm">
                Create New Scenario
            </button>
        </div>
        <div className="space-y-3">
            {Object.entries(editableScenarios).map(([key, scenario]) => (
                <div key={key} className="flex justify-between items-center p-3 bg-gray-600 rounded-md shadow-sm">
                    <div>
                        <h3 className="text-md font-medium text-gray-50">{scenario.displayName}</h3>
                        <p className="text-xs text-gray-400">Key: {key}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handleEditScenario(key)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-xs">Edit</button>
                        <button onClick={() => handleDeleteScenario(key)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-xs">Delete</button>
                    </div>
                </div>
            ))}
            {Object.keys(editableScenarios).length === 0 && <p className="text-sm text-gray-400 italic">No scenarios defined. Click "Create New" to add one.</p>}
        </div>
      </section>
    </div>
  );
}

export default SupervisorSettingsPage;
