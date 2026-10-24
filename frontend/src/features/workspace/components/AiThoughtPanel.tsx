import { useState, useEffect, useRef } from 'react';
import {
  Bot,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Wand2,
  Loader2,
  Activity,
  PlayCircle,
  Brain,
} from 'lucide-react';
import { useChatStore } from '../../chat/store/chatStore';
import { usePipelineStore } from '../store/pipelineStore';
import { cn } from '../../../utils/cn';
import type { PipelineNode } from '../../../types/pipeline';
import type { AiAction } from '../../../contracts/aiActions';

interface ThoughtBlock {
  id: string;
  title: string;
  category: 'discovery' | 'transformation' | 'modeling' | 'prompt' | 'selection';
  status: 'completed' | 'running' | 'pending';
  executionSteps: string[];
  thoughtProcess: string[];
  action?: AiAction | null;
  timestamp?: string;
}

/** Formats a node into its execution script filename (e.g. `cleanse.sql`, `rfm.py`). */
function getScriptFileName(node: PipelineNode): string {
  if (node.data.category === 'processing') {
    const ext = node.data.language === 'python' ? 'py' : 'sql';
    const label = node.data.label.replace(/\.(sql|py)$/i, '');
    return `${label}.${ext}`;
  }
  return `${node.data.label}.sql`;
}

