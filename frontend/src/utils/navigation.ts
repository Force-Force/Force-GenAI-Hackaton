export type NavigationTransitionListener = (
  isNavigating: boolean,
  targetPath: string,
) => void;

const transitionListeners = new Set<NavigationTransitionListener>();

/**
 * Register a listener to observe platform navigation state changes.
 */
export function onNavigationTransition(listener: NavigationTransitionListener) {
  transitionListeners.add(listener);
  return () => {
    transitionListeners.delete(listener);
  };
}

/**
 * Navigate to a platform route with smooth transitions, eliminating
 * screen flashes between view changes.
 */
export function navigateTo(path: string) {
  if (window.location.pathname === path && !window.location.hash) return;

  // Notify listeners that navigation started
  transitionListeners.forEach((fn) => fn(true, path));

  const performDomUpdate = () => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // Modern Web Guidance: Utilize View Transitions API when available
  if (
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    typeof (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition === 'function'
  ) {
    try {
      (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
        performDomUpdate();
      });
    } catch {
      performDomUpdate();
    }
  } else {
    performDomUpdate();
  }

  // Micro-window to allow new route to mount smoothly without visual flash
  setTimeout(() => {
    transitionListeners.forEach((fn) => fn(false, path));
  }, 220);
}
