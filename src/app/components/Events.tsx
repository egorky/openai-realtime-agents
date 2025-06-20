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
    <div // Root div
      className={
        `transition-all duration-200 ease-in-out flex flex-col ` +
        (isExpanded ? "w-full h-full" : "w-0 h-full opacity-0")
      }
    >
      {isExpanded && (
        <> {/* Use Fragment as we don't need an extra div for styling here */}
          <div className="flex items-center justify-between px-4 py-3 sticky top-0 z-10 text-base border-b border-gray-600 bg-gray-750 rounded-t-lg dark:bg-gray-850 dark:border-gray-700"> {/* Header, adjusted padding/bg */}
            <span className="font-semibold text-gray-100 dark:text-gray-200">
              {filterByConversationId
                ? `Logs (Filtered: ${filterByConversationId.substring(0,6)}...)`
                : "Logs (All)"}
            </span>
            {/* Maybe a clear filter button or other controls here later */}
          </div>
          <div // This is the scrollable container for log items
            className="flex-grow overflow-y-auto custom-scrollbar p-1 bg-gray-700 dark:bg-gray-800" // Ensure background for scroll area
            ref={eventLogsContainerRef} // Moved ref here for scrolling content, not header
          >
            {eventsToDisplay.length === 0 && (
              <div className="text-center text-gray-400 dark:text-gray-500 py-10">No events to display.</div>
            )}
            {eventsToDisplay.map((log, idx) => {
              const arrowInfo = getDirectionArrow(log.direction);
              const isError =
                log.eventName.toLowerCase().includes("error") ||
                log.eventData?.response?.status_details?.error != null;

              return (
                <div
                  key={`${log.id}-${idx}`}
                  className={`border-b border-gray-600 dark:border-gray-700 py-1.5 px-2 font-mono text-xs hover:bg-gray-650 dark:hover:bg-gray-750 transition-colors duration-100 ${isError ? "bg-red-900/20 hover:bg-red-800/30" : ""}`} // Adjusted padding/border
                >
                  <div
                    onClick={() => toggleExpand(log.id)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <span
                        style={{ color: arrowInfo.color }}
                        className="ml-1 mr-2 text-sm" // Slightly larger arrow
                      >
                        {arrowInfo.symbol}
                      </span>
                      {log.conversationId && (
                        <span
                          className="text-xs text-purple-400 dark:text-purple-300 mr-1.5 select-all cursor-pointer hidden md:inline hover:underline"
                          title={log.conversationId}
                          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(log.conversationId!) }}
                        >
                          [{log.conversationId.substring(0, 6)}]
                        </span>
                      )}
                      <span
                        className={
                          "flex-1 text-xs truncate " +
                          (isError ? "text-red-400 dark:text-red-300" : "text-gray-200 dark:text-gray-100")
                        }
                        title={log.eventName}
                      >
                        {log.eventName}
                      </span>
                    </div>
                    <div className="text-gray-400 dark:text-gray-500 ml-2 text-xs whitespace-nowrap">
                      {log.timestamp}
                    </div>
                  </div>

                  {log.expanded && log.eventData && (
                    <div className="text-gray-300 dark:text-gray-200 text-left mt-1.5 ml-2 pl-2 border-l-2 border-gray-500 dark:border-gray-600">
                      {log.conversationId && (
                        <div className="text-2xs text-gray-400 dark:text-gray-500 mb-1"> {/* Adjusted size */}
                          Conv. ID: <span className="select-all cursor-pointer hover:underline" onClick={() => navigator.clipboard.writeText(log.conversationId!)}>{log.conversationId}</span>
                        </div>
                      )}
                      <pre className="whitespace-pre-wrap break-all font-mono text-2xs mb-1 p-1.5 rounded bg-gray-650 dark:bg-gray-750 custom-scrollbar-small"> {/* Adjusted size and bg */}
                        {JSON.stringify(log.eventData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default Events;
