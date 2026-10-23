import { useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { python } from '@codemirror/lang-python';
import { Send, RotateCcw } from 'lucide-react';
import type { ProcessingNode } from '../../../types/pipeline';
import { Button } from '../../../components/ui';
import { useChatStore } from '../../chat/store/chatStore';

/**
 * Editable code editor for processing nodes. Allows modifying the source and
 * submitting it back to the AI backend (via chatStore.submitProcessingCode).
 */
export function CodeEditorWidget({ node }: { node: ProcessingNode }) {
  const [code, setCode] = useState(node.data.code);
  const [dirty, setDirty] = useState(false);
  const submit = useChatStore((s) => s.submitProcessingCode);
  const isGenerating = useChatStore((s) => s.isGenerating);

  // Reset local buffer when a different node becomes active.
  useEffect(() => {
    setCode(node.data.code);
    setDirty(false);
  }, [node.id, node.data.code]);

  const language = node.data.language === 'python' ? python() : sql();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">
          {node.data.language} source
        </span>
        <span className="text-[9px] font-mono text-slate-400">
          {dirty ? 'unsaved changes' : 'in sync'}
        </span>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <CodeMirror
          value={code}
          height="240px"
          extensions={[language]}
          onChange={(value) => {
            setCode(value);
            setDirty(value !== node.data.code);
          }}
          aria-label={`${node.data.language} source code editor for ${node.data.label}`}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          className="flex-1"
          disabled={isGenerating}
          onClick={() => {
            void submit(node.id, node.data.language, code);
            setDirty(false);
          }}
        >
          <Send size={12} />
          Submit to AI
        </Button>
        <Button
          variant="secondary"
          disabled={!dirty}
          onClick={() => {
            setCode(node.data.code);
            setDirty(false);
          }}
          aria-label="Revert code changes"
        >
          <RotateCcw size={12} />
        </Button>
      </div>
    </div>
  );
}
