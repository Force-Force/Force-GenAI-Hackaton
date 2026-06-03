import { useState } from 'react';
import { X, Copy, Check, Download } from 'lucide-react';
import { Button, CodeBlock } from '../../../components/ui';
import { useWorkspaceStore } from '../store/workspaceStore';

export function ExportModal() {
  const open = useWorkspaceStore((s) => s.exportModalOpen);
  const sql = useWorkspaceStore((s) => s.compiledSql);
  const close = useWorkspaceStore((s) => s.closeExport);
  const projectName = useWorkspaceStore((s) => s.projectName);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    const blob = new Blob([sql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_').toLowerCase()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Compiled DDL export"
      onClick={close}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden border border-transparent dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-sans font-bold text-slate-800 dark:text-slate-100">Compiled Warehouse DDL</h3>
          <button onClick={close} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer" aria-label="Close export dialog">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 overflow-auto">
          <CodeBlock code={sql} className="max-h-[50vh]" />
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <Button variant="secondary" onClick={copy}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="primary" onClick={download}>
            <Download size={13} /> Download .sql
          </Button>
        </div>
      </div>
    </div>
  );
}
