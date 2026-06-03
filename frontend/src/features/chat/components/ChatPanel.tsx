import { Bot, ChevronLeft } from 'lucide-react';
import { useWorkspaceStore } from '../../workspace/store/workspaceStore';
import { MessageList } from './MessageList';
import { PromptShortcuts } from './PromptShortcuts';
import { ChatInput } from './ChatInput';

export function ChatPanel() {
  const collapse = useWorkspaceStore((s) => s.setLeftCollapsed);

  return (
    <div className="h-full flex flex-col bg-white border-r border-slate-200">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
            <Bot size={15} />
          </div>
          <div>
            <h2 className="text-sm font-sans font-bold text-slate-800">AI Data Architect</h2>
            <p className="text-[10px] text-slate-400 font-mono">Backend-powered assistant</p>
          </div>
        </div>
        <button
          onClick={() => collapse(true)}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
          aria-label="Collapse chat panel"
        >
          <ChevronLeft size={15} />
        </button>
      </header>

      <MessageList />

      <div className="border-t border-slate-200 p-3 bg-slate-50/60 space-y-2.5">
        <PromptShortcuts />
        <ChatInput />
      </div>
    </div>
  );
}
