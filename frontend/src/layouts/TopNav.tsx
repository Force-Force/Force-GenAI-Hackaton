import { Sparkles, Palette, FileText, Wifi, WifiOff, Play } from 'lucide-react';
import { Badge } from '../components/ui';
import { useWorkspaceStore } from '../features/workspace/store/workspaceStore';
import { useBackendStore } from '../services/session/backendSession';
import { pipelineApi } from '../services/api/pipelineApi';
import { navigateTo } from '../utils/navigation';
import logoUrl from '../assets/logo.png';

export function TopNav() {
  const projectName = useWorkspaceStore((s) => s.projectName);
  const setProjectName = useWorkspaceStore((s) => s.setProjectName);
  const isValid = useWorkspaceStore((s) => s.isValid);
  const runValidation = useWorkspaceStore((s) => s.runValidation);

  const isOnline = useBackendStore((s) => s.isOnline);
  const activePipelineId = useBackendStore((s) => s.activePipelineId);
  const activeRun = useBackendStore((s) => s.activeRun);
  const wsStatus = useBackendStore((s) => s.wsStatus);
  const checkHealth = useBackendStore((s) => s.checkHealth);
  const startPipelineRun = useBackendStore((s) => s.startPipelineRun);

  return (
    <header
      style={{
        background:
          'linear-gradient(to bottom, rgba(253, 255, 252, 0.8) 0%, rgba(253, 255, 252, 0) 100%)',
      }}
      className="w-full flex items-center justify-between px-6 pt-4 pb-5 shrink-0 z-20 pointer-events-auto"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          onClick={() => navigateTo('/')}
          className="flex items-center gap-2.5 shrink-0 cursor-pointer hover:opacity-85 transition-opacity"
          aria-label="Return to Agent Home"
        >
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
        <span className="text-[#334139]/30">/</span>
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          onBlur={(e) => {
            const nextName = e.target.value.trim();
            if (isOnline && activePipelineId && nextName) {
              void pipelineApi.updatePipeline(activePipelineId, { name: nextName }).catch(() => {});
            }
          }}
          aria-label="Project name"
          className="text-sm font-semibold text-[#334139] bg-transparent outline-none focus:bg-[#334139]/5 rounded-lg px-2.5 py-1 min-w-0 truncate hover:bg-[#334139]/5 transition-colors border border-transparent focus:border-[#334139]/20"
        />
        {isValid === true && <Badge tone="success">Valid</Badge>}
        {isValid === false && <Badge tone="danger">Errors</Badge>}

        {/* Backend Connectivity Status */}
        <button
          type="button"
          onClick={() => void checkHealth()}
          title={isOnline ? `Backend connected (${wsStatus}) — click to re-check` : 'Backend offline — click to retry connection'}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer select-none bg-white/70"
          style={{
            borderColor: isOnline ? 'rgba(6, 76, 28, 0.25)' : 'rgba(51, 65, 57, 0.2)',
            color: isOnline ? '#064C1C' : '#6B7280',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: !isOnline
                ? '#9CA3AF'
                : wsStatus === 'connected'
                ? '#10B981'
                : wsStatus === 'reconnecting'
                ? '#F59E0B'
                : '#064C1C',
            }}
          />
          {isOnline ? (
            <span className="flex items-center gap-1">
              <Wifi size={11} className="text-[#064C1C]" />
              <span className="font-mono text-[10px]">
                {wsStatus === 'connected' ? 'LIVE' : 'ONLINE'}
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <WifiOff size={11} className="text-gray-400" />
              <span className="font-mono text-[10px]">LOCAL</span>
            </span>
          )}
        </button>
      </div>

      <div className="flex items-center gap-2">
        {isOnline && activePipelineId && (
          <button
            type="button"
            onClick={() => void startPipelineRun()}
            aria-label="Run Pipeline on Backend"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#064C1C] text-[#FDFFFC] hover:bg-[#1E2D24] transition-colors cursor-pointer"
          >
            <Play size={12} />
            <span>{activeRun?.status === 'RUNNING' ? 'Running…' : 'Run Pipeline'}</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => navigateTo('/plan')}
          aria-label="View AI Architecture Proposal"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-transparent text-[#334139] border border-[#334139]/20 hover:bg-[#334139]/5 transition-colors cursor-pointer"
        >
          <FileText size={13} />
          <span className="hidden sm:inline">AI Proposal</span>
        </button>
        <button
          type="button"
          onClick={() => navigateTo('/components')}
          aria-label="View components palette"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-transparent text-[#334139] border border-[#334139]/20 hover:bg-[#334139]/5 transition-colors cursor-pointer"
        >
          <Palette size={13} />
          <span className="hidden sm:inline">Design Tokens</span>
        </button>
        <button
          type="button"
          onClick={() => {
            void runValidation();
            navigateTo('/audit');
          }}
          aria-label="AI Dynamic Insights Dashboard"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-transparent text-[#334139] border border-[#334139]/20 hover:border-[#064C1C] hover:text-[#064C1C] transition-colors cursor-pointer"
        >
          <Sparkles size={13} className="text-[#064C1C]" />
          <span>Insights Dashboard</span>
        </button>
      </div>
    </header>
  );
}
