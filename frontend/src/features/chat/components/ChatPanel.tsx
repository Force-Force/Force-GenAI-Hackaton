import { Bot, ChevronLeft, Wand2 } from 'lucide-react';
import { useWorkspaceStore } from '../../workspace/store/workspaceStore';
import { useChatStore } from '../store/chatStore';
import { cn } from '../../../utils/cn';
import { MessageList } from './MessageList';
import { PromptShortcuts } from './PromptShortcuts';
import { ChatInput } from './ChatInput';

export function ChatPanel() {
  const collapse = useWorkspaceStore((s) => s.setLeftCollapsed);
  const autoApply = useChatStore((s) => s.autoApply);
  const setAutoApply = useChatStore((s) => s.setAutoApply);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 animate-fadeIn">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
            <Bot size={15} />
          </div>
          <div>
            <h2 className="text-sm font-sans font-bold text-slate-800 dark:text-slate-100">AI Data Architect</h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Backend-powered assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAutoApply(!autoApply)}
            role="switch"
            aria-checked={autoApply}
            title={autoApply ? 'Auto-apply is ON — changes are applied automatically' : 'Auto-apply is OFF — apply changes manually'}
            className={cn(
              'flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded-full border transition-colors cursor-pointer',
              autoApply
                ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700',
            )}
          >
            <Wand2 size={11} />
            Auto {autoApply ? 'On' : 'Off'}
          </button>
          <button
            onClick={() => collapse(true)}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
            aria-label="Collapse chat panel"
          >
            <ChevronLeft size={15} />
          </button>
        </div>
      </header>

      <MessageList />

      <div className="border-t border-slate-200 dark:border-slate-800 p-3 bg-slate-50/60 dark:bg-slate-900/60 space-y-2.5">
        <PromptShortcuts />
        <ChatInput />
      </div>
    </div>
  );
}