export function AiThoughtPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapsedBlocks, setCollapsedBlocks] = useState<Record<string, boolean>>({});

  const messages = useChatStore((s) => s.messages);
  const isGenerating = useChatStore((s) => s.isGenerating);
  const applyAction = useChatStore((s) => s.applyAction);

  const nodes = usePipelineStore((s) => s.nodes);
  const edges = usePipelineStore((s) => s.edges);
  const selectedNodeId = usePipelineStore((s) => s.selectedNodeId);

  const scrollRef = useRef<HTMLDivElement>(null);

  // User prompts & AI replies excluding the initial static welcome banner
  const conversationTurns = messages.filter((m) => m.id !== 'welcome');
  const lastUserMessage = [...conversationTurns].reverse().find((m) => m.sender === 'user');

  // Auto-scroll when new thought blocks arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationTurns.length, isGenerating, selectedNodeId]);

  const toggleBlock = (id: string) => {
    setCollapsedBlocks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const resourceNodes = nodes.filter((n) => n.data.category === 'resource');
  const processingNodes = nodes.filter((n) => n.data.category === 'processing');
  const containerNodes = nodes.filter((n) => n.data.category === 'datamart');
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // 1. Source Discovery Thought Block
  const discoveryBlock: ThoughtBlock = {
    id: 'block-discovery',
    title: 'Source Ingestion & Virtual Layer Discovery',
    category: 'discovery',
    status: 'completed',
    executionSteps: [
      'executing inspect_zetaris_catalog.py...',
      ...resourceNodes.map(
        (n) =>
          `connecting ${n.data.label} (${
            n.data.category === 'resource' ? (n.data.format ?? n.data.kind) : 'source'
          } • ${n.data.category === 'resource' ? n.data.columns.length : 0} columns)`,
      ),
    ],
    thoughtProcess: [
      'Auditing schema definitions across external databases, CSVs, and REST endpoints.',
      'Configuring Zetaris virtualization access layer to allow SQL queries without physical replication.',
      'Checking primary keys and unique identifiers across raw sources for downstream joins.',
    ],
  };

  // 2. Transformation Pipeline Thought Block
  const transformationBlock: ThoughtBlock = {
    id: 'block-transformation',
    title: 'Data Transformation & DAG Lineage',
    category: 'transformation',
    status: 'completed',
    executionSteps: [
      ...processingNodes.map((n) => `executing ${getScriptFileName(n)}...`),
      `verifying ${edges.length} active Cinnamon lineage links across DAG topology`,
    ],
    thoughtProcess: [
      'Decomposing raw transactional inputs into staged, cleansed, and enriched formats.',
      'Applying pushdown filters early in the processing DAG to eliminate nulls and reduce compute overhead.',
      'Ensuring staging models maintain deterministic column names and types for warehouse compatibility.',
    ],
  };

  // 3. Dimensional Modeling Thought Block
  const modelingBlock: ThoughtBlock = {
    id: 'block-modeling',
    title: 'Dimensional Star-Schema Synthesis',
    category: 'modeling',
    status: 'completed',
    executionSteps: [
      'executing generate_star_schema.sql...',
      ...containerNodes.map(
        (c) =>
          `materializing ${c.data.label} (${
            c.data.category === 'datamart' ? c.data.children.nodes.length : 0
          } nested tables)`,
      ),
    ],
    thoughtProcess: [
      'Synthesizing Kimball-compliant dimensional model with surrogate keys for slow-changing dimensions.',
      'Enforcing referential integrity constraints between fact measures and dimension tables.',
      'Structuring aggregated rollup metrics for performant BI dashboards and ad-hoc analytical queries.',
    ],
  };

  // Assemble dynamic blocks
  const blocks: ThoughtBlock[] = [discoveryBlock, transformationBlock, modelingBlock];

  // Selected node focus block if user clicked a node
  if (selectedNode) {
    const upstream = edges.filter((e) => e.target === selectedNode.id).length;
    const downstream = edges.filter((e) => e.source === selectedNode.id).length;
    const isProc = selectedNode.data.category === 'processing';

    blocks.push({
      id: `block-selection-${selectedNode.id}`,
      title: `Focused Node: ${selectedNode.data.label}`,
      category: 'selection',
      status: 'completed',
      executionSteps: [
        ...(isProc ? [`executing ${getScriptFileName(selectedNode)}...`] : []),
        `inspecting ${selectedNode.data.label} node schema attributes`,
        `tracing ${upstream} upstream source(s) and ${downstream} downstream consumer(s)`,
      ],
      thoughtProcess: [
        selectedNode.data.description ||
          'Evaluating entity role within overall data warehouse architecture.',
        'Verifying that all required input columns are satisfied by parent nodes in the DAG.',
      ],
    });
  }

  // Conversation turns (user prompts & AI actions)
  conversationTurns.forEach((msg, idx) => {
    if (msg.sender === 'user') {
      blocks.push({
        id: `block-user-${msg.id}`,
        title: `Prompt: "${msg.text}"`,
        category: 'prompt',
        status: 'completed',
        timestamp: msg.timestamp,
        executionSteps: [
          'executing parse_user_intent.py...',
          'executing schema_entity_lookup.sql...',
          'executing evaluate_graph_dependencies.py...',
        ],
        thoughtProcess: [
          `Interpreted user directive: "${msg.text}".`,
          'Identified required schema alterations and checked for circular references in DAG.',
          'Synthesizing minimal impact action plan to fulfill user request.',
        ],
      });
    } else {
      // Assistant response block
      const executionSteps: string[] = [];
      if (msg.action) {
        if (msg.action.type === 'create_processing') {
          const ext = msg.action.payload.language === 'python' ? 'py' : 'sql';
          executionSteps.push(`executing ${msg.action.payload.label}.${ext}...`);
        } else {
          executionSteps.push(`executing apply_${msg.action.type}.sql...`);
        }
      }
      executionSteps.push('finalizing graph state and validation checks');

      blocks.push({
        id: `block-ai-${msg.id}`,
        title: `Agent Response #${idx + 1}`,
        category: 'prompt',
        status: 'completed',
        timestamp: msg.timestamp,
        executionSteps,
        thoughtProcess: [
          msg.text.replace(/^###\s+/gm, '').trim(),
          ...(msg.tasks && msg.tasks.length > 0
            ? msg.tasks.map((t) => `Delegated sub-agent [${t.agent_role}]: ${t.instruction || t.status}`)
            : []),
        ],
        action: msg.action,
      });
    }
  });

  // If AI is currently generating in real time
  if (isGenerating) {
    blocks.push({
      id: 'block-generating',
      title: 'Synthesizing Architecture Updates...',
      category: 'prompt',
      status: 'running',
      executionSteps: [
        'executing agent_master_reasoner.py...',
        'executing compute_optimal_join_path.sql...',
      ],
      thoughtProcess: [
        'Analyzing column types across connected sources to generate transformation code.',
        'Evaluating query pushdown feasibility against Zetaris virtual catalog.',
      ],
    });
  }

  if (isCollapsed) {
    return (
      <div className="absolute left-4 top-20 z-20">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          style={{ backgroundColor: '#FDFFFC' }}
          className="group flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border border-[#334139]/20 shadow-md hover:border-[#064C1C] transition-all cursor-pointer"
          aria-label="Expand AI Thought Process panel"
          title="Expand AI Thought Process"
        >
          <span className="relative flex h-2.5 w-2.5">
            {isGenerating ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D66F14] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D66F14]" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#064C1C]" />
            )}
          </span>
          <Bot size={15} className="text-[#064C1C] group-hover:text-[#D66F14] transition-colors" />
          <span className="text-xs font-bold text-[#334139]">AI Thoughts</span>
          <ChevronRight size={14} className="text-[#334139]/60 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="AI Thought Process Panel"
      style={{ backgroundColor: '#FDFFFC' }}
      className="absolute left-4 top-20 z-20 w-80 md:w-[350px] max-h-[calc(100vh-11.5rem)] flex flex-col rounded-2xl border border-[#334139]/20 shadow-lg backdrop-blur-md overflow-hidden transition-all"
    >
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-[#334139]/12 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            style={{ backgroundColor: isGenerating ? '#D66F14' : '#064C1C' }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#FDFFFC] shadow-2xs transition-colors shrink-0"
          >
            {isGenerating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Bot size={16} />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-tight text-[#334139] truncate">
              AI Thought Process
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#334139]/60 hover:text-[#334139] hover:bg-[#334139]/8 transition-colors cursor-pointer shrink-0 ml-1"
          aria-label="Collapse AI Thought Process panel"
          title="Minimize panel"
        >
          <ChevronLeft size={15} />
        </button>
      </div>

      {/* Bullet Points Stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 text-xs"
      >
        {blocks.map((block) => {
          const isCollapsed = !!collapsedBlocks[block.id];
          return (
            <div
              key={block.id}
              className={cn(
                'rounded-xl border transition-all overflow-hidden bg-white/90 shadow-2xs',
                block.status === 'running'
                  ? 'border-[#D66F14]/40 bg-[#D66F14]/5'
                  : 'border-[#334139]/15 hover:border-[#334139]/30',
              )}
            >
              {/* Bullet Point Header */}
              <div
                onClick={() => toggleBlock(block.id)}
                className="w-full px-3 py-2.5 flex items-start gap-2 cursor-pointer select-none"
              >
                {/* Primary Bullet Marker */}
                <span
                  className={cn(
                    'font-bold text-sm leading-none mt-0.5 shrink-0',
                    block.status === 'running' ? 'text-[#D66F14]' : 'text-[#064C1C]',
                  )}
                >
                  •
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <h3 className="font-bold text-[#334139] text-[11.5px] truncate">
                      {block.title}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0 text-[#334139]/45">
                      {block.timestamp && (
                        <span className="text-[9px] font-mono">{block.timestamp}</span>
                      )}
                      {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-sections: Execution steps & Thought process */}
              {!isCollapsed && (
                <div className="px-3 pb-3 pt-0 space-y-2.5">
                  {/* Under which: Execution steps */}
                  <div className="pt-2 border-t border-[#334139]/10">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#334139]/70 flex items-center gap-1.5 mb-1.5">
                      <PlayCircle size={11} className="text-[#064C1C]" />
                      <span>Execution steps:</span>
                    </div>
                    <ul className="space-y-1 pl-1">
                      {block.executionSteps.map((step, idx) => {
                        const isCodeExecution = step.startsWith('executing ');
                        return (
                          <li
                            key={idx}
                            className="flex items-start gap-1.5 text-[11px] leading-snug"
                          >
                            <span className="text-[#334139]/40 mt-0.5 shrink-0">•</span>
                            {isCodeExecution ? (
                              <code className="font-mono text-[10.5px] text-[#064C1C] font-semibold bg-[#064C1C]/8 px-1.5 py-0.5 rounded border border-[#064C1C]/15 truncate">
                                {step}
                              </code>
                            ) : (
                              <span className="text-[#334139]/80 font-sans">{step}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Under which: Thought process */}
                  <div className="pt-2 border-t border-[#334139]/10">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#D66F14] flex items-center gap-1.5 mb-1.5">
                      <Brain size={11} className="text-[#D66F14]" />
                      <span>Thought process:</span>
                    </div>
                    <ul className="space-y-1 pl-1">
                      {block.thoughtProcess.map((thought, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-1.5 text-[11px] leading-snug text-[#334139]/85 font-sans"
                        >
                          <span className="text-[#D66F14]/70 mt-0.5 shrink-0">•</span>
                          <span className="whitespace-pre-line">{thought}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Apply Button if available */}
                  {block.action && (
                    <div className="pt-2 border-t border-[#334139]/10 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-[#334139]/70 truncate">
                        Action: <strong className="text-[#334139]">{block.action.type}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => applyAction(block.action!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-bold bg-[#064C1C] hover:bg-[#D66F14] text-[#FDFFFC] transition-colors cursor-pointer shadow-2xs shrink-0"
                      >
                        <Wand2 size={11} />
                        <span>Apply</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
