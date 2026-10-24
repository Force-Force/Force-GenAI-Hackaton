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
  Sparkles,
  AtSign,
} from 'lucide-react';
import { useChatStore } from '../../chat/store/chatStore';
import { usePipelineStore } from '../store/pipelineStore';
import { Markdown } from '../../chat/components/Markdown';
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

/** Extracts a leading `@node_label` context tag from a user prompt if present. */
function parseUserPromptContext(text: string): { nodeTag: string | null; body: string } {
  const match = text.match(/^@([^\s]+)\s+([\s\S]*)$/);
  if (match) {
    return { nodeTag: match[1], body: match[2] };
  }
  return { nodeTag: null, body: text };
}

/** Summarizes an AI action for the inline Action Card. */
function describeAction(action: AiAction): { title: string; detail: string; explainTarget: string } {
  switch (action.type) {
    case 'create_resource':
      return {
        title: `Add Resource: ${action.payload.label} (${action.payload.kind})`,
        detail: `Columns: ${action.payload.columns.map((c) => c.name).join(', ') || 'default schema'}`,
        explainTarget: action.payload.label,
      };
    case 'create_processing':
      return {
        title: `Add ${action.payload.language.toUpperCase()} Node: ${action.payload.label}`,
        detail: action.payload.code.slice(0, 100),
        explainTarget: action.payload.label,
      };
    case 'connect_nodes':
      return {
        title: `Connect ${action.payload.fromNode} → ${action.payload.toNode}`,
        detail: 'Lineage edge in pipeline DAG',
        explainTarget: `${action.payload.fromNode} → ${action.payload.toNode}`,
      };
    case 'explain':
      return {
        title: `Deep-Dive: ${action.payload.target ?? 'Pipeline Architecture'}`,
        detail: 'Request architectural rationale from Master Agent',
        explainTarget: action.payload.target ?? 'this structure',
      };
  }
}

