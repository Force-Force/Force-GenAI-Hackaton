import { Bot, User } from 'lucide-react';
import { cn } from '../../../utils/cn';
import type { ChatMessage } from '../types';
import { ActionCard } from './ActionCard';
import { AgentTaskList } from './AgentTaskList';
import { Markdown } from './Markdown';

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isAI = message.sender === 'assistant';

  return (
    <div className={cn('flex flex-col max-w-[90%] animate-fadeIn', isAI ? 'self-start mr-auto' : 'self-end ml-auto')}>
      <div
        className={cn(
          'flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 mb-1 font-mono uppercase tracking-wider',
          isAI ? 'justify-start' : 'justify-end',
        )}
      >
        {isAI ? <Bot size={12} className="text-indigo-600 dark:text-indigo-400" /> : null}
        <span>{isAI ? 'AuraAI Architect' : 'You'}</span>
        {!isAI ? <User size={12} /> : null}
        <span className="text-[9px] text-slate-300 dark:text-slate-600">•</span>
        <span>{message.timestamp}</span>
      </div>

      <div
        className={cn(
          'p-3.5 rounded-xl text-xs leading-relaxed border shadow-sm',
          isAI
            ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            : 'bg-indigo-600 border-indigo-700 text-white',
        )}
      >
        <Markdown inverted={!isAI}>{message.text}</Markdown>

        {isAI && message.action && <ActionCard action={message.action} />}
        {isAI && message.tasks && message.tasks.length > 0 && (
          <AgentTaskList tasks={message.tasks} />
        )}
      </div>
    </div>
  );
}
