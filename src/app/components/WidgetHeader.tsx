"use client";

import React from "react";
import { ExitFullScreenIcon, Cross1Icon } from "@radix-ui/react-icons"; // Using Radix icons as an example

interface WidgetHeaderProps {
  scenarioDisplayName?: string;
  selectedAgentKey?: string; // To pass to window.open for full view
  onClose?: () => void; // Optional: if the widget itself can request to be hidden (via postMessage)
}

const WidgetHeader: React.FC<WidgetHeaderProps> = ({ scenarioDisplayName, selectedAgentKey, onClose }) => {
  const handleMaximize = () => {
    // Open the full client page in a new tab/window
    // Pass current agentConfig if available, so the full page opens with the same scenario
    const targetUrl = selectedAgentKey ? `/client?agentConfig=${selectedAgentKey}` : '/client';
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
