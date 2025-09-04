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
    // Base classes for sizing and appearance, responsive padding/text size
    const baseClasses = "text-white font-semibold py-1.5 px-3 sm:py-2 sm:px-4 rounded-md text-xs sm:text-sm transition-colors duration-150";
    const cursorClass = isConnecting ? "cursor-not-allowed opacity-75" : "cursor-pointer";

    if (isConnected) {
      return `bg-red-500 hover:bg-red-600 ${cursorClass} ${baseClasses}`;
    }
    return `bg-blue-500 hover:bg-blue-600 ${cursorClass} ${baseClasses}`;
  }

  const pttButtonClasses = `
    px-4 py-2 sm:px-5 sm:py-3 rounded-full font-semibold text-white transition-all duration-150 text-xs sm:text-sm
    ${isPTTUserSpeaking ? "bg-red-500 scale-105 shadow-lg" : "bg-green-500 hover:bg-green-600"}
    ${!isPTTActive || !isConnected ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
  `;

  return (
    // Adjusted padding and gaps for different screen sizes. Using justify-between for better space utilization on small screens.
    <div className="bg-gray-100 dark:bg-gray-800 p-2 sm:p-3 md:p-4 flex flex-wrap items-center justify-between sm:justify-center gap-x-2 gap-y-2 sm:gap-x-4 md:gap-x-6 border-t border-gray-200 dark:border-gray-700 shadow-md">
      {/* Status and Connection Button Group */}
      <div className="flex items-center gap-2">
        {/* Status text hidden on very small screens, shown on sm+ */}
        <span className="hidden sm:inline mr-1 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
          Estado:
        </span>
        <span className={`text-xs sm:text-sm font-semibold ${isConnected ? "text-green-500 dark:text-green-400" : "text-yellow-500 dark:text-yellow-400"}`}>
          {sessionStatus}
        </span>
        <button
          onClick={onToggleConnection}
          className={getConnectionButtonClasses()}
          disabled={isConnecting}
        >
          {getConnectionButtonLabel()}
        </button>
      </div>

      {/* PTT Controls Group */}
      <div className="flex items-center gap-1 sm:gap-2">
        <input
          id="client-push-to-talk"
          type="checkbox"
          checked={isPTTActive}
          onChange={(e) => setIsPTTActive(e.target.checked)}
          disabled={!isConnected}
          className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
        />
        <label
          htmlFor="client-push-to-talk"
          className={`text-xs sm:text-sm font-medium ${isConnected ? "text-gray-700 dark:text-gray-300 cursor-pointer" : "text-gray-400 dark:text-gray-500"}`}
        >
          PTT {/* Shortened label, full text "Push-to-Talk" shown on sm+ */}
          <span className="hidden sm:inline"> (Pulsar para hablar)</span>
        </label>
      </div>

      {/* PTT Action Button (only if PTT is active) */}
      {isPTTActive && (
         <button
            onMouseDown={handleTalkButtonDown}
            onMouseUp={handleTalkButtonUp}
            onTouchStart={handleTalkButtonDown}
            onTouchEnd={handleTalkButtonUp}
            disabled={!isPTTActive || !isConnected}
            className={pttButtonClasses}
          >
            {isPTTUserSpeaking ? "Escuchando..." : "Mantener para Hablar"}
          </button>
      )}

      {/* Audio Playback Toggle Group */}
      <div className="flex items-center gap-1 sm:gap-2">
        <input
          id="client-audio-playback"
          type="checkbox"
          checked={isAudioPlaybackEnabled}
          onChange={(e) => setIsAudioPlaybackEnabled(e.target.checked)}
          className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
        />
        <label
          htmlFor="client-audio-playback"
          className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
        >
          Audio {/* Shortened label, full text "Enable Audio" shown on sm+ */}
          <span className="hidden sm:inline"> (Habilitar)</span>
        </label>
      </div>
    </div>
  );
};

export default ClientBottomToolbar;
