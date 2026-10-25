import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent, type ChangeEvent } from 'react';
import { ArrowUp, Workflow, Palette, X, FileText, Mic, Square, Database, Globe, Boxes, Layers } from 'lucide-react';
import { useChatStore } from '../features/chat/store/chatStore';
import { usePipelineStore } from '../features/workspace/store/pipelineStore';
import { parseCsv } from '../utils/parsers/csvParser';
import { parseSqlDdl } from '../utils/parsers/sqlDdlParser';
import type { Column, PipelineNode, SourceFormat } from '../types/pipeline';
import { navigateTo } from '../utils/navigation';
import { cn } from '../utils/cn';
import { ImportDataModal, type ImportModalTab } from '../features/sources/components/ImportDataModal';
import logoUrl from '../assets/logo.png';

interface AttachedResource {
  id: string;
  name: string;
  columns: Column[];
  format: SourceFormat;
  fileName: string;
}

const TYPICAL_PROMPTS = [
  'Build an ETL pipeline for daily web sales...',
  'Connect PostgreSQL source and Snowflake mart...',
  'Add a customer loyalty dimension table with SCD type 2...',
  'Audit warehouse schema constraints and primary keys...',
  'Transform raw clickstream events into a star schema...',
  'Suggest an aggregation pipeline for monthly active users...',
];

