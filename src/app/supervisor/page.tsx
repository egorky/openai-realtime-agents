"use client";
import React, { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

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
  const { logClientEvent, logServerEvent } = useEvent();

  // State for selected scenario and agent within that scenario
  const [currentAgentSetKey, setCurrentAgentSetKey] = useState<string>(defaultAgentSetKey);
  const [currentAgentName, setCurrentAgentName] = useState<string>("");
  const [currentAgentConfigSet, setCurrentAgentConfigSet] = useState<RealtimeAgent[] | null>(null);


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
      logClientEvent({ type: "system.log", message: `Monitoring agent: ${currentAgentName}` }, "agent_monitor_update");
      addTranscriptBreadcrumb(`Agent: ${currentAgentName}`, currentAgent); // Log change for supervisor
      updateSession(!handoffTriggeredRef.current); // Update session, maybe send a meta-event
      handoffTriggeredRef.current = false;
    }
  }, [currentAgentSetKey, currentAgentName, currentAgentConfigSet, sessionStatus]);


  const fetchEphemeralKey = async (): Promise<string | null> => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request_supervisor");
    const tokenResponse = await fetch("/api/session"); // Same endpoint for token
    const data = await tokenResponse.json();
    logServerEvent(data, "fetch_session_token_response_supervisor");

    if (!data.client_secret?.value) {
      logClientEvent(data, "error.no_ephemeral_key_supervisor");
      console.error("Supervisor: No ephemeral key provided by the server");
      setSessionStatus("DISCONNECTED");
      return null;
    }
    return data.client_secret.value;
  };

  const connectToRealtime = async () => {
    const scenarioInfo = supervisorSdkScenarioMap[currentAgentSetKey];
    if (!scenarioInfo) {
      console.error(`Supervisor: Scenario for key ${currentAgentSetKey} not found.`);
      return;
    }
    if (!currentAgentName) {
        console.error(`Supervisor: No agent selected for scenario ${currentAgentSetKey}.`);
        return;
    }


    if (sessionStatus !== "DISCONNECTED") return;
    setSessionStatus("CONNECTING");
    logClientEvent({type: "system.log", message: `Supervisor connecting to session with agent: ${currentAgentName}`}, "supervisor_connect_attempt");

    try {
      const EPHEMERAL_KEY = await fetchEphemeralKey();
      if (!EPHEMERAL_KEY) return;

      const reorderedAgents = [...scenarioInfo.scenario];
      const idx = reorderedAgents.findIndex((a) => a.name === currentAgentName);
      if (idx > 0) {
        const [agent] = reorderedAgents.splice(idx, 1);
        reorderedAgents.unshift(agent);
      } else if (idx === -1 && reorderedAgents.length > 0) {
         // This case should ideally not happen if currentAgentName is always set from the list
         setCurrentAgentName(reorderedAgents[0].name); // Default to first if not found
      }


      const guardrail = createModerationGuardrail(scenarioInfo.companyName);

      await connect({
        getEphemeralKey: async () => EPHEMERAL_KEY,
        initialAgents: reorderedAgents,
        audioElement: sdkAudioElement, // Supervisor listens here
        outputGuardrails: [guardrail],
        extraContext: { addTranscriptBreadcrumb }, // For logging agent changes etc.
        // Supervisor specific: might not need input audio stream or turn detection in the same way
        // For now, it mirrors client, but this could be optimized.
      });
       logClientEvent({type: "system.log", message: `Supervisor connected to session with agent: ${currentAgentName}`}, "supervisor_connect_success");
    } catch (err) {
      console.error("Supervisor: Error connecting via SDK:", err);
      setSessionStatus("DISCONNECTED");
      logClientEvent({type: "system.error", message: `Supervisor connection error: ${err}`}, "supervisor_connect_fail");
    }
  };

  const disconnectFromRealtime = () => {
    disconnect();
    // setSessionStatus("DISCONNECTED"); // This is handled by onConnectionChange
    logClientEvent({type: "system.log", message: "Supervisor disconnected."}, "supervisor_disconnect");
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
      logClientEvent({type: "system.log", message: "Supervisor triggered agent response (if applicable)."}, "supervisor_trigger_response");
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
    logClientEvent({type: "system.log", message: `Supervisor selected agent: ${newAgentName}. Reconnect to activate.`}, "supervisor_agent_select");
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

      <SupervisorControls
        sessionStatus={sessionStatus}
        onToggleConnection={onToggleConnection}
        currentAgentSetKey={currentAgentSetKey}
        handleAgentScenarioChange={handleAgentScenarioChange}
        selectedAgentName={currentAgentName}
        handleSelectedAgentNameChange={handleSelectedAgentNameChange}
        currentAgentConfigSet={currentAgentConfigSet}
        isEventsPaneExpanded={isEventsPaneExpanded}
        setIsEventsPaneExpanded={setIsEventsPaneExpanded}
        isAudioPlaybackEnabled={isAudioPlaybackEnabled}
        setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
        supervisorSdkScenarioMap={supervisorSdkScenarioMap}
      />

      <div className="flex flex-1 p-2 overflow-hidden relative">
        {/* Events component is central to supervisor view */}
        <Events isExpanded={isEventsPaneExpanded} />
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
