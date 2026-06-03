import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import { useChatStore } from '../store/chatStore';

export function ChatInput() {
  const [value, setValue] = useState('');
  const sendMessage = useChatStore((s) => s.sendMessage);
  const isGenerating = useChatStore((s) => s.isGenerating);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isGenerating) return;
    void sendMessage(value);
    setValue('');
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={isGenerating}
        placeholder="Ask the AI architect..."
        aria-label="Message the AI architect"
        className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 transition-all disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!value.trim() || isGenerating}
        aria-label="Send message"
        className="bg-[#4F46E5] hover:bg-[#4F46E5]/90 text-white p-2.5 rounded-full border-b-[3px] border-indigo-800 hover:border-b-[4px] hover:-translate-y-[1px] active:border-b-[1px] active:translate-y-[2px] transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Send size={15} />
      </button>
    </form>
  );
}
