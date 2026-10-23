import { useEffect, useMemo, useState } from 'react';
import { Copy, Check, Code2 } from 'lucide-react';
import type { PipelineNode } from '../../../types/pipeline';
import { generateCodeForNode } from '../../../utils/codeGen';
import { cn } from '../../../utils/cn';

type Lang = 'sql' | 'python';

/**
 * Live code-generation panel (Section 3). Renders the SQL and/or Python
 * implementation for the selected node and updates whenever the node changes.
 */
export function GeneratedCodePanel({ node }: { node: PipelineNode }) {
  const generated = useMemo(() => generateCodeForNode(node), [node]);
  const available = useMemo<Lang[]>(
    () => (['sql', 'python'] as Lang[]).filter((l) => generated[l].trim().length > 0),
    [generated],
  );

  const [lang, setLang] = useState<Lang>(generated.language);
  const [copied, setCopied] = useState(false);

  // Keep the active tab valid as the selection changes.
  useEffect(() => {
    if (!available.includes(lang)) setLang(available[0] ?? generated.language);
    setCopied(false);
  }, [available, generated.language, lang]);

  if (available.length === 0) return null;

  const code = generated[lang];

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
          <Code2 size={12} /> Generated Code
        </span>
        <div className="flex items-center gap-1">
          {available.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={cn(
                'text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-colors cursor-pointer',
                lang === l
                  ? 'bg-[#4F46E5] text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <button
          onClick={copy}
          className="absolute top-2 right-2 z-10 flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-slate-300 hover:text-white bg-slate-800/80 px-1.5 py-1 rounded cursor-pointer"
          aria-label="Copy generated code"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <pre className="bg-slate-900 border border-slate-800 rounded-lg p-3 overflow-auto max-h-[300px] font-mono text-[10px] text-cyan-300 leading-snug whitespace-pre">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
