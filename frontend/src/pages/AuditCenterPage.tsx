import { ShieldCheck, ArrowLeft, Bot, Palette, FileText, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { navigateTo } from '../utils/navigation';
import { ValidationCenter } from '../features/validation/components/ValidationCenter';
import { useWorkspaceStore } from '../features/workspace/store/workspaceStore';

export function AuditCenterPage() {
  const projectName = useWorkspaceStore((s) => s.projectName);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      style={{ backgroundColor: '#FDFFFC' }}
      className="min-h-screen w-screen flex flex-col font-sans text-[#334139] selection:bg-[#064C1C]/15 antialiased"
    >
      {/* Pinned Top Navigation with Subtle Porcelain Gradient */}
      <header
        style={{
          background:
            'linear-gradient(to bottom, rgba(253, 255, 252, 1) 0%, rgba(253, 255, 252, 0.95) 60%, rgba(253, 255, 252, 0) 100%)',
        }}
        className="w-full px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0 z-20 border-b border-[#334139]/10"
      >
        {/* Brand & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigateTo('/workspace')}
            className="flex items-center gap-2 text-xs font-semibold text-[#334139]/70 hover:text-[#064C1C] transition-colors cursor-pointer mr-1"
            title="Return to pipeline canvas"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Workspace</span>
          </button>

          <span className="text-[#334139]/30">/</span>

          <div
            onClick={() => navigateTo('/')}
            className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity"
            aria-label="Return to Welcome Page"
          >
            <div
              style={{ backgroundColor: '#064C1C' }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#FDFFFC] shadow-2xs"
            >
              <Bot size={15} />
            </div>
            <span className="font-bold text-base tracking-tight text-[#334139]">
              AuraBI
            </span>
          </div>

          <span className="text-[#334139]/30">/</span>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#1E2D24] truncate max-w-[140px] sm:max-w-xs">
              {projectName}
            </span>
            <span className="inline-flex items-center gap-1 text-[9.5px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#064C1C]/10 text-[#064C1C] border border-[#064C1C]/20">
              <ShieldCheck size={10} />
              Audit Center
            </span>
          </div>
        </div>

        {/* Global Navigation Actions */}
        <nav className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigateTo('/plan')}
            aria-label="View AI Architecture Proposal"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-transparent text-[#334139] border border-[#334139]/20 hover:bg-[#334139]/5 transition-colors cursor-pointer"
          >
            <FileText size={13} />
            <span>AI Proposal</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo('/components')}
            aria-label="View design tokens"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-transparent text-[#334139] border border-[#334139]/20 hover:bg-[#334139]/5 transition-colors cursor-pointer"
          >
            <Palette size={13} />
            <span>Design Tokens</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo('/workspace')}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-[#064C1C] text-[#FDFFFC] hover:bg-[#1E2D24] shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span>Return to Canvas</span>
          </button>
        </nav>
      </header>

      {/* Main Dedicated Audit Page Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 overflow-y-auto custom-scrollbar">
        <ValidationCenter />
      </main>
    </motion.div>
  );
}

