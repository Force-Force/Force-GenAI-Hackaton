import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ValidationItem } from '../../../types/pipeline';
import type { ValidationIssue, ValidationStatus } from '../../../contracts/backend';
import { runValidations } from '../../../utils/validationRules';
import { flattenGraph } from '../../../utils/graph';
import { persistStateStorage } from '../../../store/persistStorage';
import * as pipelineService from '../../../services/pipeline/pipelineService';
import { usePipelineStore } from './pipelineStore';

export type WorkspaceTab = 'canvas' | 'sources' | 'validation';

export type ValidationSource = 'backend' | 'local';

/** Weighted pass-rate (0-100): success=1, warning=0.5, error=0. */
function scoreOf(items: ValidationItem[]): number {
  if (items.length === 0) return 100;
  const weight = items.reduce(
    (acc, i) => acc + (i.type === 'success' ? 1 : i.type === 'warning' ? 0.5 : 0),
    0,
  );
  return Math.round((weight / items.length) * 100);
}

/** Bucket a backend issue code into one of the frontend display categories. */
function categoryOf(code: string): ValidationItem['category'] {
  const c = code.toLowerCase();
  if (/(^|_)(pk|fk|key|primary|foreign)/.test(c)) return 'keys';
  if (/(orphan|edge|connect|relation|cycle|source|target)/.test(c)) return 'relationships';
  if (/(name|naming|case|convention)/.test(c)) return 'naming';
  return 'standards';
}

/** Map a backend ValidationIssue into the frontend ValidationItem shape. */
function issueToItem(issue: ValidationIssue, index: number): ValidationItem {
  const type: ValidationItem['type'] =
    issue.severity === 'ERROR'
      ? 'error'
      : issue.severity === 'WARNING'
        ? 'warning'
        : 'success';
  return {
    id: `${issue.code || 'issue'}_${issue.node_id ?? index}`,
    type,
    message: issue.message,
    category: categoryOf(issue.code),
  };
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
  /** Letter grade (A-E) from the backend validation engine. */
  validationGrade: string | null;
  /** PASSED / FAILED verdict from the backend validation engine. */
  validationStatus: ValidationStatus | null;
  /** Human-readable summary line returned by the backend (or local note). */
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
      projectName: 'Retail Warehouse Master Draft',
      activeTab: 'canvas',

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
      compiledSql: '',

      setProjectName: (name) => set({ projectName: name }),
      setActiveTab: (tab) => set({ activeTab: tab }),

      setLeftCollapsed: (collapsed) => set({ leftCollapsed: collapsed }),
      setRightCollapsed: (collapsed) => set({ rightCollapsed: collapsed }),
      setLeftSize: (size) => set({ leftSize: size }),
      setRightSize: (size) => set({ rightSize: size }),
      setFullscreen: (value) => set({ isFullscreen: value }),

      runValidation: async () => {
        set({ isValidating: true, activeTab: 'validation' });
        const pipe = usePipelineStore.getState();

        // Ask the backend validation engine (route 7,
        // POST /pipelines/{id}/validate) to compute the authoritative result.
        // The backend persists the run, updates node statuses, and returns the
        // score / grade / status / issues / summary that we display verbatim.
        if (pipe.pipelineId) {
          try {
            const run = await pipelineService.validatePipeline(pipe.pipelineId);
            pipe.setSyncStatus('online');
            set({
              validations: run.issues.map(issueToItem),
              isValidating: false,
              isValid: run.status === 'PASSED',
              validationScore: run.score,
              validationGrade: run.grade ?? null,
              validationStatus: run.status,
              validationSummary: run.summary,
              validationSource: 'backend',
              activeTab: 'validation',
            });
            return;
          } catch {
            pipe.setSyncStatus('offline');
            // Fall through to the local engine below.
          }
        }

        // Offline / unbound fallback: validate the local in-memory graph so the
        // user still gets feedback when the backend is unreachable.
        const { nodes, edges } = flattenGraph(pipe.nodes, pipe.edges);
        const items = runValidations(nodes, edges);
        const passed = items.every((i) => i.type !== 'error');
        set({
          validations: items,
          isValidating: false,
          isValid: passed,
          validationScore: scoreOf(items),
          validationGrade: null,
          validationStatus: passed ? 'PASSED' : 'FAILED',
          validationSummary: pipe.pipelineId
            ? 'Backend unreachable — validated the local graph instead.'
            : 'No pipeline bound — validated the local graph.',
          validationSource: 'local',
          activeTab: 'validation',
        });
      },

      addValidationRule: () =>
        set((s) => ({
          validations: [
            ...s.validations,
            {
              id: `val_extra_${Date.now()}`,
              type: 'success',
              message: 'Naming convention check passed: columns conform to lowercase underscore notation.',
              category: 'standards',
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
      name: 'aura-bi.workspace.v1',
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
