import { Sparkles, ShieldCheck, Palette } from 'lucide-react';
import { Badge } from '../components/ui';
import { useWorkspaceStore } from '../features/workspace/store/workspaceStore';
import { navigateTo } from '../utils/navigation';

export function TopNav() {
  const projectName = useWorkspaceStore((s) => s.projectName);
  const setProjectName = useWorkspaceStore((s) => s.setProjectName);
  const isValid = useWorkspaceStore((s) => s.isValid);
  const runValidation = useWorkspaceStore((s) => s.runValidation);

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
          <div
            style={{ backgroundColor: '#064C1C' }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#FDFFFC] shadow-xs"
          >
            <Sparkles size={15} />
          </div>
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
          aria-label="Project name"
          className="text-sm font-semibold text-[#334139] bg-transparent outline-none focus:bg-[#334139]/5 rounded-lg px-2.5 py-1 min-w-0 truncate hover:bg-[#334139]/5 transition-colors border border-transparent focus:border-[#334139]/20"
        />
        {isValid === true && <Badge tone="success">Valid</Badge>}
        {isValid === false && <Badge tone="danger">Errors</Badge>}
      </div>

      <div className="flex items-center gap-2">
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
          onClick={() => void runValidation()}
          aria-label="Validate pipeline graph"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-transparent text-[#334139] border border-[#334139]/20 hover:border-[#064C1C] hover:text-[#064C1C] transition-colors cursor-pointer"
        >
          <ShieldCheck size={13} />
          <span>Validate</span>
        </button>
      </div>
    </header>
  );
}
