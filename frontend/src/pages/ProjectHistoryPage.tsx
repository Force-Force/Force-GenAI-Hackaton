import { useEffect } from 'react';
import {
  GitCommit,
  PlayCircle,
  FolderGit2,
  Workflow,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  RotateCcw,
  Clock,
  Layers,
} from 'lucide-react';
import { motion } from 'motion/react';
import { TopNav } from '../layouts/TopNav';
import { useHistoryStore } from '../features/history/store/historyStore';
import { useBackendStore } from '../services/session/backendSession';
import { useWorkspaceStore } from '../features/workspace/store/workspaceStore';
import { RevisionTimeline } from '../features/history/components/RevisionTimeline';
import { RunHistoryList } from '../features/history/components/RunHistoryList';
import { ProjectSwitcherList } from '../features/history/components/ProjectSwitcherList';
import { navigateTo } from '../utils/navigation';
import { cn } from '../utils/cn';

export function ProjectHistoryPage() {
  const activeTab = useHistoryStore((s) => s.activeTab);
  const setActiveTab = useHistoryStore((s) => s.setActiveTab);
  const revisions = useHistoryStore((s) => s.revisions);
  const runs = useHistoryStore((s) => s.runs);
  const fetchHistory = useHistoryStore((s) => s.fetchHistory);

  const projectName = useWorkspaceStore((s) => s.projectName);
  const isOnline = useBackendStore((s) => s.isOnline);
  const activePipeline = useBackendStore((s) => s.activePipeline);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const currentVersion = revisions[0]?.revision || 1;
  const completedRunsCount = runs.filter((r) => r.status === 'COMPLETED').length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      style={{ backgroundColor: '#FDFFFC' }}
      className="h-screen w-screen flex flex-col font-sans text-[#334139] selection:bg-[#064C1C]/15 antialiased overflow-hidden"
    >
      {/* TopNav */}
      <TopNav />

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden px-4 md:px-8 max-w-6xl w-full mx-auto pb-6">
        {/* Page Header */}
        <header className="pb-5 pt-1 space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-[#334139]/60">
                <button
                  type="button"
                  onClick={() => navigateTo('/workspace')}
                  className="hover:text-[#064C1C] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ArrowLeft size={12} />
                  <span>Workspace</span>
                </button>
                <span>/</span>
                <span className="text-[#1E2D24] font-medium">Project History</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1E2D24]">
                {activePipeline?.name || projectName || 'Retail Lakehouse Master Pipeline'}
              </h1>
            </div>

            <button
              type="button"
              onClick={() => navigateTo('/workspace')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white border border-[#334139]/20 hover:border-[#064C1C] hover:text-[#064C1C] transition-colors cursor-pointer shadow-2xs"
            >
              <Workflow size={13} />
              <span>Back to Canvas</span>
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-[#334139]/10 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('revisions')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-all cursor-pointer',
                activeTab === 'revisions'
                  ? 'border-[#064C1C] text-[#064C1C]'
                  : 'border-transparent text-[#334139]/60 hover:text-[#1E2D24]',
              )}
            >
              <GitCommit size={14} />
              <span>Architectural Revisions</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#334139]/10 text-[#334139]">
                {revisions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('runs')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-all cursor-pointer',
                activeTab === 'runs'
                  ? 'border-[#064C1C] text-[#064C1C]'
                  : 'border-transparent text-[#334139]/60 hover:text-[#1E2D24]',
              )}
            >
              <PlayCircle size={14} />
              <span>Execution Runs</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#334139]/10 text-[#334139]">
                {runs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('projects')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-all cursor-pointer',
                activeTab === 'projects'
                  ? 'border-[#064C1C] text-[#064C1C]'
                  : 'border-transparent text-[#334139]/60 hover:text-[#1E2D24]',
              )}
            >
              <FolderGit2 size={14} />
              <span>All Projects</span>
            </button>
          </div>
        </header>

        {/* Two-Column Editorial Layout */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-6 overflow-hidden">
          {/* Main Feed */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
            {activeTab === 'revisions' && <RevisionTimeline revisions={revisions} />}
            {activeTab === 'runs' && <RunHistoryList runs={runs} />}
            {activeTab === 'projects' && <ProjectSwitcherList />}
          </div>

          {/* Right Summary Column */}
          <aside className="w-full md:w-80 shrink-0 space-y-4 overflow-y-auto no-scrollbar">
            {/* Version Snapshot Card */}
            <div className="rounded-2xl border border-[#334139]/12 bg-white p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#334139]/60">
                  Version Status
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#064C1C]/10 text-[#064C1C]">
                  v{currentVersion} Active
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-[#334139]/8">
                  <span className="text-[#334139]/70">Total Revisions</span>
                  <span className="font-semibold text-[#1E2D24]">{revisions.length}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#334139]/8">
                  <span className="text-[#334139]/70">Successful Runs</span>
                  <span className="font-semibold text-[#064C1C]">{completedRunsCount} of {runs.length}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#334139]/8">
                  <span className="text-[#334139]/70">Sync Engine</span>
                  <span className="font-mono text-[11px] text-[#1E2D24]">{isOnline ? 'FastAPI 8000' : 'Local Storage'}</span>
                </div>
              </div>
            </div>

            {/* Independent Audit Verification Seal */}
            <div className="rounded-2xl border border-[#064C1C]/25 bg-[#064C1C]/[0.03] p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-[#064C1C]">
                <ShieldCheck size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Audit Verified</span>
              </div>
              <p className="text-xs text-[#334139]/85 leading-relaxed">
                Revisions are signed with cryptographic hash verification seals ensuring segregation of duties between Builder and Audit agents.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => navigateTo('/audit')}
                  className="text-xs font-semibold text-[#064C1C] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>View Independent Audit Room</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </motion.div>
  );
}

