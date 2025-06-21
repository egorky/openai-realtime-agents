"use-client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { TranscriptItem } from "@/app/types";
// Image import no es necesario si PaperPlaneIcon es de Radix y no una imagen SVG local.
// import Image from "next/image";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { DownloadIcon, ClipboardCopyIcon, PaperPlaneIcon } from "@radix-ui/react-icons";
import { GuardrailChip } from "./GuardrailChip";

export interface TranscriptProps {
  userText: string;
  setUserText: (val: string) => void;
  onSendMessage: () => void;
  canSend: boolean;
  downloadRecording: () => void;
}

function Transcript({
  userText,
  setUserText,
  onSendMessage,
  canSend,
  downloadRecording,
}: TranscriptProps) {
  const { transcriptItems, toggleTranscriptItemExpand } = useTranscript();
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const [prevLogsLength, setPrevLogsLength] = useState<number>(0);
  const [justCopied, setJustCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (transcriptContainerRef.current && transcriptItems.length > prevLogsLength) {
      // Ensure scroll happens after DOM update and paint
      requestAnimationFrame(() => {
        if (transcriptContainerRef.current) { // Check ref again as it might have changed
          transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
        }
      });
    }
    setPrevLogsLength(transcriptItems.length);
  }, [transcriptItems, prevLogsLength]);

  // Autofocus on textarea when canSend is true
  useEffect(() => {
    if (canSend && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [canSend]);

  const [canCopy, setCanCopy] = useState(false);

  useEffect(() => {
    // Verificar la disponibilidad de la API del portapapeles al montar el componente
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      setCanCopy(true);
    }
  }, []);

  const handleCopyTranscript = async () => {
    if (!canCopy) {
      console.warn("La copia al portapapeles no es compatible o no está permitida en este contexto.");
      alert("La copia al portapapeles no es compatible en este navegador/contexto."); // O un feedback más sutil
      return;
    }

    let textToCopy = "";
    transcriptItems.forEach(item => {
      if (item.type === "MESSAGE" && !item.isHidden) {
        const prefix = item.role === "user" ? "Usuario: " : "IA: ";
        textToCopy += `${prefix}${item.title}\n`;
      } else if (item.type === "BREADCRUMB" && !item.isHidden) {
        textToCopy += `[Sistema: ${item.title}]\n`;
      }
    });

    try {
      await navigator.clipboard.writeText(textToCopy.trim());
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000);
    } catch (error) {
      console.error("Fallo al copiar transcripción:", error);
      alert("Error al copiar la transcripción."); // O un feedback más sutil
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height to shrink if text is deleted
      const scrollHeight = textareaRef.current.scrollHeight;
      // Consider a max-height for the textarea if it can grow too large
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [userText]);

  return (
    // Main container for the transcript component
    <div className="flex flex-col flex-1 bg-white min-h-0 rounded-lg shadow-md">
      {/* Header for Transcript controls */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sticky top-0 z-10 text-sm sm:text-base border-b bg-gray-50 rounded-t-lg">
        <span className="font-semibold text-gray-700">Conversación</span>
        <div className="flex gap-x-1 sm:gap-x-2">
          <button
            onClick={handleCopyTranscript}
              title={canCopy ? "Copiar transcripción" : "Copia no disponible"}
              disabled={!canCopy}
              className={`p-1.5 sm:px-2 sm:py-1 rounded-md text-gray-700 flex items-center justify-center gap-x-1 text-xs sm:text-sm transition-colors ${canCopy ? "bg-gray-200 hover:bg-gray-300" : "bg-gray-100 cursor-not-allowed opacity-70"}`}
          >
            <ClipboardCopyIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{justCopied ? "¡Copiado!" : (canCopy ? "Copiar" : "No Disp.")}</span>
          </button>
          <button
            onClick={downloadRecording}
            title="Descargar audio"
            className="p-1.5 sm:px-2 sm:py-1 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center gap-x-1 text-xs sm:text-sm transition-colors"
          >
            <DownloadIcon className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Audio</span> {/* Simplified text */}
          </button>
        </div>
      </div>

      {/* Transcript Content - messages list */}
      <div
        ref={transcriptContainerRef}
        className="overflow-y-auto p-2 sm:p-3 md:p-4 flex flex-col gap-y-2 sm:gap-y-3 flex-grow" // Use flex-grow to take available space
      >
        {transcriptItems
          .map((item) => { // No sort here if items are already sorted by context provider
            const {
              itemId, type, role, expanded, timestamp, title = "", isHidden, guardrailResult,
            } = item;

            if (isHidden) return null;

            if (type === "MESSAGE") {
              const isUser = role === "user";
              return (
                <div key={itemId} className={`flex flex-col mb-1 ${isUser ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[85%] sm:max-w-md md:max-w-lg p-2 sm:p-2.5 text-sm rounded-lg ${isUser ? "bg-blue-600 text-white rounded-br-none" : "bg-gray-200 text-gray-800 rounded-bl-none"} shadow`}>
                    <div className={`text-xs mb-0.5 ${isUser ? "text-blue-200" : "text-gray-500"} font-mono`}>
                      {timestamp}
                    </div>
                    <div className={`whitespace-pre-wrap break-words ${(title.startsWith("[") && title.endsWith("]")) ? 'italic text-gray-500' : ''}`}>
                      <ReactMarkdown>{(title.startsWith("[") && title.endsWith("]")) ? title.slice(1, -1) : title}</ReactMarkdown>
                    </div>
                  </div>
                  {guardrailResult && (
                    <div className="px-2 mt-0.5"> {/* Guardrail chip outside the bubble */}
                      <GuardrailChip guardrailResult={guardrailResult} />
                    </div>
                  )}
                </div>
              );
            } else if (type === "BREADCRUMB") {
              return (
                <div key={itemId} className="text-gray-500 text-xs sm:text-sm my-1 px-1">
                  <span className="text-xs font-mono text-gray-400">{timestamp}</span>
                  <div
                    className={`whitespace-pre-wrap flex items-center font-mono text-xs sm:text-sm text-gray-600 ${item.data ? "cursor-pointer hover:text-blue-500" : ""}`}
                    onClick={() => item.data && toggleTranscriptItemExpand(itemId)}
                  >
                    {item.data && (
                      <span className={`text-gray-400 mr-1.5 transform transition-transform duration-200 select-none ${expanded ? "rotate-90" : "rotate-0"}`}>▶</span>
                    )}
                    {title}
                  </div>
                  {expanded && item.data && (
                    <div className="text-gray-600 text-left w-full mt-0.5">
                      <pre className="border-l-2 ml-1 border-gray-300 whitespace-pre-wrap break-words font-mono text-xs p-1.5 bg-gray-100 rounded custom-scrollbar-small">
                        {JSON.stringify(item.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            }
            return ( // Fallback for unknown item types
              <div key={itemId} className="flex justify-center text-gray-400 text-xs italic font-mono py-1">
                Tipo de ítem desconocido: {type} <span className="ml-2">{timestamp}</span>
              </div>
            );
          })}
      </div>

      {/* Input Area */}
      <div className="p-2 sm:p-3 flex items-end gap-x-1.5 sm:gap-x-2 flex-shrink-0 border-t bg-gray-50 border-gray-200 rounded-b-lg">
        <textarea
          ref={textareaRef}
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && canSend && userText.trim()) {
              e.preventDefault();
              onSendMessage();
            }
          }}
          className="flex-1 px-3 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-none overflow-y-auto custom-scrollbar-small"
          placeholder="Escribe un mensaje..."
          rows={1} // Start with 1 row, auto-expands
          style={{ maxHeight: "100px" }} // Limit max height for textarea to prevent pushing toolbar too far
        />
        <button
          onClick={onSendMessage}
          disabled={!canSend || !userText.trim()}
          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1" // Added focus styles
          title="Enviar mensaje"
        >
          <PaperPlaneIcon className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
}

export default Transcript;
