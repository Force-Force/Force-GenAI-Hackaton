import { useEffect, useState } from 'react';
import { AppProviders } from './app/providers/AppProviders';
import { AgentEntryPage } from './pages/AgentEntryPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { ComponentsPage } from './pages/ComponentsPage';
import { PlanProposalPage } from './pages/PlanProposalPage';
import { AuditCenterPage } from './pages/AuditCenterPage';
import { ProjectHistoryPage } from './pages/ProjectHistoryPage';
import { ProjectHistoryModal } from './features/history/components/ProjectHistoryModal';
import { PlatformTransitionLoader } from './components/ui/PlatformTransitionLoader';
import { onNavigationTransition } from './utils/navigation';

function resolveRoute() {
  const path = window.location.pathname;
  const hash = window.location.hash;
  if (path === '/history' || hash === '#/history' || hash === '#history') {
    return 'history';
  }
  if (path === '/components' || hash === '#/components' || hash === '#components') {
    return 'components';
  }
  if (path === '/workspace' || hash === '#/workspace' || hash === '#workspace') {
    return 'workspace';
  }
  if (path === '/plan' || hash === '#/plan' || hash === '#plan') {
    return 'plan';
  }
  if (
    path === '/audit' ||
    hash === '#/audit' ||
    hash === '#audit' ||
    path === '/validate' ||
    hash === '#/validate' ||
    hash === '#validate' ||
    path === '/insights' ||
    hash === '#/insights' ||
    hash === '#insights' ||
    path === '/dashboard' ||
    hash === '#/dashboard' ||
    hash === '#dashboard'
  ) {
    return 'audit';
  }
  return 'entry';
}

export default function App() {
  const [route, setRoute] = useState(resolveRoute);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const handleLocation = () => setRoute(resolveRoute());
    window.addEventListener('popstate', handleLocation);
    window.addEventListener('hashchange', handleLocation);

    const unsubscribe = onNavigationTransition((navigating) => {
      setIsNavigating(navigating);
    });

    return () => {
      window.removeEventListener('popstate', handleLocation);
      window.removeEventListener('hashchange', handleLocation);
      unsubscribe();
    };
  }, []);

  return (
    <AppProviders>
      <div className="min-h-screen transition-opacity duration-200">
        {route === 'components' && <ComponentsPage />}
        {route === 'workspace' && <WorkspacePage />}
        {route === 'plan' && <PlanProposalPage />}
        {route === 'audit' && <AuditCenterPage />}
        {route === 'history' && <ProjectHistoryPage />}
        {route === 'entry' && <AgentEntryPage />}
      </div>
      <ProjectHistoryModal />
      <PlatformTransitionLoader
        visible={isNavigating}
        variant="aura-pulse-glow"
        label="Transitioning Platform Workspace"
      />
    </AppProviders>
  );
}
