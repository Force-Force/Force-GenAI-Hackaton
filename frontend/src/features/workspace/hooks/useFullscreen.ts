import { useCallback, useEffect, useRef } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';

/**
 * Fullscreen support for the central workspace. Uses the native Fullscreen API
 * on the provided container and mirrors the state into the workspace store so
 * the layout can hide side panels while maximized.
 */
export function useFullscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const isFullscreen = useWorkspaceStore((s) => s.isFullscreen);
  const setFullscreen = useWorkspaceStore((s) => s.setFullscreen);

  const enter = useCallback(async () => {
    const el = ref.current;
    if (el?.requestFullscreen) {
      try {
        await el.requestFullscreen();
      } catch {
        // Fall back to CSS-maximized state if the API is blocked.
        setFullscreen(true);
      }
    } else {
      setFullscreen(true);
    }
  }, [setFullscreen]);

  const exit = useCallback(async () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        setFullscreen(false);
      }
    } else {
      setFullscreen(false);
    }
  }, [setFullscreen]);

  const toggle = useCallback(() => {
    if (isFullscreen) void exit();
    else void enter();
  }, [isFullscreen, enter, exit]);

  // Keep store in sync with native fullscreen changes (e.g. Esc key).
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [setFullscreen]);

  return { ref, isFullscreen, toggle, enter, exit };
}
