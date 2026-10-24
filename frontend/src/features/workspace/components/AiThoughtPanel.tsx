import { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsUpDown,
  ArrowDown,
  Wand2,
  Loader2,
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
  // Explicit user overrides (true = expanded). Absent => default (latest/running block open).
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});
  const [groupOpen, setGroupOpen] = useState(false);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const atBottomRef = useRef(true);

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

  // Smart auto-scroll: only follow new activity when the user is near the bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (atBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    } else {
      setHasNewActivity(true);
    }
  }, [conversationTurns.length, isGenerating, selectedNodeId]);

  // Live elapsed timer while the agent is working
  useEffect(() => {
    if (!isGenerating) return;
    const startedAt = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => {
      clearInterval(id);
      setElapsed(0);
    };
  }, [isGenerating]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    atBottomRef.current = near;
    if (near) setHasNewActivity(false);
  };

  const jumpToLatest = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setHasNewActivity(false);
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
  const staticBlocks: ThoughtBlock[] = [discoveryBlock, transformationBlock, modelingBlock];
  const blocks: ThoughtBlock[] = [];

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

  const lastBlockId = blocks.length > 0 ? blocks[blocks.length - 1].id : null;
  const isExpanded = (b: ThoughtBlock) =>
    expandedBlocks[b.id] ?? (b.status === 'running' || b.id === lastBlockId);
  const toggleBlock = (b: ThoughtBlock) =>
    setExpandedBlocks((prev) => ({ ...prev, [b.id]: !isExpanded(b) }));

  const allBlocks = [...staticBlocks, ...blocks];
  const allCollapsed = allBlocks.every((b) => !isExpanded(b)) && !groupOpen;
  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    allBlocks.forEach((b) => {
      next[b.id] = allCollapsed;
    });
    setExpandedBlocks(next);
    setGroupOpen(allCollapsed);
  };

  const handleApply = (b: ThoughtBlock) => {
    if (!b.action) return;
    applyAction(b.action);
    setAppliedIds((prev) => new Set(prev).add(b.id));
  };

  const formatElapsed = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const renderNode = (b: ThoughtBlock) => {
    if (b.status === 'running') {
      return (
        <span className="w-[18px] h-[18px] rounded-full bg-[#FDFFFC] flex items-center justify-center">
          <Loader2 size={14} className="animate-spin text-[#D66F14]" />
        </span>
      );
    }
    return (
      <span className="w-[18px] h-[18px] rounded-full bg-[#334139]/10 flex items-center justify-center">
        <Check size={11} strokeWidth={3} className="text-[#064C1C]" />
      </span>
    );
  };

  const renderBlock = (block: ThoughtBlock) => {
    const open = isExpanded(block);
    const running = block.status === 'running';
    const applied = appliedIds.has(block.id);
    const lastExecIdx = block.executionSteps.length - 1;
    return (
      <div key={block.id} className="relative pl-7">
        <span className="absolute left-0 top-[7px] z-10">{renderNode(block)}</span>

        <div
          onClick={() => toggleBlock(block)}
          className="flex items-start gap-2 py-1.5 pr-1 cursor-pointer select-none rounded-lg hover:bg-[#334139]/[0.04] -ml-1 pl-1"
        >
          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                'text-[12px] font-semibold leading-snug text-[#334139]',
                open ? '' : 'line-clamp-2',
              )}
            >
              {block.title}
            </h3>
            {!open && (
              <p className="text-[10.5px] text-[#334139]/55 mt-0.5">
                {block.executionSteps.length} scripts · {block.thoughtProcess.length} thoughts
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-[#334139]/45 mt-0.5">
            {block.timestamp && <span className="text-[9.5px] font-mono">{block.timestamp}</span>}
            {block.action &&
              (applied ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#064C1C]/10 text-[#064C1C]">
                  <Check size={10} strokeWidth={3} /> Applied
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApply(block);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#D66F14] hover:brightness-110 text-[#FDFFFC] transition cursor-pointer"
                >
                  <Wand2 size={10} />
                  Apply
                </button>
              ))}
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </div>
        </div>

        {open && (
          <div className="pb-2.5 space-y-2.5">
            <div>
              <div className="text-[10px] font-medium text-[#334139]/50 mb-1">Scripts</div>
              <ul className="space-y-1 rounded-lg bg-[#334139]/[0.05] px-2.5 py-2">
                {block.executionSteps.map((step, idx) => {
                  const isCode = step.startsWith('executing ');
                  const stepRunning = running && idx === lastExecIdx;
                  return (
                    <li key={idx} className="flex items-start gap-1.5 text-[11px] leading-snug">
                      <span className="mt-[2px] shrink-0 w-3 flex justify-center">
                        {stepRunning ? (
                          <Loader2 size={11} className="animate-spin text-[#D66F14]" />
                        ) : (
                          <Check size={11} strokeWidth={3} className="text-[#334139]/40" />
                        )}
                      </span>
                      <span
                        className={cn(
                          'min-w-0 break-words',
                          isCode
                            ? 'font-mono text-[10.5px] text-[#334139]'
                            : 'font-sans text-[#334139]/75',
                        )}
                      >
                        {step}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <div className="text-[10px] font-medium text-[#334139]/50 mb-1">Reasoning</div>
              <div className="space-y-1.5">
                {block.thoughtProcess.map((thought, idx) => (
                  <p
                    key={idx}
                    className="text-[11.5px] leading-relaxed text-[#334139]/85 font-sans whitespace-pre-line"
                  >
                    {thought}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isCollapsed) {
    return (
      <div className="absolute left-4 top-20 z-20">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          style={{ backgroundColor: '#FDFFFC' }}
          className="group flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border border-[#334139]/20 shadow-md hover:border-[#334139]/50 transition-all cursor-pointer"
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
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#334139]/40" />
            )}
          </span>
          <Bot size={15} className="text-[#334139]" />
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
      <div className="px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors',
              isGenerating ? 'bg-[#D66F14] text-[#FDFFFC]' : 'bg-[#334139] text-[#FDFFFC]',
            )}
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-tight text-[#334139] truncate leading-tight">
              AI Thought Process
            </h2>
            <p
              className={cn(
                'text-[10.5px] leading-tight mt-0.5',
                isGenerating ? 'text-[#D66F14] font-medium' : 'text-[#334139]/55',
              )}
            >
              {isGenerating ? `Analyzing… ${formatElapsed(elapsed)}` : 'Idle'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={toggleAll}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#334139]/60 hover:text-[#334139] hover:bg-[#334139]/8 transition-colors cursor-pointer"
            aria-label={allCollapsed ? 'Expand all' : 'Collapse all'}
            title={allCollapsed ? 'Expand all' : 'Collapse all'}
          >
            <ChevronsUpDown size={14} />
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#334139]/60 hover:text-[#334139] hover:bg-[#334139]/8 transition-colors cursor-pointer"
            aria-label="Collapse AI Thought Process panel"
            title="Minimize panel"
          >
            <ChevronLeft size={15} />
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 pb-4 pt-1 text-xs custom-scrollbar"
        >
          <div className="relative">
            {/* Rail */}
            <span className="absolute left-[8.5px] top-3 bottom-3 w-px bg-[#334139]/15" />

            {/* Grouped static pipeline analysis */}
            <div className="relative pl-7">
              <span className="absolute left-0 top-[7px] z-10 w-[18px] h-[18px] rounded-full bg-[#334139]/10 flex items-center justify-center">
                <Check size={11} strokeWidth={3} className="text-[#064C1C]" />
              </span>
              <div
                onClick={() => setGroupOpen((v) => !v)}
                className="flex items-center gap-2 py-1.5 -ml-1 pl-1 pr-1 cursor-pointer select-none rounded-lg hover:bg-[#334139]/[0.04]"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-[12px] font-semibold text-[#334139] leading-snug">
                    Pipeline analysis
                  </h3>
                  <p className="text-[10.5px] text-[#334139]/55 mt-0.5">
                    {staticBlocks.length} stages · {nodes.length} nodes · {edges.length} links
                  </p>
                </div>
                <span className="text-[#334139]/45">
                  {groupOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </span>
              </div>
            </div>
            {groupOpen && <div className="space-y-0.5">{staticBlocks.map(renderBlock)}</div>}

            {/* Focus + conversation */}
            <div className="space-y-0.5">{blocks.map(renderBlock)}</div>
          </div>
        </div>

        {hasNewActivity && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10.5px] font-semibold bg-[#334139] text-[#FDFFFC] shadow-md hover:bg-[#1E2D24] transition-colors cursor-pointer"
          >
            <ArrowDown size={11} />
            New activity
          </button>
        )}
      </div>
    </aside>
  );
}