export function AiThoughtPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Explicit user overrides for blocks & assistant thought traces
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});
  const [groupOpen, setGroupOpen] = useState(false);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const atBottomRef = useRef(true);

  const messages = useChatStore((s) => s.messages);
  const isGenerating = useChatStore((s) => s.isGenerating);
  const applyAction = useChatStore((s) => s.applyAction);
  const sendMessage = useChatStore((s) => s.sendMessage);

  const nodes = usePipelineStore((s) => s.nodes);
  const edges = usePipelineStore((s) => s.edges);
  const selectedNodeId = usePipelineStore((s) => s.selectedNodeId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevTurnCountRef = useRef<number>(0);

  // User prompts & AI replies excluding the initial static welcome banner
  const conversationTurns = messages.filter((m) => m.id !== 'welcome');

  // Automatically expand the panel when the user sends a prompt or the AI starts responding
  useEffect(() => {
    if (conversationTurns.length > prevTurnCountRef.current || isGenerating) {
      setIsCollapsed(false);
      atBottomRef.current = true;
    }
    prevTurnCountRef.current = conversationTurns.length;
  }, [conversationTurns.length, isGenerating]);

  // Smart auto-scroll: follow new activity when near bottom or when a new message arrives
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (atBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    } else {
      setHasNewActivity(true);
    }
  }, [conversationTurns.length, isGenerating, selectedNodeId, isCollapsed]);

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

  const staticBlocks: ThoughtBlock[] = [discoveryBlock, transformationBlock, modelingBlock];
  const focusBlocks: ThoughtBlock[] = [];

  // Selected node focus block if user clicked a node
  if (selectedNode) {
    const upstream = edges.filter((e) => e.target === selectedNode.id).length;
    const downstream = edges.filter((e) => e.source === selectedNode.id).length;
    const isProc = selectedNode.data.category === 'processing';

    focusBlocks.push({
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

  const isBlockExpanded = (id: string, defaultOpen = false) =>
    expandedBlocks[id] ?? defaultOpen;

  const toggleBlockById = (id: string, defaultOpen = false) =>
    setExpandedBlocks((prev) => ({ ...prev, [id]: !isBlockExpanded(id, defaultOpen) }));

  const aiTurnIds = conversationTurns
    .filter((m) => m.sender === 'assistant')
    .map((m) => `trace-${m.id}`);
  const allCollapsibleIds = [
    ...staticBlocks.map((b) => b.id),
    ...focusBlocks.map((b) => b.id),
    ...aiTurnIds,
  ];
  const allCollapsed =
    allCollapsibleIds.every((id) => !isBlockExpanded(id, false)) && !groupOpen;

  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    allCollapsibleIds.forEach((id) => {
      next[id] = allCollapsed;
    });
    setExpandedBlocks(next);
    setGroupOpen(allCollapsed);
  };

  const handleApplyAction = (msgId: string, action: AiAction) => {
    applyAction(action);
    setAppliedIds((prev) => new Set(prev).add(msgId));
  };

  const formatElapsed = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const renderNodeBadge = (status: ThoughtBlock['status']) => {
    if (status === 'running') {
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

  const renderTelemetryBlock = (block: ThoughtBlock, defaultOpen = false) => {
    const open = isBlockExpanded(block.id, defaultOpen);
    const running = block.status === 'running';
    const lastExecIdx = block.executionSteps.length - 1;
    return (
      <div key={block.id} className="relative pl-7">
        <span className="absolute left-0 top-[7px] z-10">{renderNodeBadge(block.status)}</span>

        <div
          onClick={() => toggleBlockById(block.id, defaultOpen)}
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
          className="group flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border border-[#334139]/20 shadow-md hover:border-[#064C1C]/60 transition-all cursor-pointer"
          aria-label="Expand AI Agent & Thought Process panel"
          title="Expand AI Agent & Thought Process"
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
          <Bot size={15} className="text-[#064C1C]" />
          <span className="text-xs font-bold text-[#334139]">AI Architect</span>
          {conversationTurns.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-[#064C1C]/10 text-[#064C1C]">
              {conversationTurns.length}
            </span>
          )}
          <ChevronRight size={14} className="text-[#334139]/60 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="AI Thought Process Panel"
      style={{ backgroundColor: '#FDFFFC' }}
      className="absolute left-4 top-20 z-20 w-80 md:w-[370px] max-h-[calc(100vh-11.5rem)] flex flex-col rounded-2xl border border-[#334139]/20 shadow-lg backdrop-blur-md overflow-hidden transition-all"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#334139]/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors',
              isGenerating ? 'bg-[#D66F14] text-[#FDFFFC]' : 'bg-[#064C1C] text-[#FDFFFC]',
            )}
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-tight text-[#334139] truncate leading-tight">
              AuraBI Architect
            </h2>
            <p
              className={cn(
                'text-[10.5px] leading-tight mt-0.5 truncate',
                isGenerating ? 'text-[#D66F14] font-medium' : 'text-[#334139]/55',
              )}
            >
              {isGenerating
                ? `Synthesizing… ${formatElapsed(elapsed)}`
                : conversationTurns.length > 0
                ? `${conversationTurns.length} message${conversationTurns.length === 1 ? '' : 's'} · Ready`
                : 'Agent & Thought Feed · Ready'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={toggleAll}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#334139]/60 hover:text-[#334139] hover:bg-[#334139]/8 transition-colors cursor-pointer"
            aria-label={allCollapsed ? 'Expand all thoughts' : 'Collapse all thoughts'}
            title={allCollapsed ? 'Expand all thoughts' : 'Collapse all thoughts'}
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

      {/* Unified Feed: Telemetry + Conversation Stream */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 pb-4 pt-2.5 text-xs custom-scrollbar space-y-4"
        >
          {/* 1. Pipeline Telemetry & Selected Node Context */}
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
            {groupOpen && (
              <div className="space-y-0.5">
                {staticBlocks.map((b) => renderTelemetryBlock(b, false))}
              </div>
            )}

            {/* Focused node telemetry when a node is selected on the canvas */}
            {focusBlocks.length > 0 && (
              <div className="space-y-0.5">
                {focusBlocks.map((b) => renderTelemetryBlock(b, true))}
              </div>
            )}
          </div>

          {/* 2. Unified Conversation Feed */}
          <div className="pt-2 border-t border-[#334139]/10 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#334139]/45">
                Agent Conversation
              </span>
              {selectedNode && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#064C1C]/10 text-[#064C1C] font-mono text-[10px] font-semibold">
                  <AtSign size={10} />
                  {selectedNode.data.label}
                </span>
              )}
            </div>

            {/* Welcome / Ready Card when no messages sent yet */}
            {conversationTurns.length === 0 && !isGenerating && (
              <div className="rounded-2xl border border-[#334139]/12 bg-[#334139]/[0.025] p-3.5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-[#064C1C] text-[#FDFFFC] flex items-center justify-center shrink-0">
                    <Bot size={12} />
                  </span>
                  <span className="text-[11.5px] font-bold text-[#1E2D24]">
                    Ready to co-design your pipeline
                  </span>
                </div>
                <p className="text-[11.5px] leading-relaxed text-[#334139]/80">
                  Use the prompt bar below or click any node on the canvas to attach it as context. I will trace my reasoning steps here and let you apply changes directly to the DAG.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      void sendMessage(
                        selectedNode
                          ? `@${selectedNode.data.label} Explain the schema and lineage of this node`
                          : 'Explain the current pipeline architecture and data lineage',
                      )
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-[#FDFFFC] border border-[#334139]/18 text-[#334139] hover:border-[#064C1C] hover:text-[#064C1C] transition-colors cursor-pointer"
                  >
                    <Sparkles size={10} className="text-[#D66F14]" />
                    <span>
                      {selectedNode ? `Explain @${selectedNode.data.label}` : 'Explain pipeline'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void sendMessage(
                        'Create a SQL transformation node to cleanse and join staging data',
                      )
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-[#FDFFFC] border border-[#334139]/18 text-[#334139] hover:border-[#064C1C] hover:text-[#064C1C] transition-colors cursor-pointer"
                  >
                    <Wand2 size={10} className="text-[#064C1C]" />
                    <span>Propose SQL transform</span>
                  </button>
                </div>
              </div>
            )}

            {/* Conversation Turns */}
            {conversationTurns.map((msg) => {
              if (msg.sender === 'user') {
                const { nodeTag, body } = parseUserPromptContext(msg.text);
                return (
                  <div
                    key={msg.id}
                    className="flex flex-col items-end animate-fadeIn space-y-1"
                  >
                    <div className="flex items-center gap-1.5 text-[9.5px] font-mono text-[#334139]/45 px-1">
                      <span>You</span>
                      <span>·</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <div className="max-w-[92%] rounded-2xl rounded-tr-xs bg-[#1E2D24] text-[#FDFFFC] px-3.5 py-2.5 shadow-xs space-y-1.5">
                      {nodeTag && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D66F14]/25 border border-[#D66F14]/40 text-[#FDFFFC] font-mono text-[10px] font-semibold">
                          <AtSign size={9} className="text-[#D66F14]" />
                          <span>{nodeTag}</span>
                        </div>
                      )}
                      <p className="text-[12px] leading-relaxed whitespace-pre-wrap break-words">
                        {body}
                      </p>
                    </div>
                  </div>
                );
              }

              // Assistant Turn: Persona Header + Collapsible Thought Trace + Markdown Reply + Action Card
              const traceId = `trace-${msg.id}`;
              const traceOpen = isBlockExpanded(traceId, false);
              const applied = appliedIds.has(msg.id);

              const executionSteps: string[] = [
                'executing parse_user_intent.py...',
                'executing evaluate_graph_dependencies.py...',
              ];
              if (msg.action) {
                if (msg.action.type === 'create_processing') {
                  const ext = msg.action.payload.language === 'python' ? 'py' : 'sql';
                  executionSteps.push(`executing ${msg.action.payload.label}.${ext}...`);
                } else {
                  executionSteps.push(`executing apply_${msg.action.type}.sql...`);
                }
              }
              executionSteps.push('finalizing response and schema verification');

              const actionMeta = msg.action ? describeAction(msg.action) : null;

              return (
                <div key={msg.id} className="space-y-2 animate-fadeIn">
                  {/* Bot Persona Header */}
                  <div className="flex items-center justify-between px-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-md bg-[#064C1C] text-[#FDFFFC] flex items-center justify-center">
                        <Bot size={10} />
                      </span>
                      <span className="text-[11px] font-bold text-[#1E2D24]">
                        AuraBI Architect
                      </span>
                    </div>
                    <span className="text-[9.5px] font-mono text-[#334139]/45">
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Collapsible Thought Process Trace */}
                  <div className="rounded-xl border border-[#334139]/12 bg-[#334139]/[0.02] px-2.5 py-1.5">
                    <button
                      type="button"
                      onClick={() => toggleBlockById(traceId, false)}
                      className="w-full flex items-center justify-between gap-2 text-left cursor-pointer select-none py-0.5"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-4 h-4 rounded-full bg-[#064C1C]/10 flex items-center justify-center shrink-0">
                          <Check size={9} strokeWidth={3} className="text-[#064C1C]" />
                        </span>
                        <span className="text-[11px] font-semibold text-[#334139] truncate">
                          Thought process
                        </span>
                        <span className="text-[10px] text-[#334139]/50 font-mono shrink-0">
                          · {executionSteps.length} steps
                        </span>
                      </div>
                      <span className="text-[#334139]/45 shrink-0">
                        {traceOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </span>
                    </button>

                    {traceOpen && (
                      <div className="mt-2 pt-2 border-t border-[#334139]/10 space-y-2">
                        <ul className="space-y-1 rounded-lg bg-[#334139]/[0.04] px-2 py-1.5">
                          {executionSteps.map((step, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-1.5 text-[10.5px] font-mono text-[#334139]/80 leading-snug"
                            >
                              <Check
                                size={10}
                                strokeWidth={3}
                                className="text-[#064C1C] shrink-0 mt-0.5"
                              />
                              <span className="break-all">{step}</span>
                            </li>
                          ))}
                        </ul>
                        {msg.tasks && msg.tasks.length > 0 && (
                          <div className="space-y-1">
                            {msg.tasks.map((t, i) => (
                              <div
                                key={i}
                                className="text-[10.5px] text-[#334139]/75 font-mono bg-[#FDFFFC] px-2 py-1 rounded border border-[#334139]/10"
                              >
                                [{t.agent_role}]: {t.instruction || t.status}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* AI Reply Body (Markdown) */}
                  <div className="rounded-2xl rounded-tl-xs border border-[#334139]/15 bg-[#FDFFFC] p-3.5 text-[12px] text-[#334139] shadow-2xs space-y-3">
                    <Markdown>{msg.text}</Markdown>

                    {/* Action Card when an AiAction is attached */}
                    {msg.action && actionMeta && (
                      <div className="pt-2.5 border-t border-[#334139]/12 space-y-2">
                        <div className="rounded-xl bg-[#334139]/[0.04] border border-[#334139]/10 p-2.5 space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#D66F14]">
                            <Sparkles size={11} />
                            <span>Proposed Graph Action</span>
                          </div>
                          <div className="text-[11.5px] font-bold font-mono text-[#1E2D24]">
                            {actionMeta.title}
                          </div>
                          <div className="text-[10.5px] text-[#334139]/65 font-mono truncate">
                            {actionMeta.detail}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {applied ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-[#064C1C]/10 text-[#064C1C]">
                              <Check size={12} strokeWidth={3} />
                              <span>Applied to Canvas</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleApplyAction(msg.id, msg.action!)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold bg-[#064C1C] hover:bg-[#1E2D24] text-[#FDFFFC] transition-colors cursor-pointer shadow-xs"
                            >
                              <Wand2 size={12} />
                              <span>
                                {msg.action.type === 'explain' ? 'Ask Agent' : 'Apply to Canvas'}
                              </span>
                            </button>
                          )}

                          {msg.action.type !== 'explain' && (
                            <button
                              type="button"
                              onClick={() =>
                                applyAction({
                                  type: 'explain',
                                  payload: { target: actionMeta.explainTarget },
                                })
                              }
                              className="px-3 py-1.5 rounded-full text-[11px] font-semibold border border-[#334139]/20 text-[#334139] hover:border-[#064C1C] hover:text-[#064C1C] transition-colors cursor-pointer"
                            >
                              Explain
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Live Generating State */}
            {isGenerating && (
              <div className="space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between px-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-md bg-[#D66F14] text-[#FDFFFC] flex items-center justify-center">
                      <Loader2 size={10} className="animate-spin" />
                    </span>
                    <span className="text-[11px] font-bold text-[#D66F14]">
                      AuraBI Architect
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#D66F14] font-semibold">
                    {formatElapsed(elapsed)}
                  </span>
                </div>

                <div className="rounded-2xl border border-[#D66F14]/30 bg-[#D66F14]/[0.04] p-3 space-y-2">
                  <div className="text-[11.5px] font-semibold text-[#334139]">
                    Synthesizing Architecture Updates...
                  </div>
                  <ul className="space-y-1 rounded-lg bg-[#FDFFFC] border border-[#334139]/10 px-2.5 py-2">
                    <li className="flex items-center gap-1.5 text-[10.5px] font-mono text-[#334139]">
                      <Check size={10} strokeWidth={3} className="text-[#064C1C] shrink-0" />
                      <span>executing agent_master_reasoner.py...</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-[10.5px] font-mono text-[#D66F14]">
                      <Loader2 size={10} className="animate-spin shrink-0" />
                      <span>executing compute_optimal_join_path.sql...</span>
                    </li>
                  </ul>
                  <p className="text-[11px] text-[#334139]/75 leading-relaxed">
                    Analyzing column types and evaluating query pushdown feasibility against Zetaris virtual catalog.
                  </p>
                </div>
              </div>
            )}
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
