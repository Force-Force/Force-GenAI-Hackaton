import { useState } from 'react';
import {
  FolderGit2,
  Plus,
  Check,
  Search,
  Clock,
  ArrowRight,
  Loader2,
  Layers,
} from 'lucide-react';
import { useBackendStore } from '../../../services/session/backendSession';
import { useWorkspaceStore } from '../../workspace/store/workspaceStore';
import { useHistoryStore } from '../store/historyStore';
import { cn } from '../../../utils/cn';

interface ProjectSwitcherListProps {
  onProjectSwitched?: () => void;
}

export function ProjectSwitcherList({ onProjectSwitched }: ProjectSwitcherListProps) {
  const [search, setSearch] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const pipelinesList = useBackendStore((s) => s.pipelinesList);
  const activePipelineId = useBackendStore((s) => s.activePipelineId);
  const loadPipeline = useBackendStore((s) => s.loadPipeline);
  const createPipeline = useBackendStore((s) => s.createPipeline);
  const isOnline = useBackendStore((s) => s.isOnline);
  const currentProjectName = useWorkspaceStore((s) => s.projectName);
  const setProjectName = useWorkspaceStore((s) => s.setProjectName);
  const fetchHistory = useHistoryStore((s) => s.fetchHistory);

  // Combine live backend pipelines or provide offline sample projects
  const projects = isOnline && pipelinesList.length > 0
    ? pipelinesList
    : [
        {
          id: 'pipe-retail-01',
          name: currentProjectName || 'Retail Lakehouse Master Pipeline',
          status: 'ACTIVE' as const,
          updated_at: new Date().toISOString(),
        },
        {
          id: 'pipe-fintech-02',
          name: 'Real-Time Fraud & Ledger Pipeline',
          status: 'DRAFT' as const,
          updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        },
        {
          id: 'pipe-marketing-03',
          name: 'Customer Lifetime Value & Cohort Decay Mart',
          status: 'ACTIVE' as const,
          updated_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        },
      ];

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelectPipeline = async (pipelineId: string, name: string) => {
    setSwitchingId(pipelineId);
    try {
      if (isOnline) {
        await loadPipeline(pipelineId);
      } else {
        setProjectName(name);
      }
      await fetchHistory(pipelineId);
      onProjectSwitched?.();
    } finally {
      setSwitchingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newProjectName.trim();
    if (!name || isCreating) return;

    setIsCreating(true);
    try {
      if (isOnline) {
        const pipe = await createPipeline(name);
        if (pipe) {
          await fetchHistory(pipe.id);
          setNewProjectName('');
          onProjectSwitched?.();
        }
      } else {
        setProjectName(name);
        setNewProjectName('');
        onProjectSwitched?.();
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Search & New Project Bar */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#334139]/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#334139]/15 bg-transparent text-xs text-[#1E2D24] placeholder-[#334139]/40 outline-none focus:border-[#064C1C] transition-all"
          />
        </div>

        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Create new project..."
            className="flex-1 px-3 py-1.5 rounded-lg border border-[#334139]/15 bg-transparent text-xs text-[#1E2D24] placeholder-[#334139]/40 outline-none focus:border-[#064C1C] transition-all"
          />
          <button
            type="submit"
            disabled={!newProjectName.trim() || isCreating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#064C1C] text-white hover:bg-[#1E2D24] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
          >
            {isCreating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            <span>New</span>
          </button>
        </form>
      </div>

      {/* Flat Projects List */}
      <div className="divide-y divide-[#334139]/10 pt-1">
        {filtered.map((proj) => {
          const isActive = proj.id === activePipelineId || (!activePipelineId && proj.name === currentProjectName);
          const isSwitching = switchingId === proj.id;

          return (
            <div
              key={proj.id}
              onClick={() => void handleSelectPipeline(proj.id, proj.name)}
              className={cn(
                'w-full text-left py-3 px-1 transition-colors cursor-pointer flex items-center justify-between gap-3 hover:bg-[#334139]/[0.02]',
                isActive ? 'text-[#064C1C]' : 'text-[#1E2D24]',
              )}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <FolderGit2 size={15} className={isActive ? 'text-[#064C1C]' : 'text-[#334139]/50'} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold truncate">
                      {proj.name}
                    </span>
                    {isActive && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#064C1C]/10 text-[#064C1C]">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#334139]/60 flex items-center gap-2 mt-0.5">
                    <Clock size={11} className="text-[#334139]/40" />
                    <span>Updated {new Date(proj.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isSwitching ? (
                  <Loader2 size={13} className="animate-spin text-[#064C1C]" />
                ) : isActive ? (
                  <Check size={14} strokeWidth={3} className="text-[#064C1C]" />
                ) : (
                  <ArrowRight size={13} className="text-[#334139]/30 hover:text-[#1E2D24] transition-colors" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

