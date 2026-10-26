import { useState } from "react";
import { User, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "../../../utils/cn";
import { UiopBatchCard } from "../../uiop/components/UiopBatchCard";
import type { ChatMessage } from "../types";
import { AgentTaskList } from "./AgentTaskList";
import { Markdown } from "./Markdown";
import logoUrl from "../../../assets/logo.png";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isAI = message.sender === "assistant";
  const [openUiop, setOpenUiop] = useState(false);

  return (
    <div
      className={cn(
        "flex flex-col max-w-[90%] animate-fadeIn font-sans",
        isAI ? "self-start mr-auto" : "self-end ml-auto",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs text-slate-400 mb-1 font-sans",
          isAI ? "justify-start" : "justify-end",
        )}
      >
        {isAI ? (
          <img
            src={logoUrl}
            alt="AuraBI"
            className="w-3.5 h-3.5 object-contain select-none shrink-0"
          />
        ) : null}
        <span className="font-semibold text-slate-700">
          {isAI ? "AuraBI Assistant" : "You"}
        </span>
        {!isAI ? <User size={13} /> : null}
        <span className="text-slate-300">·</span>
        <span className="tabular-nums">{message.timestamp}</span>
      </div>

      <div
        className={cn(
          "p-4 rounded-xl text-sm leading-relaxed border shadow-xs space-y-2.5",
          isAI
            ? "bg-white border-slate-200 text-slate-700"
            : "bg-[#1E2D24] border-[#1E2D24] text-white",
        )}
      >
        <Markdown inverted={!isAI}>{message.text}</Markdown>

        {isAI && message.uiop && (
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setOpenUiop((v) => !v)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer select-none"
            >
              <Sparkles size={12} className="text-[#D66F14]" />
              <span>
                Thought Process & Pipeline Operations (
                {message.uiop.operations.length})
              </span>
              <span className="text-slate-400 ml-auto">
                {openUiop ? (
                  <ChevronDown size={13} />
                ) : (
                  <ChevronRight size={13} />
                )}
              </span>
            </button>
            {openUiop && (
              <div className="mt-2">
                <UiopBatchCard envelope={message.uiop} />
              </div>
            )}
          </div>
        )}

        {isAI && message.tasks && message.tasks.length > 0 && (
          <AgentTaskList tasks={message.tasks} />
        )}
      </div>
    </div>
  );
}
