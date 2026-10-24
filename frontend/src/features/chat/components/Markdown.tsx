import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../../../utils/cn';

/**
 * Markdown renderer for AI responses (Section 6). Supports GFM: headers, lists,
 * tables, fenced code, blockquotes, links, and inline formatting. Styling is
 * theme-aware and tuned for the compact chat bubble.
 *
 * `inverted` flips colours for the user's indigo bubble.
 */
const components = (inverted: boolean): Components => ({
  h1: ({ children }) => <h1 className="text-sm font-bold mt-2 mb-1 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-bold mt-2 mb-1 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-[13px] font-bold mt-2 mb-1 first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="text-xs font-bold mt-2 mb-1 first:mt-0">{children}</h4>,
  p: ({ children }) => <p className="leading-relaxed my-1.5 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-4 my-1.5 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 my-1.5 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        'underline underline-offset-2 font-medium',
        inverted ? 'text-[#FDFFFC]/90' : 'text-[#064C1C]',
      )}
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote
      className={cn(
        'border-l-2 pl-3 my-2 italic',
        inverted ? 'border-[#FDFFFC]/40 text-[#FDFFFC]/85' : 'border-[#D66F14]/50 text-[#334139]/75',
      )}
    >
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = (className ?? '').includes('language-');
    if (isBlock) {
      return (
        <pre className="bg-[#1E2D24] border border-[#334139]/30 rounded-lg p-2.5 my-2 overflow-auto custom-scrollbar">
          <code className="font-mono text-[10.5px] text-[#FDFFFC] leading-snug whitespace-pre">
            {children}
          </code>
        </pre>
      );
    }
    return (
      <code
        className={cn(
          'font-mono text-[11px] px-1 py-0.5 rounded',
          inverted ? 'bg-white/15 text-[#FDFFFC]' : 'bg-[#334139]/[0.08] text-[#1E2D24]',
        )}
      >
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto custom-scrollbar">
      <table className="w-full text-[11px] border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className={inverted ? 'bg-white/10' : 'bg-[#334139]/[0.06]'}>{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border border-[#334139]/20 px-2 py-1 text-left font-bold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-[#334139]/15 px-2 py-1">{children}</td>
  ),
  hr: () => <hr className="my-2 border-[#334139]/15" />,
});

export function Markdown({ children, inverted = false }: { children: string; inverted?: boolean }) {
  return (
    <div className="break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components(inverted)}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
