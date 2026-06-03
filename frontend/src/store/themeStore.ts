import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { persistStateStorage } from './persistStorage';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

/** Reflect the active theme onto <html> so Tailwind `dark:` variants apply. */
export function applyThemeClass(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () =>
        set((s) => {
          const theme: Theme = s.theme === 'light' ? 'dark' : 'light';
          applyThemeClass(theme);
          return { theme };
        }),
      setTheme: (theme) => {
        applyThemeClass(theme);
        set({ theme });
      },
    }),
    {
      name: 'aura-bi.theme.v1',
      storage: createJSONStorage(() => persistStateStorage),
      onRehydrateStorage: () => (state) => {
        if (state) applyThemeClass(state.theme);
      },
    },
  ),
);
