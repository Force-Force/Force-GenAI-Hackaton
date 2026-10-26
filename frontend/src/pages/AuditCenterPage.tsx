import { useEffect } from "react";
import { Workflow, FileText, RotateCcw, History } from "lucide-react";
import { motion } from "motion/react";
import { navigateTo } from "../utils/navigation";
import { ValidationCenter } from "../features/validation/components/ValidationCenter";
import { useWorkspaceStore } from "../features/workspace/store/workspaceStore";
import { useInsightStore } from "../features/insights/store/insightStore";
import { useBackendStore } from "../services/session/backendSession";
import { useHistoryStore } from "../features/history/store/historyStore";
import { WorkspacePromptBar } from "../features/workspace/components/WorkspacePromptBar";
import logoUrl from "../assets/logo.png";

export function AuditCenterPage() {
  const runValidation = useWorkspaceStore((s) => s.runValidation);
  const isValidating = useWorkspaceStore((s) => s.isValidating);
  const queryNightshiftAgent = useInsightStore((s) => s.queryNightshiftAgent);
  const fetchLiveInsights = useInsightStore((s) => s.fetchLiveInsights);
  const isLoadingInsights = useInsightStore((s) => s.isLoading);

  useEffect(() => {
    void useBackendStore
      .getState()
      .checkHealth()
      .then((online) => {
        if (online) {
          void fetchLiveInsights(useBackendStore.getState().activePipelineId);
        }
      });
  }, [fetchLiveInsights]);

  const handleRefresh = async () => {
    const { isOnline, activePipelineId } = useBackendStore.getState();
    await Promise.allSettled([
      runValidation(),
      isOnline
        ? fetchLiveInsights(activePipelineId).then(() =>
            queryNightshiftAgent(
              "Analyze latest settled transactions and customer cohorts for variance or drift.",
            ),
          )
        : queryNightshiftAgent(
            "Analyze latest settled transactions and customer cohorts for variance or drift.",
          ),
    ]);
  };

  const handlePromptSubmit = async (text: string) => {
    // Charts come only from the analysis agent's real query results.
    await queryNightshiftAgent(text);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      style={{ backgroundColor: "#FDFFFC" }}
      className="h-screen w-screen flex flex-col font-sans text-[#334139] selection:bg-[#064C1C]/15 antialiased overflow-hidden"
    >
      {/* Pinned Top Header with Porcelain Gradient */}
      <header
        style={{
          background:
            "linear-gradient(to bottom, rgba(253, 255, 252, 1) 0%, rgba(253, 255, 252, 0.95) 60%, rgba(253, 255, 252, 0) 100%)",
        }}
        className="w-full px-6 pt-3.5 pb-6 flex items-center justify-between shrink-0 z-20 pointer-events-auto"
      >
        <div
          onClick={() => navigateTo("/")}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity"
          aria-label="Return to Welcome Page"
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
            style={{ backgroundColor: "#D66F14" }}
            className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full text-white uppercase tracking-wider ml-1"
          >
            Agent First
          </span>
        </div>

        <nav className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isValidating || isLoadingInsights}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold text-[#334139] hover:text-[#064C1C] hover:bg-[#334139]/5 transition-colors cursor-pointer disabled:opacity-50"
            title="Re-analyze data and generate fresh insights"
          >
            <RotateCcw
              size={13}
              className={
                isValidating || isLoadingInsights
                  ? "animate-spin text-[#D66F14]"
                  : ""
              }
            />
            <span>
              {isValidating || isLoadingInsights
                ? "Analyzing…"
                : "Refresh Insights"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => useHistoryStore.getState().openHistory('runs')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#334139] hover:text-[#064C1C] hover:bg-[#334139]/5 transition-colors cursor-pointer"
            title="View Execution Runs & Revision History"
          >
            <History size={13} />
            <span>History</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo("/plan")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#334139] hover:text-[#064C1C] hover:bg-[#334139]/5 transition-colors cursor-pointer"
          >
            <FileText size={13} />
            <span>AI Proposal</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo("/workspace")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#334139] hover:text-[#064C1C] hover:bg-[#334139]/5 transition-colors cursor-pointer"
          >
            <Workflow size={13} />
            <span>Workspace</span>
          </button>
        </nav>
      </header>

      {/* Scrollable Body */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 md:px-6 -mt-6 pt-8 pb-28">
        <ValidationCenter />
      </div>

      {/* Pinned Bottom Prompt Bar for Interactive Agent Analysis */}
      <footer
        style={{
          background:
            "linear-gradient(to top, rgba(253, 255, 252, 1) 0%, rgba(253, 255, 252, 0.95) 55%, rgba(253, 255, 252, 0) 100%)",
        }}
        className="shrink-0 w-full pt-10 pb-4 px-4 z-20 flex flex-col items-center pointer-events-none"
      >
        <div className="w-full max-w-2xl pointer-events-auto">
          <WorkspacePromptBar
            className="relative bottom-auto left-auto translate-x-0 w-full px-0"
            disabled={isValidating || isLoadingInsights}
            placeholder={
              isLoadingInsights
                ? "Nightshift Analysis Agent querying warehouse... Please wait"
                : "Ask AuraBI to analyze a metric, generate a pie/bar/trend chart, or verify anomalies..."
            }
            onSend={handlePromptSubmit}
          />
        </div>
      </footer>
    </motion.div>
  );
}
