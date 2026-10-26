import { useEffect } from 'react';
import {
  X,
  GitCommit,
  PlayCircle,
  FolderGit2,
  Wifi,
  WifiOff,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useHistoryStore } from '../store/historyStore';
import { useBackendStore } from '../../../services/session/backendSession';
import { useWorkspaceStore } from '../../workspace/store/workspaceStore';
import { RevisionTimeline } from './RevisionTimeline';
import { RunHistoryList } from './RunHistoryList';
import { ProjectSwitcherList } from './ProjectSwitcherList';
import { cn } from '../../../utils/cn';

export function ProjectHistoryModal() {
  const isOpen = useHistoryStore((s) => s.isHistoryOpen);
  const activeTab = useHistoryStore((s) => s.activeTab);
  const revisions = useHistoryStore((s) => s.revisions);
  const runs = useHistoryStore((s) => s.runs);
  const closeHistory = useHistoryStore((s) => s.closeHistory);
  const setActiveTab = useHistoryStore((s) => s.setActiveTab);

  const projectName = useWorkspaceStore((s) => s.projectName);
  const isOnline = useBackendStore((s) => s.isOnline);
  const activePipeline = useBackendStore((s) => s.activePipeline);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeHistory();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeHistory]);

  if (!isOpen) return null;

  const currentVersion = revisions[0]?.revision || 1;
  const displayName = activePipeline?.name || projectName || 'Retail Lakehouse Master Pipeline';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-sans">
        {/* Soft Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={closeHistory}
          className="absolute inset-0 bg-[#1E2D24]/25 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          role="dialog"
          aria-modal="true"
          aria-label="Project History & Versions"
          className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl bg-[#FDFFFC] border border-[#334139]/15 shadow-xl overflow-hidden z-10"
        >
          {/* Flat Porcelain Header */}
          <header className="px-6 pt-5 pb-0 border-b border-[#334139]/10 bg-[#FDFFFC] shrink-0 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-[#1E2D24] tracking-tight truncate leading-tight">
                {displayName}
              </h2>

              <button
                type="button"
                onClick={closeHistory}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#334139]/50 hover:text-[#1E2D24] hover:bg-[#334139]/5 transition-colors cursor-pointer shrink-0"
                aria-label="Close project history modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Flat Editorial Tab Switcher */}
            <div className="flex items-center gap-6 border-b border-transparent -mb-px">
              <button
                type="button"
                onClick={() => setActiveTab('revisions')}
                className={cn(
                  'flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all cursor-pointer -mb-px',
                  activeTab === 'revisions'
                    ? 'border-[#064C1C] text-[#064C1C]'
                    : 'border-transparent text-[#334139]/60 hover:text-[#1E2D24]',
                )}
              >
                <GitCommit size={14} className={activeTab === 'revisions' ? 'text-[#064C1C]' : ''} />
                <span>Revisions</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#334139]/10 text-[#334139]">
                  {revisions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('runs')}
                className={cn(
                  'flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all cursor-pointer -mb-px',
                  activeTab === 'runs'
                    ? 'border-[#064C1C] text-[#064C1C]'
                    : 'border-transparent text-[#334139]/60 hover:text-[#1E2D24]',
                )}
              >
                <PlayCircle size={14} className={activeTab === 'runs' ? 'text-[#064C1C]' : ''} />
                <span>Runs & Logs</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#334139]/10 text-[#334139]">
                  {runs.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('projects')}
                className={cn(
                  'flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-all cursor-pointer -mb-px',
                  activeTab === 'projects'
                    ? 'border-[#064C1C] text-[#064C1C]'
                    : 'border-transparent text-[#334139]/60 hover:text-[#1E2D24]',
                )}
              >
                <FolderGit2 size={14} className={activeTab === 'projects' ? 'text-[#064C1C]' : ''} />
                <span>All Projects</span>
              </button>
            </div>
          </header>

          {/* Scrollable Flat Content Zone */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 py-4">
            {activeTab === 'revisions' && <RevisionTimeline revisions={revisions} />}
            {activeTab === 'runs' && <RunHistoryList runs={runs} />}
            {activeTab === 'projects' && (
              <ProjectSwitcherList onProjectSwitched={() => setActiveTab('revisions')} />
            )}
          </div>

          {/* Flat Porcelain Footer */}
          <footer className="px-6 py-3 border-t border-[#334139]/10 bg-[#FDFFFC] flex items-center justify-between text-xs text-[#334139]/60 shrink-0 font-sans">
            <div className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: isOnline ? '#10B981' : '#9CA3AF' }}
              />
              {isOnline ? (
                <span className="flex items-center gap-1 text-[#064C1C] font-mono text-[11px]">
                  <Wifi size={11} />
                  <span>SYNCED TO BACKEND</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-gray-500 font-mono text-[11px]">
                  <WifiOff size={11} />
                  <span>LOCAL MODE (OFFLINE REVISION LEDGER)</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-[11px] text-[#334139]/50">
              <span>Press</span>
              <kbd className="px-1.5 py-0.5 rounded bg-black/5 font-mono text-[10px] text-[#1E2D24]">ESC</kbd>
              <span>to close</span>
            </div>
          </footer>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

