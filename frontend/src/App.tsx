import { AppProviders } from './app/providers/AppProviders';
import { WorkspacePage } from './pages/WorkspacePage';

export default function App() {
  return (
    <AppProviders>
      <WorkspacePage />
    </AppProviders>
  );
}
