"use client";
import React from "react";
import { SessionStatus } from "@/app/types";

interface ClientBottomToolbarProps {
  sessionStatus: SessionStatus;
  onToggleConnection: () => void;
  isPTTActive: boolean;
  setIsPTTActive: (val: boolean) => void;
  isPTTUserSpeaking: boolean;
  handleTalkButtonDown: () => void;
  handleTalkButtonUp: () => void;
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (val: boolean) => void;
  // Codec selection and Logs toggle are removed for client view
}

const ClientBottomToolbar: React.FC<ClientBottomToolbarProps> = ({
  sessionStatus,
  onToggleConnection,
  isPTTActive,
  setIsPTTActive,
  isPTTUserSpeaking,
  handleTalkButtonDown,
  handleTalkButtonUp,
  isAudioPlaybackEnabled,
  setIsAudioPlaybackEnabled,
}) => {
  const isConnected = sessionStatus === "CONNECTED";
  const isConnecting = sessionStatus === "CONNECTING";

  function getConnectionButtonLabel() {
    if (isConnected) return "Disconnect";
    if (isConnecting) return "Connecting...";
    return "Connect";
  }

  function getConnectionButtonClasses() {
    const baseClasses = "text-white font-semibold py-2 px-4 rounded-md text-sm transition-colors duration-150";
    const cursorClass = isConnecting ? "cursor-not-allowed opacity-75" : "cursor-pointer";

    if (isConnected) {
      return `bg-red-500 hover:bg-red-600 ${cursorClass} ${baseClasses}`;
    }
    return `bg-blue-500 hover:bg-blue-600 ${cursorClass} ${baseClasses}`;
  }

  const pttButtonClasses = `
    px-5 py-3 rounded-full font-semibold text-white transition-all duration-150
    ${isPTTUserSpeaking ? "bg-red-500 scale-105 shadow-lg" : "bg-green-500 hover:bg-green-600"}
    ${!isPTTActive || !isConnected ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
  `;

  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-gray-200 dark:border-gray-700 shadow-md">
      <div className="flex items-center">
        <span className="mr-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          Status: <span className={`font-semibold ${isConnected ? "text-green-500 dark:text-green-400" : "text-yellow-500 dark:text-yellow-400"}`}>{sessionStatus}</span>
        </span>
        <button
          onClick={onToggleConnection}
          className={getConnectionButtonClasses()}
          disabled={isConnecting}
        >
          {getConnectionButtonLabel()}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="client-push-to-talk"
          type="checkbox"
          checked={isPTTActive}
          onChange={(e) => setIsPTTActive(e.target.checked)}
          disabled={!isConnected}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
        />
        <label
          htmlFor="client-push-to-talk"
          className={`text-sm font-medium ${isConnected ? "text-gray-700 dark:text-gray-300 cursor-pointer" : "text-gray-400 dark:text-gray-500"}`}
        >
          Push-to-Talk
        </label>
      </div>

      {isPTTActive && (
         <button
            onMouseDown={handleTalkButtonDown}
            onMouseUp={handleTalkButtonUp}
            onTouchStart={handleTalkButtonDown} // For touch devices
            onTouchEnd={handleTalkButtonUp} // For touch devices
            disabled={!isPTTActive || !isConnected}
            className={pttButtonClasses}
          >
            {isPTTUserSpeaking ? "Listening..." : "Hold to Talk"}
          </button>
      )}

      <div className="flex items-center gap-2">
        <input
          id="client-audio-playback"
          type="checkbox"
          checked={isAudioPlaybackEnabled}
          onChange={(e) => setIsAudioPlaybackEnabled(e.target.checked)}
          // Audio playback can be toggled even if not connected, to prepare preference
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
        />
        <label
          htmlFor="client-audio-playback"
          className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
        >
          Enable Audio
        </label>
      </div>
    </div>
  );
};

export default ClientBottomToolbar;
