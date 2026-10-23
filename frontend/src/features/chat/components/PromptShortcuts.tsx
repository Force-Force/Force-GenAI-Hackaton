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
          className="text-[10px] bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-300 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 font-semibold transition-colors duration-150 cursor-pointer disabled:opacity-40"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
