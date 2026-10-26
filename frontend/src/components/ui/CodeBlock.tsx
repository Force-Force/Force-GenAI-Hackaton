import { cn } from '../../utils/cn';

interface CodeBlockProps {
  code: string;
  className?: string;
}

/** Dark code preview block with cyan mono text (design system). */
export function CodeBlock({ code, className }: CodeBlockProps) {
  return (
    <div
      className={cn(
        'bg-slate-900 border border-slate-800 rounded-lg p-3 overflow-hidden',
        className,
      )}
    >
      <pre className="font-mono text-[10px] text-cyan-300 leading-snug overflow-auto whitespace-pre custom-scrollbar">
        <code>{code}</code>
      </pre>
    </div>
  );
}
