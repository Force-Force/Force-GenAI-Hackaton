import { useEffect, useState } from 'react';
import { AppProviders } from './app/providers/AppProviders';
import { WorkspacePage } from './pages/WorkspacePage';
import { ComponentsPage } from './pages/ComponentsPage';

function resolveRoute() {
  const path = window.location.pathname;
  const hash = window.location.hash;
  if (path === '/components' || hash === '#/components' || hash === '#components') {
    return 'components';
  }
  return 'workspace';
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
      {route === 'components' ? <ComponentsPage /> : <WorkspacePage />}
    </AppProviders>
  );
}
