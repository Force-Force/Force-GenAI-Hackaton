import { useChatStore } from '../store/chatStore';

const PROMPTS = [
  'Add a promotion dimension table',
  'Add a currency exchange rate dimension',
  'Suggest an ETL pipeline for web orders',
];

export function PromptShortcuts() {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const isGenerating = useChatStore((s) => s.isGenerating);

  return (
    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
      {PROMPTS.map((p) => (
        <button
          key={p}
          disabled={isGenerating}
          onClick={() => void sendMessage(p)}
          className="text-[10px] bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-300 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 border-b-[2.5px] border-b-slate-300 dark:border-b-slate-900 hover:border-b-[3.5px] hover:-translate-y-[1px] active:border-b-[1px] active:translate-y-[1.5px] font-bold transition-all duration-150 cursor-pointer disabled:opacity-40"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
