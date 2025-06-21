"use client";

import React from "react";
import { ExitFullScreenIcon, Cross1Icon } from "@radix-ui/react-icons"; // Using Radix icons as an example

interface WidgetHeaderProps {
  scenarioDisplayName?: string;
  selectedAgentKey?: string;
  currentConversationId?: string | null; // Added
  onClose?: () => void;
}

const WidgetHeader: React.FC<WidgetHeaderProps> = ({ scenarioDisplayName, selectedAgentKey, currentConversationId, onClose }) => {
  const handleMaximize = () => {
    let targetUrl = "/client?displayMode=full"; // Always open in full mode
    if (selectedAgentKey) {
      targetUrl += `&agentConfig=${selectedAgentKey}`;
    }
    if (currentConversationId) {
      targetUrl += `&conversationId=${currentConversationId}`;
    }
    window.open(targetUrl, '_blank');
  };

  return (
    <div className="bg-gray-800 text-white p-2 flex items-center justify-between shadow-md rounded-t-lg">
      <span className="text-sm font-semibold truncate pl-1">
        {scenarioDisplayName || "Asistente de IA"}
      </span>
      <div className="flex items-center gap-x-1">
        <button
          onClick={handleMaximize}
          title="Abrir en ventana completa"
          className="p-1 hover:bg-gray-700 rounded"
        >
          <ExitFullScreenIcon className="w-4 h-4" />
        </button>
        {/* onClose is conceptual for now, would require postMessage to parent if truly closing/hiding iframe */}
        {onClose && (
          <button
            onClick={onClose}
            title="Cerrar widget"
            className="p-1 hover:bg-gray-700 rounded"
          >
            <Cross1Icon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default WidgetHeader;
