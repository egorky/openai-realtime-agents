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
const clientSdkScenarioMap: Record<string, { scenario: RealtimeAgent[], companyName: string }> = {
  customerServiceRetail: { scenario: customerServiceRetailScenario, companyName: customerServiceRetailCompanyName },
  // Example: If simpleHandoff is a client-selectable scenario:
  // simpleHandoff: { scenario: simpleHandoffScenario, companyName: "YourSimpleHandoffService" }, // Assuming a company name for simpleHandoff
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

  const [selectedAgentKey, setSelectedAgentKey] = useState<string>(clientDefaultAgentSetKey);
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
      logClientEvent(eventObj, eventNameSuffix);
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }
  };

  useHandleSessionHistory();

  useEffect(() => {
    const agentConfigFromUrl = searchParams.get("agentConfig");
    let keyToUse = clientDefaultAgentSetKey;

    if (agentConfigFromUrl && clientSdkScenarioMap[agentConfigFromUrl]) {
      keyToUse = agentConfigFromUrl;
    } else if (agentConfigFromUrl) {
      console.warn(`Client: Agent config "${agentConfigFromUrl}" from URL is not recognized or allowed. Using default.`);
      // Optionally add a transcript message about using default
    }
    setSelectedAgentKey(keyToUse);
    // Set the initial agent name from the selected scenario
    if (clientSdkScenarioMap[keyToUse]?.scenario[0]?.name) {
        setCurrentAgentName(clientSdkScenarioMap[keyToUse].scenario[0].name);
    }

  }, [searchParams]);

  useEffect(() => {
    // Auto-connect if agent is set and disconnected
    if (selectedAgentKey && currentAgentName && sessionStatus === "DISCONNECTED") {
      connectToRealtime();
    }
  }, [selectedAgentKey, currentAgentName, sessionStatus]);

   useEffect(() => {
    if (sessionStatus === "CONNECTED" && clientSdkScenarioMap[selectedAgentKey] && currentAgentName) {
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

  const fetchEphemeralKey = async (): Promise<string | null> => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request");
    const tokenResponse = await fetch("/api/session");
    const data = await tokenResponse.json();
    logServerEvent(data, "fetch_session_token_response");

    if (!data.client_secret?.value) {
      logClientEvent(data, "error.no_ephemeral_key");
      console.error("No ephemeral key provided by the server");
      setSessionStatus("DISCONNECTED");
      addTranscriptMessage(uuidv4().slice(0,32), "system", "Error: Could not obtain session token.", true);
      return null;
    }
    return data.client_secret.value;
  };

  const connectToRealtime = async () => {
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
      const EPHEMERAL_KEY = await fetchEphemeralKey();
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
        content: [{ type: 'input_text', text: 'hi' }], // Standard greeting
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
      disconnectFromRealtime();
    } else {
      connectToRealtime();
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

  return (
    <div className="text-base flex flex-col h-screen bg-gray-50 text-gray-800 relative">
      <div className="p-4 text-xl font-semibold flex justify-start items-center border-b bg-white shadow-sm">
        <div>Client Support Portal</div>
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
