import { Bot, User } from 'lucide-react';
import { cn } from '../../../utils/cn';
import type { ChatMessage } from '../types';
import { ActionCard } from './ActionCard';

function renderLine(line: string, index: number, isAI: boolean) {
  if (line.startsWith('### ')) {
    return (
      <h4 key={index} className={cn('text-sm font-semibold mt-2', isAI ? 'text-slate-900' : 'text-white')}>
        {line.replace('### ', '')}
      </h4>
    );
  }
  if (line.startsWith('• ') || line.startsWith('- ')) {
    return (
      <div key={index} className={cn('pl-2 flex items-start gap-1.5 mt-1', isAI ? 'text-slate-700' : 'text-indigo-100')}>
        <span className="text-indigo-500">•</span>
        <span>{line.replace(/^[•-] /, '')}</span>
      </div>
    );
  }
  return (
    <p key={index} className={cn('leading-relaxed', isAI ? 'text-slate-700' : 'text-indigo-50')}>
      {line}
    </p>
  );
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isAI = message.sender === 'assistant';

  return (
    <div className={cn('flex flex-col max-w-[90%]', isAI ? 'self-start mr-auto' : 'self-end ml-auto')}>
      <div className={cn('flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 font-mono uppercase tracking-wider', isAI ? 'justify-start' : 'justify-end')}>
        {isAI ? <Bot size={12} className="text-indigo-600" /> : null}
        <span>{isAI ? 'AuraAI Architect' : 'You'}</span>
        {!isAI ? <User size={12} /> : null}
        <span className="text-[9px] text-slate-300">•</span>
        <span>{message.timestamp}</span>
      </div>

      <div
        className={cn(
          'p-3.5 rounded-xl text-xs leading-relaxed border shadow-sm',
          isAI ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-indigo-600 border-indigo-700 text-white',
        )}
      >
        <div className="space-y-2 whitespace-pre-wrap">
          {message.text.split('\n').map((line, i) => renderLine(line, i, isAI))}
        </div>

        {isAI && message.action && <ActionCard action={message.action} />}
      </div>
    </div>
  );
}
