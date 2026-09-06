'use client';
import { usePathname } from './link';
import { Dashboard } from '../features/dashboard';
import { ChatPage } from '../features/chat';
import { Compare } from '../features/compare';
import { Providers } from '../features/providers';
import { Models } from '../features/models';
import { Playground } from '../features/playground';
import { UsagePage } from '../features/usage';
import { History } from '../features/history';
import { SettingsPage } from '../features/settings';
import { About } from '../features/about';
export function Workspace({ section = 'dashboard' }: { section?: string }) {
  const path = usePathname();
  section = path === '/' ? 'dashboard' : path.slice(1);
  const Component =
    (
      {
        dashboard: Dashboard,
        chat: ChatPage,
        compare: Compare,
        providers: Providers,
        models: Models,
        playground: Playground,
        usage: UsagePage,
        history: History,
        settings: SettingsPage,
        about: About,
      } as Record<string, typeof Dashboard>
    )[section] ?? Dashboard;
  return <Component />;
}
