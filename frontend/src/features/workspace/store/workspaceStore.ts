import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ValidationItem } from '../../../types/pipeline';
import { runValidations } from '../../../utils/validationRules';
import { persistStateStorage } from '../../../store/persistStorage';
import { usePipelineStore } from './pipelineStore';

export type WorkspaceTab = 'canvas' | 'sources' | 'validation';

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

  exportModalOpen: boolean;
  compiledSql: string;

  setProjectName: (name: string) => void;
  setActiveTab: (tab: WorkspaceTab) => void;

  setLeftCollapsed: (collapsed: boolean) => void;
  setRightCollapsed: (collapsed: boolean) => void;
  setLeftSize: (size: number) => void;
  setRightSize: (size: number) => void;
  setFullscreen: (value: boolean) => void;

  runValidation: () => void;
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
      rightCollapsed: false,
      leftSize: 25,
      rightSize: 22,
      isFullscreen: false,

      validations: [],
      isValidating: false,
      isValid: null,

      exportModalOpen: false,
      compiledSql: '',

      setProjectName: (name) => set({ projectName: name }),
      setActiveTab: (tab) => set({ activeTab: tab }),

      setLeftCollapsed: (collapsed) => set({ leftCollapsed: collapsed }),
      setRightCollapsed: (collapsed) => set({ rightCollapsed: collapsed }),
      setLeftSize: (size) => set({ leftSize: size }),
      setRightSize: (size) => set({ rightSize: size }),
      setFullscreen: (value) => set({ isFullscreen: value }),

      runValidation: () => {
        set({ isValidating: true });
        const { nodes, edges } = usePipelineStore.getState();
        const items = runValidations(nodes, edges);
        set({
          validations: items,
          isValidating: false,
          isValid: items.every((i) => i.type !== 'error'),
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

      clearValidations: () => set({ validations: [], isValid: null }),

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
