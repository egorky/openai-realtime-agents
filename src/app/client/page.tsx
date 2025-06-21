"use client";
import React, { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

// UI components
import Transcript from "@/app/components/Transcript";
// Client-specific toolbar will be handled in a later step. For now, a placeholder.

// Types
import { SessionStatus } from "@/app/types";
import type { RealtimeAgent } from '@openai/agents/realtime';

// Context providers & hooks
import { TranscriptProvider, useTranscript } from "@/app/contexts/TranscriptContext";
import { EventProvider, useEvent } from "@/app/contexts/EventContext"; // EventContext and useEvent are kept as some hooks might depend on them.
import { useRealtimeSession } from "@/app/hooks/useRealtimeSession";
import { createModerationGuardrail } from "@/app/agentConfigs/guardrails";

// Agent configs
// Client will use a more restricted set of agent configurations.
import { allAgentSets, defaultAgentSetKey as globalDefaultAgentSetKey } from "@/app/agentConfigs";
import { customerServiceRetailScenario, customerServiceRetailCompanyName } from "@/app/agentConfigs/customerServiceRetail";
// Import other client-specific scenarios if needed, e.g., simpleHandoffScenario
// import { simpleHandoffScenario } from "@/app/agentConfigs/simpleHandoff";

// Client-specific map for scenarios. Only include scenarios a client can initiate.
// Added displayName for the dropdown
const clientSdkScenarioMap: Record<string, { scenario: RealtimeAgent[], companyName: string, displayName: string }> = {
  customerServiceRetail: { scenario: customerServiceRetailScenario, companyName: customerServiceRetailCompanyName, displayName: "Servicio al Cliente (Retail)" },
  // Example: If simpleHandoff is a client-selectable scenario:
  // simpleHandoff: { scenario: simpleHandoffScenario, companyName: "YourSimpleHandoffService", displayName: "Soporte Simple" },
};

// Determine a safe default agent key for the client page.
// It must be one of the keys in clientSdkScenarioMap.
const clientDefaultAgentSetKey = Object.keys(clientSdkScenarioMap)[0] || 'customerServiceRetail';


import useAudioDownload from "@/app/hooks/useAudioDownload";
import { useHandleSessionHistory } from "@/app/hooks/useHandleSessionHistory";
import ClientBottomToolbar from "@/app/components/ClientBottomToolbar";

function ClientApp() {
  const searchParams = useSearchParams()!;

  const { addTranscriptMessage, addTranscriptBreadcrumb } = useTranscript();
  const { logClientEvent, logServerEvent } = useEvent();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // State for scenario selection step
  const [scenarioSelectionCompleted, setScenarioSelectionCompleted] = useState<boolean>(false);
  const [selectedScenarioKeyForUI, setSelectedScenarioKeyForUI] = useState<string>(clientDefaultAgentSetKey);


  const [selectedAgentKey, setSelectedAgentKey] = useState<string>(""); // Will be set after scenario selection
  // Agent name within the selected scenario (usually the first agent)
  const [currentAgentName, setCurrentAgentName] = useState<string>("");


  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const handoffTriggeredRef = useRef(false);

  const sdkAudioElement = React.useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const el = document.createElement('audio');
    el.autoplay = true;
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
    sendUserText,
    sendEvent,
    interrupt,
    mute,
  } = useRealtimeSession({
    onConnectionChange: (s) => setSessionStatus(s as SessionStatus),
    onAgentHandoff: (agentName: string) => {
      handoffTriggeredRef.current = true;
      setCurrentAgentName(agentName);
      addTranscriptBreadcrumb(`Session handed off to: ${agentName}`);
    },
  });

  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("DISCONNECTED");
  const [userText, setUserText] = useState<string>("");
  const [userIntentionalDisconnect, setUserIntentionalDisconnect] = useState<boolean>(false);
  const [isPTTActive, setIsPTTActive] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('clientPushToTalkUI'); // Client specific storage key
    return stored ? stored === 'true' : false; // Default PTT to false for client
  });
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('clientAudioPlaybackEnabled'); // Client specific
    return stored ? stored === 'true' : true;
  });

  const { startRecording, stopRecording, downloadRecording } = useAudioDownload();

  const sendClientEventHelper = (eventObj: any, eventNameSuffix = "") => {
    try {
      sendEvent(eventObj);
      logClientEvent(eventObj, eventNameSuffix, currentConversationId || undefined);
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }
  };

  useHandleSessionHistory();

  // Effect to handle scenario selection from URL (e.g., deep link) or set up for manual selection
  useEffect(() => {
    const agentConfigFromUrl = searchParams.get("agentConfig");
    if (agentConfigFromUrl && clientSdkScenarioMap[agentConfigFromUrl]) {
      // If a valid scenario is in URL, use it and proceed to chat
      setSelectedAgentKey(agentConfigFromUrl);
      if (clientSdkScenarioMap[agentConfigFromUrl]?.scenario[0]?.name) {
        setCurrentAgentName(clientSdkScenarioMap[agentConfigFromUrl].scenario[0].name);
      }
      setScenarioSelectionCompleted(true);
    } else if (agentConfigFromUrl) {
      console.warn(`Client: Agent config "${agentConfigFromUrl}" from URL is not recognized or allowed. Defaulting to selection.`);
      // Invalid URL config, user will be shown selection page with default selected in dropdown
      setSelectedScenarioKeyForUI(clientDefaultAgentSetKey); // Ensure dropdown shows a valid default
      setScenarioSelectionCompleted(false);
    } else {
      // No scenario in URL, user needs to select
      setScenarioSelectionCompleted(false);
    }
  }, [searchParams]);


  // Auto-connect after scenario selection is completed and valid agent key/name are set
  useEffect(() => {
    if (scenarioSelectionCompleted && selectedAgentKey && currentAgentName && sessionStatus === "DISCONNECTED" && !userIntentionalDisconnect) {
      const scenarioInfo = clientSdkScenarioMap[selectedAgentKey];
      if (scenarioInfo && scenarioInfo.scenario.find(a => a.name === currentAgentName)) {
        connectToRealtime();
      } else {
        console.warn("Client: Auto-connect skipped post-selection. Agent config or name invalid/missing:", selectedAgentKey, currentAgentName);
        addTranscriptMessage(uuidv4().slice(0,32), "system", "Error: No se pudo iniciar la conexión. Configuración de agente inválida.", true);
      }
    }
  }, [scenarioSelectionCompleted, selectedAgentKey, currentAgentName, sessionStatus, userIntentionalDisconnect]);

   useEffect(() => {
    if (sessionStatus === "CONNECTED" && selectedAgentKey && clientSdkScenarioMap[selectedAgentKey] && currentAgentName) {
      const currentAgentConfig = clientSdkScenarioMap[selectedAgentKey].scenario.find(a => a.name === currentAgentName);
      if (handoffTriggeredRef.current) {
         addTranscriptBreadcrumb(`Agent: ${currentAgentName}`, currentAgentConfig);
      }
      updateSession(!handoffTriggeredRef.current); // Trigger initial greeting if not a handoff
      handoffTriggeredRef.current = false;
    }
  }, [selectedAgentKey, currentAgentName, sessionStatus]);


  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      updateSession(); // Update session based on PTT state etc.
    }
  }, [isPTTActive]);

  const handleScenarioSelection = (selectedKey: string) => {
    if (clientSdkScenarioMap[selectedKey]) {
      setSelectedScenarioKeyForUI(selectedKey); // For UI consistency if needed before commit
    }
  };

  const handleProceedToChat = () => {
    if (clientSdkScenarioMap[selectedScenarioKeyForUI]) {
      setSelectedAgentKey(selectedScenarioKeyForUI);
      const scenario = clientSdkScenarioMap[selectedScenarioKeyForUI].scenario;
      if (scenario[0]?.name) {
        setCurrentAgentName(scenario[0].name);
      } else {
        console.error("Client: Selected scenario has no agents defined.");
        addTranscriptMessage(uuidv4().slice(0,32), "system", "Error: El escenario seleccionado no tiene agentes configurados.", true);
        return; // Do not proceed
      }
      setScenarioSelectionCompleted(true);
      // Update URL with selected scenario
      const url = new URL(window.location.toString());
      url.searchParams.set("agentConfig", selectedScenarioKeyForUI);
      window.history.pushState({}, '', url);

    } else {
        console.error("Client: Invalid scenario key on proceed:", selectedScenarioKeyForUI);
        addTranscriptMessage(uuidv4().slice(0,32), "system", "Error: Selección de escenario inválida.", true);
    }
  };


  const fetchEphemeralKey = async (): Promise<string | null> => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request", currentConversationId || undefined);
    let tokenResponseMessage = "Error: Could not obtain session token."; // Default error message

    try {
      const tokenResponse = await fetch("/api/session");
      const data = await tokenResponse.json();
      logServerEvent(data, "fetch_session_token_response", currentConversationId || undefined);

      if (!tokenResponse.ok) {
        // Server responded with an error status (4xx, 5xx)
        // `data` should contain the error structure from our API route
        const serverError = data.error || "Unknown server error";
        const errorDetails = data.details ? (typeof data.details === 'string' ? data.details : JSON.stringify(data.details)) : "";
        tokenResponseMessage = `Error: ${serverError}${errorDetails ? ` (Details: ${errorDetails})` : ''}`;

        console.error(`Failed to fetch ephemeral key: ${tokenResponse.status} ${tokenResponse.statusText}`, data);
        logClientEvent({ error: serverError, details: data.details, status: tokenResponse.status }, "error.fetch_ephemeral_key_failed_status", currentConversationId || undefined);
        setSessionStatus("DISCONNECTED");
        addTranscriptMessage(uuidv4().slice(0,32), "system", tokenResponseMessage, true);
        return null;
      }

      if (!data.client_secret?.value) {
        // Server responded with 200 OK, but the key is missing in the response.
        // This case is now less likely if the server-side check is robust, but good to keep.
        tokenResponseMessage = data.error ? `Error: ${data.error}` : "Error: Session token not found in server response.";
        console.error("No ephemeral key provided by the server, though response was OK:", data);
        logClientEvent(data, "error.no_ephemeral_key_value", currentConversationId || undefined);
        setSessionStatus("DISCONNECTED");
        addTranscriptMessage(uuidv4().slice(0,32), "system", tokenResponseMessage, true);
        return null;
      }

      // Success case
      return data.client_secret.value;

    } catch (error: any) {
      // Catch network errors or issues with `tokenResponse.json()` if response isn't valid JSON
      console.error("Network or parsing error fetching ephemeral key:", error);
      tokenResponseMessage = `Error: Network or server communication issue. ${error.message || ""}`;
      logClientEvent({ error: error.message, type: error.type }, "error.fetch_ephemeral_key_network_or_parse", currentConversationId || undefined);
      setSessionStatus("DISCONNECTED");
      addTranscriptMessage(uuidv4().slice(0,32), "system", tokenResponseMessage, true);
      return null;
    }
  };

  const connectToRealtime = async () => {
    const newConversationId = uuidv4(); // Generate new ID
    setCurrentConversationId(newConversationId);

    const selectedScenarioInfo = clientSdkScenarioMap[selectedAgentKey];
    if (!selectedScenarioInfo) {
        console.error(`Client: No scenario found for agent key "${selectedAgentKey}".`);
        addTranscriptMessage(uuidv4().slice(0,32), "system", `Error: Configuration problem for agent "${selectedAgentKey}".`, true);
        setSessionStatus("DISCONNECTED");
        return;
    }

    if (sessionStatus !== "DISCONNECTED") return;
    setSessionStatus("CONNECTING");
    addTranscriptMessage(uuidv4().slice(0,32), "system", "Connecting to support agent...", false);


    try {
      const EPHEMERAL_KEY = await fetchEphemeralKey(); // This will now use currentConversationId for its logs
      if (!EPHEMERAL_KEY) return; // Error already handled by fetchEphemeralKey

      const scenarioAgents = [...selectedScenarioInfo.scenario];
      // Ensure the currentAgentName (which should be the first in the scenario, or from handoff) is root
      const idx = scenarioAgents.findIndex((a) => a.name === currentAgentName);
      if (idx > 0) {
        const [agentToMoveToFront] = scenarioAgents.splice(idx, 1);
        scenarioAgents.unshift(agentToMoveToFront);
      } else if (idx === -1 && scenarioAgents.length > 0) {
        // If currentAgentName somehow isn't in the list, default to the first one
        setCurrentAgentName(scenarioAgents[0].name);
      }


      const guardrail = createModerationGuardrail(selectedScenarioInfo.companyName);

      await connect({
        getEphemeralKey: async () => EPHEMERAL_KEY,
        initialAgents: scenarioAgents,
        audioElement: sdkAudioElement,
        outputGuardrails: [guardrail],
        extraContext: { addTranscriptBreadcrumb },
      });
      // remove "Connecting..." message or update it
      // addTranscriptMessage(uuidv4().slice(0,32), "system", "Connected.", true); // This will be handled by onConnectionChange
    } catch (err) {
      console.error("Client: Error connecting via SDK:", err);
      setSessionStatus("DISCONNECTED");
      addTranscriptMessage(uuidv4().slice(0,32), "system", "Error connecting to the session. Please try again.", true);
    }
  };

  const disconnectFromRealtime = () => {
    disconnect();
    setSessionStatus("DISCONNECTED"); // This will trigger onConnectionChange
    setIsPTTUserSpeaking(false);
    addTranscriptMessage(uuidv4().slice(0,32), "system", "Disconnected from session.", true);
  };

  const sendGreetingToAgent = () => {
    const id = uuidv4().slice(0, 32);
    // This message is only for the agent, not added to user's transcript directly
    // The agent's response will appear in the transcript.
    sendClientEventHelper({
      type: 'conversation.item.create',
      item: {
        id,
        type: 'message',
        role: 'user', // Sent on behalf of user to trigger agent
        content: [{ type: 'input_text', text: 'hola' }], // Standard greeting
      },
    }, "internal_greeting");
    sendClientEventHelper({ type: 'response.create' }, 'trigger_initial_response');
  };

  const updateSession = (shouldTriggerGreeting: boolean = false) => {
    const turnDetection = isPTTActive
      ? null
      : {
          type: 'server_vad',
          threshold: 0.9,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: true, // Let server VAD trigger responses
        };

    sendEvent({ // sendEvent is from useRealtimeSession
      type: 'session.update',
      session: { turn_detection: turnDetection },
    });

    if (shouldTriggerGreeting) {
      sendGreetingToAgent();
    }
  };

  const handleSendTextMessage = () => {
    if (!userText.trim() || sessionStatus !== "CONNECTED") return;
    interrupt();
    try {
      sendUserText(userText.trim()); // This adds to transcript via SDK events
    } catch (err) {
      console.error('Client: Failed to send text via SDK', err);
      addTranscriptMessage(uuidv4().slice(0,32), "system", "Error sending message.", true);
    }
    setUserText("");
  };

  const handleTalkButtonDown = () => {
    if (sessionStatus !== 'CONNECTED') return;
    interrupt();
    setIsPTTUserSpeaking(true);
    sendClientEventHelper({ type: 'input_audio_buffer.clear' }, 'clear_ptt_buffer');
  };

  const handleTalkButtonUp = () => {
    if (sessionStatus !== 'CONNECTED' || !isPTTUserSpeaking) return;
    setIsPTTUserSpeaking(false);
    sendClientEventHelper({ type: 'input_audio_buffer.commit' }, 'commit_ptt');
    sendClientEventHelper({ type: 'response.create' }, 'trigger_response_ptt');
  };

  const onToggleConnection = () => {
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      setUserIntentionalDisconnect(true); // Set intent before disconnecting
      disconnectFromRealtime();
    } else {
      setUserIntentionalDisconnect(false); // Reset intent before connecting
      // It's also good to ensure agent keys are set before trying to connect
      if (selectedAgentKey && currentAgentName) {
          connectToRealtime();
      } else {
          addTranscriptMessage(uuidv4().slice(0,32), "system", "Please select an agent configuration if available, or ensure default is set.", true);
          console.error("Client: Cannot connect without selectedAgentKey and currentAgentName");
      }
    }
  };

  useEffect(() => {
    localStorage.setItem("clientPushToTalkUI", isPTTActive.toString());
  }, [isPTTActive]);

  useEffect(() => {
    localStorage.setItem("clientAudioPlaybackEnabled", isAudioPlaybackEnabled.toString());
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    if (audioElementRef.current) {
      audioElementRef.current.muted = !isAudioPlaybackEnabled;
      if (isAudioPlaybackEnabled && sessionStatus === "CONNECTED") { // Only play if connected
        audioElementRef.current.play().catch((err) => {
          // console.warn("Client: Autoplay may be blocked by browser:", err);
        });
      } else {
        audioElementRef.current.pause();
      }
    }
    try {
      mute(!isAudioPlaybackEnabled); // SDK mute
    } catch (err) {
      // console.warn('Client: Failed to toggle SDK mute state', err);
    }
  }, [isAudioPlaybackEnabled, sessionStatus]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED" && audioElementRef.current?.srcObject) {
      const remoteStream = audioElementRef.current.srcObject as MediaStream;
      startRecording(remoteStream);
    }
    return () => stopRecording();
  }, [sessionStatus]);

  if (!scenarioSelectionCompleted) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-6">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-gray-700 text-center">Seleccione un Escenario</h1>
          <div className="mb-6">
            <label htmlFor="scenario-select" className="block text-sm font-medium text-gray-700 mb-1">
              Escenario de Conversación:
            </label>
            <select
              id="scenario-select"
              value={selectedScenarioKeyForUI}
              onChange={(e) => handleScenarioSelection(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
            >
              {Object.entries(clientSdkScenarioMap).map(([key, { displayName }]) => (
                <option key={key} value={key}>
                  {displayName}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleProceedToChat}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md text-base transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Continuar al Chat
          </button>
        </div>
         <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              También puede especificar un escenario mediante el parámetro URL `?agentConfig=yourScenarioKey`
            </p>
          </div>
      </div>
    );
  }

  return (
    <div className="text-base flex flex-col h-screen bg-gray-50 text-gray-800 relative">
      <div className="p-4 text-xl font-semibold flex justify-start items-center border-b bg-white shadow-sm">
        <div>Client Support Portal: {clientSdkScenarioMap[selectedAgentKey]?.displayName || selectedAgentKey}</div>
        {/* Add logo here if available */}
      </div>

      <div className="flex flex-1 gap-2 px-2 py-2 overflow-hidden relative">
        <Transcript
          userText={userText}
          setUserText={setUserText}
          onSendMessage={handleSendTextMessage}
          downloadRecording={downloadRecording}
          canSend={sessionStatus === "CONNECTED"}
        />
      </div>

      <ClientBottomToolbar
        sessionStatus={sessionStatus}
        onToggleConnection={onToggleConnection}
        isPTTActive={isPTTActive}
        setIsPTTActive={setIsPTTActive}
        isPTTUserSpeaking={isPTTUserSpeaking}
        handleTalkButtonDown={handleTalkButtonDown}
        handleTalkButtonUp={handleTalkButtonUp}
        isAudioPlaybackEnabled={isAudioPlaybackEnabled}
        setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
      />
    </div>
  );
}

export default function ClientPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading Client Interface...</div>}>
      <TranscriptProvider>
        <EventProvider>
          <ClientApp />
        </EventProvider>
      </TranscriptProvider>
    </Suspense>
  );
}
