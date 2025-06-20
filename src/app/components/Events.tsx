"use client";

import React, { useRef, useEffect, useState } from "react";
import { useEvent } from "@/app/contexts/EventContext";
import { LoggedEvent } from "@/app/types";

export interface EventsProps {
  isExpanded: boolean;
  filterByConversationId?: string | null; // Added new prop
}

function Events({ isExpanded, filterByConversationId }: EventsProps) { // Added new prop
  const [prevEventLogs, setPrevEventLogs] = useState<LoggedEvent[]>([]);
  const eventLogsContainerRef = useRef<HTMLDivElement | null>(null);

  const { loggedEvents, toggleExpand } = useEvent();

  const eventsToDisplay = filterByConversationId
    ? loggedEvents.filter(log => log.conversationId === filterByConversationId)
    : loggedEvents;

  const getDirectionArrow = (direction: string) => {
    if (direction === "client") return { symbol: "▲", color: "#7f5af0" };
    if (direction === "server") return { symbol: "▼", color: "#2cb67d" };
    return { symbol: "•", color: "#555" };
  };

  useEffect(() => {
    const hasNewEvent = loggedEvents.length > prevEventLogs.length;

    if (isExpanded && hasNewEvent && eventLogsContainerRef.current) {
      eventLogsContainerRef.current.scrollTop =
        eventLogsContainerRef.current.scrollHeight;
    }

    setPrevEventLogs(loggedEvents);
  }, [loggedEvents, isExpanded]);

  return (
    <div
      className={
        (isExpanded ? "w-1/2 overflow-auto" : "w-0 overflow-hidden opacity-0") +
        " transition-all rounded-xl duration-200 ease-in-out flex-col bg-white"
      }
      ref={eventLogsContainerRef}
    >
      {isExpanded && (
        <div>
          <div className="flex items-center justify-between px-6 py-3.5 sticky top-0 z-10 text-base border-b bg-white rounded-t-xl dark:bg-gray-800 dark:border-gray-700">
            <span className="font-semibold dark:text-gray-200">Logs {filterByConversationId ? `(Filtered: ${filterByConversationId.substring(0,6)}...)` : '(All)'}</span>
          </div>
          <div>
            {eventsToDisplay.map((log, idx) => { // Use eventsToDisplay
              const arrowInfo = getDirectionArrow(log.direction);
              const isError =
                log.eventName.toLowerCase().includes("error") ||
                log.eventData?.response?.status_details?.error != null;

              return (
                <div
                  key={`${log.id}-${idx}`} // Assuming log.id might not be unique enough if logs reset, idx helps
                  className="border-t border-gray-200 py-2 px-6 font-mono dark:border-gray-700"
                >
                  <div
                    onClick={() => toggleExpand(log.id)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center flex-1 min-w-0"> {/* Added min-w-0 for better truncation */}
                      <span
                        style={{ color: arrowInfo.color }}
                        className="ml-1 mr-2"
                      >
                        {arrowInfo.symbol}
                      </span>
                      {log.conversationId && (
                        <span
                          className="text-xs text-purple-600 dark:text-purple-400 mr-1 select-all cursor-pointer hidden md:inline"
                          title={log.conversationId}
                          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(log.conversationId!) }}
                        >
                          [{log.conversationId.substring(0, 6)}]
                        </span>
                      )}
                      <span
                        className={
                          "flex-1 text-sm truncate " + // Added truncate
                          (isError ? "text-red-600 dark:text-red-400" : "text-gray-800 dark:text-gray-200")
                        }
                        title={log.eventName} // Show full name on hover
                      >
                        {log.eventName}
                      </span>
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 ml-1 text-xs whitespace-nowrap">
                      {log.timestamp}
                    </div>
                  </div>

                  {log.expanded && log.eventData && (
                    <div className="text-gray-800 dark:text-gray-200 text-left mt-1">
                      {log.conversationId && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">
                          Conv. ID: <span className="select-all cursor-pointer" onClick={() => navigator.clipboard.writeText(log.conversationId!)}>{log.conversationId}</span>
                        </div>
                      )}
                      <pre className="border-l-2 ml-1 border-gray-200 dark:border-gray-600 whitespace-pre-wrap break-words font-mono text-xs mb-2 mt-2 pl-2 bg-gray-50 dark:bg-gray-700/30 p-1.5 rounded">
                        {JSON.stringify(log.eventData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default Events;