export function AgentEntryPage() {
  const [prompt, setPrompt] = useState('');
  const [attachedResources, setAttachedResources] = useState<AttachedResource[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importModalTab, setImportModalTab] = useState<ImportModalTab>('files');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const openImportModal = (tab: ImportModalTab = 'files') => {
    setImportModalTab(tab);
    setIsImportModalOpen(true);
  };

  const handleImportModalSuccess = (resource: {
    id: string;
    name: string;
    columns: Column[];
    format: SourceFormat;
    fileName?: string;
  }) => {
    setAttachedResources((prev) => [
      ...prev,
      {
        id: resource.id,
        name: resource.name,
        columns: resource.columns,
        format: resource.format,
        fileName: resource.fileName || resource.name,
      },
    ]);
  };

  const [isFocused, setIsFocused] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [animatedPrompt, setAnimatedPrompt] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Animated typewriter cycling through typical prompts directly in the prompt text zone
  useEffect(() => {
    if (prompt) return;

    const fullPrompt = TYPICAL_PROMPTS[promptIndex];
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting) {
      if (animatedPrompt.length < fullPrompt.length) {
        timer = setTimeout(() => {
          setAnimatedPrompt(fullPrompt.slice(0, animatedPrompt.length + 1));
        }, 36);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2200);
      }
    } else {
      if (animatedPrompt.length > 0) {
        timer = setTimeout(() => {
          setAnimatedPrompt(fullPrompt.slice(0, animatedPrompt.length - 1));
        }, 18);
      } else {
        setIsDeleting(false);
        setPromptIndex((prev) => (prev + 1) % TYPICAL_PROMPTS.length);
      }
    }

    return () => clearTimeout(timer);
  }, [animatedPrompt, isDeleting, promptIndex, prompt]);

  const sendMessage = useChatStore((s) => s.sendMessage);
  const isGenerating = useChatStore((s) => s.isGenerating);
  const addNode = usePipelineStore((s) => s.addNode);

  const [isListening, setIsListening] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore cleanup errors
        }
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startVoiceInput = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = typeof window !== 'undefined'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

    setIsListening(true);
    setVoiceDuration(0);
    setInterimTranscript('');

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setVoiceDuration((prev) => prev + 1);
    }, 1000);

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          let currentInterim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              currentInterim += transcript;
            }
          }
          if (finalTranscript) {
            setPrompt((prev) => (prev ? `${prev.trim()} ${finalTranscript.trim()}` : finalTranscript.trim()));
          }
          setInterimTranscript(currentInterim);
        };

        recognition.onerror = () => {
          stopVoiceInput();
        };

        recognition.onend = () => {
          setIsListening(false);
          if (timerRef.current) clearInterval(timerRef.current);
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch {
        // Fallback for browsers with restricted speech recognition
      }
    }
  };

  const stopVoiceInput = () => {
    setIsListening(false);
    setInterimTranscript('');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const baseName = file.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9_]/g, '_');

      if (file.name.endsWith('.sql')) {
        const result = parseSqlDdl(text);
        if (result.tables.length > 0) {
          const newResources: AttachedResource[] = result.tables.map((table) => ({
            id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: table.name,
            columns: table.columns,
            format: 'postgresql',
            fileName: file.name,
          }));
          setAttachedResources((prev) => [...prev, ...newResources]);
        }
      } else {
        // Default to CSV parser
        const result = parseCsv(text, { tableName: baseName || 'uploaded_resource' });
        const newResource: AttachedResource = {
          id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: result.tableName,
          columns: result.columns.length > 0 ? result.columns : [
            { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
            { name: 'data', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false },
          ],
          format: 'csv',
          fileName: file.name,
        };
        setAttachedResources((prev) => [...prev, newResource]);
      }
    } catch {
      // Fallback simple resource if parse fails
      const fallback: AttachedResource = {
        id: `res_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, '') || 'uploaded_data',
        columns: [
          { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
          { name: 'payload', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false },
        ],
        format: 'generic',
        fileName: file.name,
      };
      setAttachedResources((prev) => [...prev, fallback]);
    } finally {
      // Clear input so same file can be re-uploaded if desired
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachedResources((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = prompt.trim();
    if ((!trimmed && attachedResources.length === 0) || isGenerating) return;

    // 1. If resources were attached, instantiate them as canvas nodes in pipelineStore
    attachedResources.forEach((res, index) => {
      const node: PipelineNode = {
        id: `node_${Date.now()}_${index}`,
        type: 'resource',
        position: { x: 80 + index * 260, y: 100 + (index % 2) * 80 },
        data: {
          category: 'resource',
          kind: res.format === 'csv' ? 'external' : 'source',
          label: res.name,
          description: `Uploaded resource from ${res.fileName} (${res.columns.length} columns).`,
          warehouseRole: 'source',
          format: res.format,
          columns: res.columns,
        },
      };
      addNode(node);
    });

    // 2. Prepare message for AI Agent
    let messageContent = trimmed;
    if (attachedResources.length > 0) {
      const resourceSummary = attachedResources
        .map((r) => `${r.name} (${r.columns.length} columns: ${r.columns.map((c) => c.name).slice(0, 4).join(', ')}${r.columns.length > 4 ? '...' : ''})`)
        .join(', ');

      messageContent = trimmed
        ? `[Attached Resource(s): ${resourceSummary}]\n\n${trimmed}`
        : `I have uploaded the following resource(s): ${resourceSummary}. Please analyze and propose a pipeline integration.`;
    }

    // 3. Send message to AI architect and transition to the AI Planning & Proposal stage
    void sendMessage(messageContent);
    setPrompt('');
    setAttachedResources([]);
    navigateTo('/plan');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && !prompt && attachedResources.length === 0 && animatedPrompt) {
      e.preventDefault();
      setPrompt(animatedPrompt.replace(/\.\.\.$/, ''));
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div
      style={{ backgroundColor: '#FDFFFC' }}
      className="min-h-screen flex flex-col font-sans text-[#334139] selection:bg-[#064C1C]/15 antialiased"
    >
      {/* 
        Blended Top Bar:
        Completely seamless with the Porcelain background, no separate bar colors,
        no hard bottom border.
      */}
      <header className="w-full px-6 py-4 flex items-center justify-between shrink-0 bg-transparent">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <img
            src={logoUrl}
            alt="AuraBI"
            className="w-7 h-7 object-contain drop-shadow-2xs select-none"
          />
          <span className="font-bold text-base tracking-tight text-[#334139]">
            AuraBI
          </span>
          <span
            style={{ backgroundColor: '#D66F14' }}
            className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full text-white uppercase tracking-wider ml-1"
          >
            Agent First
          </span>
        </div>

        {/* Minimal Actions blended into background */}
        <nav className="flex items-center gap-2">
          <button
            onClick={() => navigateTo('/workspace')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#334139] hover:text-[#064C1C] hover:bg-[#334139]/5 transition-colors cursor-pointer"
            aria-label="Open Workspace Canvas"
          >
            <Workflow size={13} />
            <span>Workspace</span>
          </button>
          <button
            onClick={() => navigateTo('/components')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#334139] hover:text-[#064C1C] hover:bg-[#334139]/5 transition-colors cursor-pointer"
            aria-label="View Design System Components"
          >
            <Palette size={13} />
            <span>Design Tokens</span>
          </button>
        </nav>
      </header>

      {/* Center of the page: Welcome text & Prompt text zone rectangle */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 md:px-6 max-w-3xl mx-auto w-full -mt-10">
        {/* "Welcome to AuraBI" Heading placed on top of the prompt rectangle */}
        <div className="text-center mb-8 space-y-3 flex flex-col items-center">
          <img
            src={logoUrl}
            alt="AuraBI"
            className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-sm select-none mb-1 animate-fadeIn"
          />
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#334139]">
            Welcome to AuraBI
          </h1>
          <p className="text-sm md:text-base text-[#334139]/80 max-w-md mx-auto leading-relaxed">
            Your autonomous AI agent for end-to-end data pipelines and warehouse architecture.
          </p>
        </div>

        {/* Prompt Text Zone Rectangle */}
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="w-full bg-white rounded-2xl md:rounded-3xl border border-[#334139]/20 shadow-sm focus-within:border-[#064C1C] focus-within:ring-2 focus-within:ring-[#064C1C]/10 transition-all p-4 md:p-5 flex flex-col gap-3"
        >
          {/* Hidden File Input for Resource Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.sql,.json,.txt,.xlsx,.parquet"
            className="hidden"
            onChange={handleFileUpload}
            aria-label="Upload data resource file"
          />

          {/* Attached Resources Chips */}
          {attachedResources.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-1">
              {attachedResources.map((res) => (
                <div
                  key={res.id}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#064C1C]/10 text-[#064C1C] border border-[#064C1C]/20 text-xs font-mono"
                >
                  <FileText size={12} />
                  <span className="font-semibold max-w-[170px] truncate">{res.name}</span>
                  <span className="text-[10px] opacity-75 font-sans">({res.columns.length} cols)</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(res.id)}
                    className="p-0.5 hover:text-rose-600 rounded-full cursor-pointer ml-0.5"
                    aria-label={`Remove resource ${res.name}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Text input area with dynamic animated prompt typewriter */}
          <div className="relative w-full min-h-[72px]">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              rows={3}
              disabled={isGenerating}
              aria-label="Agent prompt input"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
              className="w-full bg-transparent resize-none outline-none text-[#334139] text-sm md:text-base leading-relaxed font-sans relative z-10 no-scrollbar"
            />

            {/* Dynamic animated prompt directly in the prompt text zone */}
            {!prompt && (
              <div
                onClick={() => textareaRef.current?.focus()}
                className="absolute top-0 left-0 right-0 pointer-events-none text-[#334139]/40 text-sm md:text-base leading-relaxed font-sans select-none flex items-start"
              >
                <span>
                  {attachedResources.length > 0
                    ? "Describe what to do with the attached resource(s)... or click Send to analyze automatically."
                    : animatedPrompt}
                </span>
                {attachedResources.length === 0 && (
                  <span className="inline-block w-[2px] h-4 ml-0.5 mt-1 bg-[#D66F14] animate-pulse" />
                )}
                {attachedResources.length === 0 && isFocused && (
                  <span className="hidden sm:inline-block ml-2 text-[10px] font-mono uppercase tracking-wider text-[#334139]/40 px-1.5 py-0.5 rounded bg-slate-100">
                    Tab ⇥ to fill
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Live Voice Equalizer / Listening Banner */}
          {isListening && (
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#D66F14]/10 border border-[#D66F14]/25 animate-fadeIn">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D66F14] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D66F14]" />
                </span>

                {/* Animated Sound Wave Bars */}
                <div className="flex items-center gap-0.5 h-5 px-1">
                  <div className="w-1 bg-[#D66F14] rounded-full animate-soundwave-1" />
                  <div className="w-1 bg-[#D66F14] rounded-full animate-soundwave-2" />
                  <div className="w-1 bg-[#D66F14] rounded-full animate-soundwave-3" />
                  <div className="w-1 bg-[#D66F14] rounded-full animate-soundwave-4" />
                  <div className="w-1 bg-[#D66F14] rounded-full animate-soundwave-5" />
                </div>

                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#334139]">
                    Listening for voice prompt...
                  </span>
                  <span className="text-[11px] text-[#334139]/80 font-mono">
                    {interimTranscript
                      ? `"${interimTranscript}"`
                      : `0:${voiceDuration.toString().padStart(2, '0')} • Speak clearly into your microphone`}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={stopVoiceInput}
                className="px-3 py-1 rounded-full text-xs font-bold bg-[#D66F14] text-[#FDFFFC] hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
              >
                Done
              </button>
            </div>
          )}

          {/* Action Row inside the rectangle */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {/* Left side: Attached resources counter if any */}
            <div className="flex items-center gap-2">
              {attachedResources.length > 0 && (
                <span className="text-[11px] text-[#334139]/60 font-medium">
                  {attachedResources.length} resource{attachedResources.length > 1 ? 's' : ''} attached
                </span>
              )}
            </div>

            {/* Right side: Mic voice support & Send button */}
            <div className="flex items-center gap-2">
              {/* Mic Icon for Voice Support */}
              <button
                type="button"
                onClick={toggleListening}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs',
                  isListening
                    ? 'bg-[#D66F14] text-[#FDFFFC] ring-4 ring-[#D66F14]/25 animate-pulse'
                    : 'bg-slate-100 hover:bg-slate-200 text-[#334139] hover:text-[#064C1C] border border-[#334139]/15'
                )}
                title={isListening ? 'Stop recording voice' : 'Start voice prompt (dictate)'}
                aria-label={isListening ? 'Stop recording voice' : 'Start voice recording'}
              >
                {isListening ? <Square size={12} className="fill-current" /> : <Mic size={15} />}
              </button>

              {/* Send CTA Button */}
              <button
                type="submit"
                disabled={(!prompt.trim() && attachedResources.length === 0) || isGenerating}
                style={{
                  backgroundColor: prompt.trim() || attachedResources.length > 0 ? '#064C1C' : '#334139',
                }}
                className="flex items-center gap-1.5 px-4.5 py-2 rounded-full text-xs font-bold text-[#FDFFFC] transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                aria-label="Submit prompt to agent"
              >
                <span>Send</span>
                <ArrowUp size={14} />
              </button>
            </div>
          </div>
        </form>

        {/* Source Import Buttons directly below the prompt box */}
        <div className="w-full mt-5 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[#334139]/70">
            <span>Or link sources through Zetaris unified SQL:</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Database Button */}
            <button
              type="button"
              onClick={() => openImportModal('databases')}
              className={cn(
                'inline-flex items-center justify-center gap-2 px-5.5 py-2.5 text-sm font-semibold rounded-full border transition-all cursor-pointer shadow-2xs',
                isImportModalOpen && importModalTab === 'databases'
                  ? 'bg-[#064C1C] text-[#FDFFFC] border-[#064C1C]'
                  : 'bg-transparent text-[#334139] border-[#334139]/30 hover:bg-[#064C1C] hover:text-[#FDFFFC] hover:border-[#064C1C] active:bg-[#064C1C] active:text-[#FDFFFC] active:border-[#064C1C]'
              )}
              aria-label="Connect database sources"
            >
              <Database size={16} />
              <span>Databases</span>
            </button>

            {/* Files Button */}
            <button
              type="button"
              onClick={() => openImportModal('files')}
              className={cn(
                'inline-flex items-center justify-center gap-2 px-5.5 py-2.5 text-sm font-semibold rounded-full border transition-all cursor-pointer shadow-2xs',
                isImportModalOpen && importModalTab === 'files'
                  ? 'bg-[#064C1C] text-[#FDFFFC] border-[#064C1C]'
                  : 'bg-transparent text-[#334139] border-[#334139]/30 hover:bg-[#064C1C] hover:text-[#FDFFFC] hover:border-[#064C1C] active:bg-[#064C1C] active:text-[#FDFFFC] active:border-[#064C1C]'
              )}
              aria-label="Import data files"
            >
              <Boxes size={16} />
              <span>Files</span>
            </button>

            {/* Web APIs Button */}
            <button
              type="button"
              onClick={() => openImportModal('api')}
              className={cn(
                'inline-flex items-center justify-center gap-2 px-5.5 py-2.5 text-sm font-semibold rounded-full border transition-all cursor-pointer shadow-2xs',
                isImportModalOpen && importModalTab === 'api'
                  ? 'bg-[#064C1C] text-[#FDFFFC] border-[#064C1C]'
                  : 'bg-transparent text-[#334139] border-[#334139]/30 hover:bg-[#064C1C] hover:text-[#FDFFFC] hover:border-[#064C1C] active:bg-[#064C1C] active:text-[#FDFFFC] active:border-[#064C1C]'
              )}
              aria-label="Configure REST API endpoints"
            >
              <Globe size={16} />
              <span>Web APIs</span>
            </button>

            {/* Zetaris Virtual Layer Button */}
            <button
              type="button"
              onClick={() => openImportModal('zetaris')}
              className={cn(
                'inline-flex items-center justify-center gap-2 px-5.5 py-2.5 text-sm font-semibold rounded-full border transition-all cursor-pointer shadow-2xs',
                isImportModalOpen && importModalTab === 'zetaris'
                  ? 'bg-[#064C1C] text-[#FDFFFC] border-[#064C1C]'
                  : 'bg-transparent text-[#334139] border-[#334139]/30 hover:bg-[#064C1C] hover:text-[#FDFFFC] hover:border-[#064C1C] active:bg-[#064C1C] active:text-[#FDFFFC] active:border-[#064C1C]'
              )}
              aria-label="Inspect Zetaris Virtual Layer"
            >
              <Layers size={16} />
              <span>Zetaris Virtual Layer</span>
            </button>
          </div>
        </div>
      </main>

      {/* Source Import & Virtualization Modal */}
      <ImportDataModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        initialTab={importModalTab}
        onImportSuccess={handleImportModalSuccess}
      />

      {/* Subtle, blended footer */}
      <footer className="w-full py-4 text-center text-[11px] font-mono text-[#334139]/50 bg-transparent shrink-0">
        AuraBI • Autonomous Data Warehouse Architect • Porcelain Edition
      </footer>
    </div>
  );
}

