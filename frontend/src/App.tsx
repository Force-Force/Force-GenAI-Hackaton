import { useEffect, useState } from 'react';
import { AppProviders } from './app/providers/AppProviders';
import { AgentEntryPage } from './pages/AgentEntryPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { ComponentsPage } from './pages/ComponentsPage';
import { PlanProposalPage } from './pages/PlanProposalPage';
import { AuditCenterPage } from './pages/AuditCenterPage';

function resolveRoute() {
  const path = window.location.pathname;
  const hash = window.location.hash;
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
    hash === '#validate'
  ) {
    return 'audit';
  }
  return 'entry';
}

export default function App() {
  const [route, setRoute] = useState(resolveRoute);

  useEffect(() => {
    const handleLocation = () => setRoute(resolveRoute());
    window.addEventListener('popstate', handleLocation);
    window.addEventListener('hashchange', handleLocation);
    return () => {
      window.removeEventListener('popstate', handleLocation);
      window.removeEventListener('hashchange', handleLocation);
    };
  }, []);

  return (
    <AppProviders>
      {route === 'components' && <ComponentsPage />}
      {route === 'workspace' && <WorkspacePage />}
      {route === 'plan' && <PlanProposalPage />}
      {route === 'audit' && <AuditCenterPage />}
      {route === 'entry' && <AgentEntryPage />}
    </AppProviders>
  );
}
