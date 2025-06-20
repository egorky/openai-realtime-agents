"use client";
import React, { useEffect, useRef, useState, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { v4 as uuidv4 } from "uuid";

// UI components
import Events from "@/app/components/Events";
// Supervisor-specific toolbar will be handled in a later step. For now, a placeholder.

// Types
import { SessionStatus } from "@/app/types";
import type { RealtimeAgent } from '@openai/agents/realtime';

// Context providers & hooks
import { TranscriptProvider, useTranscript } from "@/app/contexts/TranscriptContext";
import { EventProvider, useEvent } from "@/app/contexts/EventContext";
import { useRealtimeSession } from "@/app/hooks/useRealtimeSession";
import { createModerationGuardrail } from "@/app/agentConfigs/guardrails";

// Agent configs
import { allAgentSets, defaultAgentSetKey } from "@/app/agentConfigs";
// Import all scenarios available to the supervisor

// At the top of src/app/supervisor/page.tsx or in a relevant types file
interface EditableAgentTexts {
  greeting?: string;
  instructions?: string;
}

interface SimpleToolDefinition {
  name: string;
  description?: string;
  parameters?: object; // JSON schema
}
import { customerServiceRetailScenario, customerServiceRetailCompanyName } from "@/app/agentConfigs/customerServiceRetail";
import { chatSupervisorScenario, chatSupervisorCompanyName } from "@/app/agentConfigs/chatSupervisor";
import { simpleHandoffScenario } from "@/app/agentConfigs/simpleHandoff"; // Assuming a company name might be generic or defined elsewhere for this

const supervisorSdkScenarioMap: Record<string, { scenario: RealtimeAgent[], companyName: string, displayName: string }> = {
  customerServiceRetail: { scenario: customerServiceRetailScenario, companyName: customerServiceRetailCompanyName, displayName: "Customer Service (Retail)" },
  chatSupervisor: { scenario: chatSupervisorScenario, companyName: chatSupervisorCompanyName, displayName: "Chat Supervisor" },
  simpleHandoff: { scenario: simpleHandoffScenario, companyName: "GenericHandoffInc", displayName: "Simple Handoff" }, // Example company name
};


import { useHandleSessionHistory } from "@/app/hooks/useHandleSessionHistory";
import SupervisorControls from "@/app/components/SupervisorControls";

function SupervisorApp() {
  const searchParams = useSearchParams()!;
  const { addTranscriptBreadcrumb } = useTranscript(); // Kept for potential breadcrumbs in supervisor logs
  const { logClientEvent, logServerEvent, loggedEvents: allLoggedEventsFromContext } = useEvent(); // Get all logged events
  const [currentSupervisorConversationId, setCurrentSupervisorConversationId] = useState<string | null>(null);
  const [selectedConvIdFilter, setSelectedConvIdFilter] = useState<string | null>(null);


  // State for selected scenario and agent within that scenario
  const [currentAgentSetKey, setCurrentAgentSetKey] = useState<string>(defaultAgentSetKey);
  const [currentAgentName, setCurrentAgentName] = useState<string>("");
  const [currentAgentConfigSet, setCurrentAgentConfigSet] = useState<RealtimeAgent[] | null>(null);
  const [editableMetaprompt, setEditableMetaprompt] = useState<string>("");
  const [originalMetaprompt, setOriginalMetaprompt] = useState<string>(""); // To allow reset
  const [editableAgentSpecificTexts, setEditableAgentSpecificTexts] = useState<EditableAgentTexts | null>(null);
  const [originalAgentSpecificTexts, setOriginalAgentSpecificTexts] = useState<EditableAgentTexts | null>(null);
  const [currentAgentTools, setCurrentAgentTools] = useState<SimpleToolDefinition[] | null>(null);

  const allConversationIds = useMemo(() => {
    const ids = new Set<string>();
    allLoggedEventsFromContext.forEach(event => { // Use the events from context
      if (event.conversationId) {
        ids.add(event.conversationId);
      }
    });
    return Array.from(ids).sort(); // Sort for consistent order
  }, [allLoggedEventsFromContext]);


  const audioElementRef = useRef<HTMLAudioElement | null>(null); // Supervisor might want to listen in.
  const handoffTriggeredRef = useRef(false);

  const sdkAudioElement = React.useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const el = document.createElement('audio');
    el.autoplay = true; // Autoplay for supervisor to hear audio immediately
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }, []);

  useEffect(() => {
    if (sdkAudioElement && !audioElementRef.current) {
      audioElementRef.current = sdkAudioElement;
    }
  }, [sdkAudioElement]);

  const {
    connect,
    disconnect,
    sendEvent, // Supervisor doesn't send user text or PTT, but might send other events if needed
    interrupt, // Supervisor might want to interrupt an agent
    mute, // Supervisor can mute their listening audio
  } = useRealtimeSession({
    onConnectionChange: (s) => setSessionStatus(s as SessionStatus),
    onAgentHandoff: (agentName: string) => {
      handoffTriggeredRef.current = true;
      setCurrentAgentName(agentName);
      // Log handoff for supervisor
      logClientEvent({ type: "system.log", message: `Session handed off to agent: ${agentName}` }, "agent_handoff");
      addTranscriptBreadcrumb(`Handoff to: ${agentName}`); // also log in transcript context if useful
    },
  });

  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("DISCONNECTED");
  // For supervisor, logs are central, usually always expanded.
  const [isEventsPaneExpanded, setIsEventsPaneExpanded] = useState<boolean>(() => {
      if (typeof window === 'undefined') return true;
      const stored = localStorage.getItem('supervisorLogsExpanded');
      return stored ? stored === 'true' : true; // Default to true for supervisor
  });
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(() => { // For supervisor to listen
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('supervisorAudioPlaybackEnabled');
    return stored ? stored === 'true' : true;
  });


  useHandleSessionHistory(); // May or may not be relevant for supervisor, but harmless

  // In SupervisorApp, useEffect for loading initial metaprompt
  useEffect(() => {
    // Simulate loading the translated metaprompt content
    const initialMetapromptContent = `Eres un asistente de IA de voz. Responde al usuario de forma conversacional y concisa. No incluyas ningún formato especial en tus respuestas. No incluyas nada que no deba ser leído por la conversión de texto a voz. No necesitas decir cosas como 'Claro', 'Por supuesto', o 'Entendido' a menos que sea una respuesta afirmativa a una pregunta directa. En su lugar, ve directo a la respuesta. Si no puedes ayudar con algo, dilo y explica por qué. Puedes usar las siguientes herramientas para ayudarte a responder al usuario. Para usar una herramienta, responde únicamente con un bloque de código JSON que especifique el nombre de la herramienta y las entradas que necesita. El bloque de código JSON debe ser el único contenido en tu respuesta. No lo envuelves con \`\`\`json.

<TOOL_DESCRIPTIONS>`; // Note: <TOOL_DESCRIPTIONS> is a placeholder used by the SDK
    setEditableMetaprompt(initialMetapromptContent);
    setOriginalMetaprompt(initialMetapromptContent);
  }, []);

  useEffect(() => {
    if (currentAgentSetKey && currentAgentName && supervisorSdkScenarioMap[currentAgentSetKey]) {
      const scenario = supervisorSdkScenarioMap[currentAgentSetKey].scenario;
      const agentConfig = scenario.find(agent => agent.name === currentAgentName);

      if (agentConfig) {
        const texts: EditableAgentTexts = {};
        if (typeof agentConfig.greeting === 'string') {
          texts.greeting = agentConfig.greeting;
        }
        // For instructions, agentConfig.instructions might be complex (e.g. an object or array in some structures)
        // We are targeting simple string instructions here as per RealtimeAgent type.
        if (typeof agentConfig.instructions === 'string') {
          texts.instructions = agentConfig.instructions;
        }
        setEditableAgentSpecificTexts(texts);
        setOriginalAgentSpecificTexts(texts);

        // Load tools
        if (agentConfig.tools && Array.isArray(agentConfig.tools)) {
          setCurrentAgentTools(agentConfig.tools as SimpleToolDefinition[]); // Cast if necessary
        } else {
          setCurrentAgentTools(null);
        }
      } else {
        setEditableAgentSpecificTexts(null); // No specific agent selected or found
        setOriginalAgentSpecificTexts(null);
        setCurrentAgentTools(null);
      }
    } else {
      setEditableAgentSpecificTexts(null);
      setOriginalAgentSpecificTexts(null);
      setCurrentAgentTools(null);
    }
  }, [currentAgentSetKey, currentAgentName, supervisorSdkScenarioMap]);

  // Initialize agent configuration based on URL or default
  useEffect(() => {
    let agentKeyFromUrl = searchParams.get("agentConfig");
    if (!agentKeyFromUrl || !supervisorSdkScenarioMap[agentKeyFromUrl]) {
      agentKeyFromUrl = defaultAgentSetKey; // Use the global default defined in agentConfigs/index.ts
      if (!supervisorSdkScenarioMap[agentKeyFromUrl]) { // If global default isn't in supervisor map, pick first from supervisor map
          agentKeyFromUrl = Object.keys(supervisorSdkScenarioMap)[0];
      }
      // No automatic URL update for supervisor, they can choose.
    }

    const scenarioInfo = supervisorSdkScenarioMap[agentKeyFromUrl];
    if (scenarioInfo) {
      setCurrentAgentSetKey(agentKeyFromUrl);
      setCurrentAgentConfigSet(scenarioInfo.scenario);
      setCurrentAgentName(scenarioInfo.scenario[0]?.name || "");
    } else {
      // Fallback if something went wrong, though the above logic should prevent this
      const firstKey = Object.keys(supervisorSdkScenarioMap)[0];
      setCurrentAgentSetKey(firstKey);
      setCurrentAgentConfigSet(supervisorSdkScenarioMap[firstKey].scenario);
      setCurrentAgentName(supervisorSdkScenarioMap[firstKey].scenario[0]?.name || "");
    }
  }, [searchParams]);


  // Effect to connect or update session when agent/scenario changes
  useEffect(() => {
    if (currentAgentSetKey && currentAgentName && sessionStatus === "DISCONNECTED") {
      // Only connect if disconnected. If settings change while connected, user must explicitly reconnect.
      // connectToRealtime(); // Potentially allow auto-connect on first load, or require manual connect
    } else if (sessionStatus === "CONNECTED" && currentAgentConfigSet && currentAgentName) {
      // If already connected and agent changes, this implies a handoff or a change needing session update
      const currentAgent = currentAgentConfigSet.find(a => a.name === currentAgentName);
      logClientEvent({ type: "system.log", message: `Monitoring agent: ${currentAgentName}` }, "agent_monitor_update", currentSupervisorConversationId || undefined);
      addTranscriptBreadcrumb(`Agent: ${currentAgentName}`, currentAgent); // Log change for supervisor
      updateSession(!handoffTriggeredRef.current); // Update session, maybe send a meta-event
      handoffTriggeredRef.current = false;
    }
  }, [currentAgentSetKey, currentAgentName, currentAgentConfigSet, sessionStatus, currentSupervisorConversationId]);


  const fetchEphemeralKey = async (): Promise<string | null> => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request_supervisor", currentSupervisorConversationId || undefined);
    const tokenResponse = await fetch("/api/session"); // Same endpoint for token
    const data = await tokenResponse.json();
    logServerEvent(data, "fetch_session_token_response_supervisor", currentSupervisorConversationId || undefined);

    if (!data.client_secret?.value) {
      logClientEvent(data, "error.no_ephemeral_key_supervisor", currentSupervisorConversationId || undefined);
      console.error("Supervisor: No ephemeral key provided by the server");
      setSessionStatus("DISCONNECTED");
      return null;
    }
    return data.client_secret.value;
  };

  const connectToRealtime = async () => {
    const newConvId = uuidv4();
    setCurrentSupervisorConversationId(newConvId);

    const scenarioDetails = supervisorSdkScenarioMap[currentAgentSetKey]; // Renamed from scenarioInfo to avoid conflict
    if (!scenarioDetails || !Array.isArray(scenarioDetails.scenario)) { // Check if scenario is an array
      console.error(`Supervisor: Scenario not found or invalid for key ${currentAgentSetKey}`);
      setSessionStatus("DISCONNECTED");
      logClientEvent({type: "system.error", message: `Supervisor: Scenario not found or invalid for ${currentAgentSetKey}`}, "supervisor_connect_fail_config", newConvId);
      return;
    }
    if (!currentAgentName) {
        console.error(`Supervisor: No agent selected for scenario ${currentAgentSetKey}.`);
        setSessionStatus("DISCONNECTED");
        logClientEvent({type: "system.error", message: `Supervisor: No agent selected for scenario ${currentAgentSetKey}`}, "supervisor_connect_fail_config", newConvId);
        return;
    }

    if (sessionStatus !== "DISCONNECTED") return;
    setSessionStatus("CONNECTING");
    logClientEvent({type: "system.log", message: `Supervisor connecting to session with agent: ${currentAgentName}`}, "supervisor_connect_attempt", newConvId);

    try {
      const EPHEMERAL_KEY = await fetchEphemeralKey();
      if (!EPHEMERAL_KEY) return;

      // Create a new array of agent configurations with overrides using shallow copies
      let processedAgents = scenarioDetails.scenario.map(originalAgentConfig => {
        let modifiedAgentConfig = { ...originalAgentConfig }; // Shallow copy

        // DO NOT set modifiedAgentConfig.prompt here anymore.
        // It will be passed as defaultPrompt to the session.

        // Apply agent-specific overrides
        if (originalAgentConfig.name === currentAgentName && editableAgentSpecificTexts) {
          if (typeof editableAgentSpecificTexts.greeting === 'string') {
            modifiedAgentConfig.greeting = editableAgentSpecificTexts.greeting;
          }
          if (typeof editableAgentSpecificTexts.instructions === 'string') {
            modifiedAgentConfig.instructions = editableAgentSpecificTexts.instructions;
          }
        }

        // Ensure 'tools' is an array
        if (!Array.isArray(modifiedAgentConfig.tools)) {
          modifiedAgentConfig.tools = [];
        }
        return modifiedAgentConfig;
      });

      // Reorder agents
      const currentAgentIndex = processedAgents.findIndex(agent => agent.name === currentAgentName);
      if (currentAgentIndex > 0) {
        const agentToMove = processedAgents.splice(currentAgentIndex, 1)[0];
        processedAgents.unshift(agentToMove);
      } else if (currentAgentIndex === -1 && processedAgents.length > 0) {
        console.warn(`Supervisor: Selected agent name "${currentAgentName}" not found in scenario "${currentAgentSetKey}". Using first agent "${processedAgents[0].name}".`);
        setCurrentAgentName(processedAgents[0].name); // This might trigger re-renders, use with caution or ensure it's stable
      } else if (processedAgents.length === 0) {
        console.error(`Supervisor: No agents found or processed for scenario ${currentAgentSetKey}.`);
        setSessionStatus("DISCONNECTED");
        logClientEvent({type: "system.error", message: `No agents in scenario ${currentAgentSetKey} after processing`}, "supervisor_connect_fail_config", newConvId);
        return;
      }

      const agentsToConnect = processedAgents;

      const guardrail = createModerationGuardrail(scenarioDetails.companyName); // Use scenarioDetails

      console.log("Supervisor: Attempting to connect with initialAgents:", JSON.stringify(agentsToConnect, null, 2));
      // This will show the exact structure being passed to the SDK.
      // Ensure agentsToConnect itself is an array.
      if (!Array.isArray(agentsToConnect)) {
          console.error("Supervisor: CRITICAL - agentsToConnect is not an array before connect call!");
          // Potentially set an error state and return, preventing the connect call.
          setSessionStatus("DISCONNECTED"); // Or a new "ERROR" status
          logClientEvent({type: "system.error", message: "Supervisor: agentsToConnect is not an array"}, "supervisor_connect_fail_critical", newConvId);
          return;
      }
      agentsToConnect.forEach((agent, index) => {
          if (!agent || typeof agent !== 'object') {
              console.error(`Supervisor: CRITICAL - agent at index ${index} is not an object:`, agent);
          }
          if (agent && !Array.isArray(agent.tools)) {
              console.warn(`Supervisor: Agent ${agent.name || `at index ${index}`} has non-array tools property:`, agent.tools);
              // Optionally, force agent.tools to be an array here if found to be problematic,
              // though the mapping above should have already handled it.
              // agent.tools = [];
          }
      });

      await connect({
        getEphemeralKey: async () => EPHEMERAL_KEY,
        initialAgents: agentsToConnect, // Use the modified list
        audioElement: sdkAudioElement, // Supervisor listens here
        outputGuardrails: [guardrail],
        extraContext: { addTranscriptBreadcrumb }, // For logging agent changes etc.
        defaultPrompt: editableMetaprompt, // Add this line
        // Supervisor specific: might not need input audio stream or turn detection in the same way
        // For now, it mirrors client, but this could be optimized.
      });
       logClientEvent({type: "system.log", message: `Supervisor connected to session with agent: ${currentAgentName}`}, "supervisor_connect_success", newConvId);
    } catch (err) {
      console.error("Supervisor: Error connecting via SDK:", err);
      setSessionStatus("DISCONNECTED");
      logClientEvent({type: "system.error", message: `Supervisor connection error: ${err}`}, "supervisor_connect_fail", newConvId);
    }
  };

  const disconnectFromRealtime = () => {
    disconnect();
    // setSessionStatus("DISCONNECTED"); // This is handled by onConnectionChange
    logClientEvent({type: "system.log", message: "Supervisor disconnected."}, "supervisor_disconnect", currentSupervisorConversationId || undefined);
  };

  // Supervisor doesn't send user messages, but might need to update session for other reasons
  const updateSession = (shouldTriggerAgentResponse: boolean = false) => {
    // Supervisor view doesn't use PTT or client-side VAD.
    // It might send a session update if, for example, it changes a parameter for the agent.
    // For now, this is a no-op unless a specific supervisor action requires it.
    // If the supervisor wants to trigger an agent response (e.g. for testing),
    // a special event could be designed.
    sendEvent({
      type: 'session.update',
      session: {
        // Example: supervisor could modify some parameters, but not typical VAD settings
        // For now, no specific changes from supervisor side on session params.
      },
    });

    // Supervisor typically wouldn't directly cause an agent to speak like a client does.
    // If this is needed for testing, it might be a specific "test agent response" button.
    if (shouldTriggerAgentResponse) {
      // This was for client before, supervisor might have a different way if needed
      // sendEvent({ type: 'response.create' });
      logClientEvent({type: "system.log", message: "Supervisor triggered agent response (if applicable)."}, "supervisor_trigger_response", currentSupervisorConversationId || undefined);
    }
  };

  const onToggleConnection = () => {
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      disconnectFromRealtime();
    } else {
      // Refresh URL to match selected agent config before connecting
      const url = new URL(window.location.toString());
      url.searchParams.set("agentConfig", currentAgentSetKey);
      // window.history.pushState({}, '', url); // Update URL without reload, or reload if preferred
      if (window.location.search !== url.search) {
         window.location.href = url.toString(); // Reload to ensure clean state with new params if they changed
         return;
      }
      connectToRealtime();
    }
  };

  const handleAgentScenarioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAgentSetKey = e.target.value;
    // Disconnect before changing, as it requires a new session structure
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      disconnectFromRealtime(); // Disconnect first
    }
    const scenarioInfo = supervisorSdkScenarioMap[newAgentSetKey];
    if (scenarioInfo) {
        setCurrentAgentSetKey(newAgentSetKey);
        setCurrentAgentConfigSet(scenarioInfo.scenario);
        setCurrentAgentName(scenarioInfo.scenario[0]?.name || ""); // Default to first agent in new scenario

        // Update URL to reflect the new scenario selection
        const url = new URL(window.location.toString());
        url.searchParams.set("agentConfig", newAgentSetKey);
        // To apply the change and potentially reconnect, either navigate or rely on user to click connect
        window.location.href = url.toString(); // Force reload to apply new config from URL cleanly
    }
  };

  const handleSelectedAgentNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAgentName = e.target.value;
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      disconnectFromRealtime(); // Disconnect first if connected
    }
    setCurrentAgentName(newAgentName);
    // User will need to click "Connect" again to connect with this specific agent as primary.
    // Or, we can auto-trigger a reconnect sequence here. For now, manual.
    logClientEvent({type: "system.log", message: `Supervisor selected agent: ${newAgentName}. Reconnect to activate.`}, "supervisor_agent_select", currentSupervisorConversationId || undefined);
  };


  useEffect(() => {
    localStorage.setItem("supervisorLogsExpanded", isEventsPaneExpanded.toString());
  }, [isEventsPaneExpanded]);

  useEffect(() => {
    localStorage.setItem("supervisorAudioPlaybackEnabled", isAudioPlaybackEnabled.toString());
    if (audioElementRef.current) {
      audioElementRef.current.muted = !isAudioPlaybackEnabled;
      if (isAudioPlaybackEnabled && sessionStatus === "CONNECTED") {
        audioElementRef.current.play().catch(console.warn);
      } else {
        audioElementRef.current.pause();
      }
    }
     try {
      mute(!isAudioPlaybackEnabled); // SDK mute for supervisor's audio feed
    } catch (err) {
      // console.warn('Supervisor: Failed to toggle SDK mute state', err);
    }
  }, [isAudioPlaybackEnabled, sessionStatus]);


  return (
    <div className="text-base flex flex-col h-screen bg-gray-800 text-gray-100 relative">
      <div className="p-3 text-lg font-semibold flex justify-between items-center bg-gray-900 border-b border-gray-700">
        <div className="flex items-center">
          <Image src="/openai-logomark.svg" alt="OpenAI Logo" width={20} height={20} className="mr-2" />
          <div>Realtime API <span className="text-gray-400">Supervisor Dashboard</span></div>
        </div>
        {/* Placeholder for global controls or user info */}
      </div>

      {/* Main Content Area: Two Columns */}
      <div className="flex flex-1 overflow-hidden border-t border-gray-700">
        {/* Left Column: Logs */}
        <div className="w-1/2 h-full overflow-y-auto p-3 border-r border-gray-600 bg-gray-800">
          <Events
            isExpanded={true} // Always expanded
            filterByConversationId={selectedConvIdFilter}
          />
        </div>

        {/* Right Column: Controls, Editors, Tool Display */}
        <div className="w-1/2 h-full overflow-y-auto p-3 bg-gray-750">
          <SupervisorControls
            sessionStatus={sessionStatus}
            onToggleConnection={onToggleConnection}
            currentAgentSetKey={currentAgentSetKey}
            handleAgentScenarioChange={handleAgentScenarioChange}
            selectedAgentName={currentAgentName}
            handleSelectedAgentNameChange={handleSelectedAgentNameChange}
            currentAgentConfigSet={currentAgentConfigSet}
            // isEventsPaneExpanded and setIsEventsPaneExpanded are removed
            isAudioPlaybackEnabled={isAudioPlaybackEnabled}
            setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
            supervisorSdkScenarioMap={supervisorSdkScenarioMap}
            editableMetaprompt={editableMetaprompt}
            setEditableMetaprompt={setEditableMetaprompt}
            onResetMetaprompt={() => setEditableMetaprompt(originalMetaprompt)}
            editableAgentSpecificTexts={editableAgentSpecificTexts}
            setEditableAgentSpecificTexts={setEditableAgentSpecificTexts}
            onResetAgentSpecificTexts={() => setEditableAgentSpecificTexts(originalAgentSpecificTexts)}
            allConversationIds={allConversationIds}
            selectedConversationId={selectedConvIdFilter}
            onSelectConversationId={setSelectedConvIdFilter}
            // Tool display will be added here or as part of SupervisorControls later
          />
        </div>
      </div>

      {/* Optional: A minimal status bar at the bottom if needed */}
      <div className="bg-gray-900 text-xs text-gray-400 p-1 text-center border-t border-gray-700">
        Supervisor View | Audio Playback: {isAudioPlaybackEnabled ? "Enabled" : "Disabled"}
      </div>
    </div>
  );
}

export default function SupervisorPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen bg-gray-800 text-white">Loading Supervisor Dashboard...</div>}>
      <TranscriptProvider> {/* Kept for useEvent and potential logging, though supervisor doesn't display transcript directly */}
        <EventProvider>
          <SupervisorApp />
        </EventProvider>
      </TranscriptProvider>
    </Suspense>
  );
}
