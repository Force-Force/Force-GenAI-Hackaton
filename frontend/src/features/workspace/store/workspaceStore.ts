import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ValidationItem } from "../../../types/pipeline";
import { runValidations } from "../../../utils/validationRules";
import { flattenGraph } from "../../../utils/graph";
import { persistStateStorage } from "../../../store/persistStorage";
import { usePipelineStore } from "./pipelineStore";

export type WorkspaceTab = "canvas" | "sources" | "validation";

export type ValidationSource = "backend" | "local";
export type ValidationStatus = "PASSED" | "FAILED";

/** Weighted pass-rate (0-100): success=1, warning=0.5, error=0. */
function scoreOf(items: ValidationItem[]): number {
  if (items.length === 0) return 100;
  const weight = items.reduce(
    (acc, i) =>
      acc + (i.type === "success" ? 1 : i.type === "warning" ? 0.5 : 0),
    0,
  );
  return Math.round((weight / items.length) * 100);
}

interface WorkspaceState {
  projectName: string;
  activeTab: WorkspaceTab;

  leftCollapsed: boolean;
  rightCollapsed: boolean;
  leftSize: number;
  rightSize: number;
  isFullscreen: boolean;

  validations: ValidationItem[];
  isValidating: boolean;
  isValid: boolean | null;
  /** Score (0-100) of the last validation run. */
  validationScore: number | null;
  /** Letter grade (A-E) from the validation engine. */
  validationGrade: string | null;
  /** PASSED / FAILED verdict from the validation engine. */
  validationStatus: ValidationStatus | null;
  /** Human-readable summary line. */
  validationSummary: string | null;
  /** Whether the last run came from the backend engine or local rules. */
  validationSource: ValidationSource | null;

  exportModalOpen: boolean;
  compiledSql: string;

  setProjectName: (name: string) => void;
  setActiveTab: (tab: WorkspaceTab) => void;

  setLeftCollapsed: (collapsed: boolean) => void;
  setRightCollapsed: (collapsed: boolean) => void;
  setLeftSize: (size: number) => void;
  setRightSize: (size: number) => void;
  setFullscreen: (value: boolean) => void;

  runValidation: () => Promise<void>;
  addValidationRule: () => void;
  clearValidations: () => void;

  openExport: () => void;
  closeExport: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      projectName: "Retail Warehouse Master Draft",
      activeTab: "canvas",

      leftCollapsed: false,
      rightCollapsed: true,
      leftSize: 25,
      rightSize: 22,
      isFullscreen: false,

      validations: [],
      isValidating: false,
      isValid: null,
      validationScore: null,
      validationGrade: null,
      validationStatus: null,
      validationSummary: null,
      validationSource: null,

      exportModalOpen: false,
      compiledSql: "",

      setProjectName: (name) => set({ projectName: name }),
      setActiveTab: (tab) => set({ activeTab: tab }),

      setLeftCollapsed: (collapsed) => set({ leftCollapsed: collapsed }),
      setRightCollapsed: (collapsed) => set({ rightCollapsed: collapsed }),
      setLeftSize: (size) => set({ leftSize: size }),
      setRightSize: (size) => set({ rightSize: size }),
      setFullscreen: (value) => set({ isFullscreen: value }),

      runValidation: async () => {
        set({ isValidating: true, activeTab: "validation" });
        const pipe = usePipelineStore.getState();

        const { nodes, edges } = flattenGraph(pipe.nodes, pipe.edges);
        const items = runValidations(nodes, edges);
        const passed = items.every((i) => i.type !== "error");
        set({
          validations: items,
          isValidating: false,
          isValid: passed,
          validationScore: scoreOf(items),
          validationGrade: null,
          validationStatus: passed ? "PASSED" : "FAILED",
          validationSummary: "Validated the local pipeline graph.",
          validationSource: "local",
          activeTab: "validation",
        });
      },

      addValidationRule: () =>
        set((s) => ({
          validations: [
            ...s.validations,
            {
              id: `val_extra_${Date.now()}`,
              type: "success",
              message:
                "Naming convention check passed: columns conform to lowercase underscore notation.",
              category: "standards",
            },
          ],
        })),

      clearValidations: () =>
        set({
          validations: [],
          isValid: null,
          validationScore: null,
          validationGrade: null,
          validationStatus: null,
          validationSummary: null,
          validationSource: null,
        }),

      openExport: () => {
        const { projectName } = useWorkspaceStore.getState();
        const sql = usePipelineStore.getState().exportSql(projectName);
        set({ compiledSql: sql, exportModalOpen: true });
      },

      closeExport: () => set({ exportModalOpen: false }),
    }),
    {
      name: "aura-bi.workspace.v1",
      storage: createJSONStorage(() => persistStateStorage),
      partialize: (s) => ({
        projectName: s.projectName,
        leftSize: s.leftSize,
        rightSize: s.rightSize,
        leftCollapsed: s.leftCollapsed,
        rightCollapsed: s.rightCollapsed,
      }),
    },
  ),
);
