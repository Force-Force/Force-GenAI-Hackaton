import { useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { MessageBubble } from './MessageBubble';
import logoUrl from '../../../assets/logo.png';

export function MessageList() {
  const messages = useChatStore((s) => s.messages);
  const isGenerating = useChatStore((s) => s.isGenerating);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4 custom-scrollbar" role="log" aria-live="polite">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}

      {isGenerating && (
        <div className="flex flex-col max-w-[85%] self-start gap-2 animate-pulse">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono uppercase tracking-wider">
            <img
              src={logoUrl}
              alt="AuraBI"
              className="w-3.5 h-3.5 object-contain select-none"
            />
            <span>AuraAI thinking...</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2.5 w-72">
            <div className="h-3.5 bg-slate-200 rounded-full w-2/3" />
            <div className="h-2.5 bg-slate-200 rounded-full w-11/12" />
            <div className="h-2.5 bg-slate-200 rounded-full w-4/5" />
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
