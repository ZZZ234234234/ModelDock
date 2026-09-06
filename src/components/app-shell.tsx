'use client';
import { Component, type ReactNode, type CSSProperties } from 'react';
import Link from './link';
import { usePathname } from './link';
import {
  LayoutDashboard,
  MessageSquare,
  GitCompareArrows,
  SquareTerminal,
  Plug,
  Layers,
  ChartNoAxesCombined,
  History,
  Settings,
  Info,
  Sun,
  Moon,
  ChevronRight,
  ChevronsUpDown,
  ShieldCheck,
  LockKeyhole,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { AppStore, useApp } from '../store/app-store';
import { Onboarding } from './onboarding';
const navigation = [
  { href: '/', zh: '工作台', en: 'Dashboard', icon: LayoutDashboard },
  { href: '/chat', zh: '对话', en: 'Chat', icon: MessageSquare },
  { href: '/compare', zh: '模型对比', en: 'Compare', icon: GitCompareArrows },
  { href: '/playground', zh: '调试台', en: 'Playground', icon: SquareTerminal },
  { href: '/providers', zh: '服务商', en: 'Providers', icon: Plug },
  { href: '/models', zh: '模型库', en: 'Models', icon: Layers },
  { href: '/usage', zh: '用量统计', en: 'Usage', icon: ChartNoAxesCombined },
  { href: '/history', zh: '历史记录', en: 'History', icon: History },
  { href: '/settings', zh: '设置', en: 'Settings', icon: Settings },
  { href: '/about', zh: '关于', en: 'About', icon: Info },
];
class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main style={{ padding: 50 }}>
        <h1>ModelDock</h1>
        <p>
          页面遇到错误，你的本地数据仍被保留。 / An error occurred. Your local data is retained.
        </p>
        <Button onClick={() => window.location.reload()}>重新加载 / Reload</Button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function Navigation() {
  const { data, t } = useApp();
  const path = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader style={{ padding: '26px 18px 0' }}>
        <Link className="brand" href="/">
          <span className="brand-mark">
            <Layers size={22} />
          </span>
          ModelDock
          <span className="badge" style={{ fontSize: 12, marginLeft: 'auto', letterSpacing: 0 }}>
            BETA
          </span>
        </Link>
        <div className="workspace-name">
          <span className="provider-icon" style={{ width: 27, height: 27, fontSize: 12 }}>
            M
          </span>
          <span style={{ fontSize: 13, flex: 1 }}>{t('个人工作空间', 'Personal workspace')}</span>
          <ChevronsUpDown size={13} className="muted" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup style={{ padding: '0 14px' }}>
          <div className="nav-label">WORKSPACE</div>
          <SidebarMenu>
            {navigation.slice(0, 4).map((n) => (
              <SidebarMenuItem key={n.href}>
                <SidebarMenuButton className="nav-link" asChild isActive={path === n.href}>
                  <Link href={n.href} onClick={() => isMobile && setOpenMobile(false)}>
                    <n.icon />
                    <span>{t(n.zh, n.en)}</span>
                    {n.href === '/compare' && (
                      <span className="version" style={{ marginLeft: 'auto' }}>
                        ⌘
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          <div className="nav-label">MANAGEMENT</div>
          <SidebarMenu>
            {navigation.slice(4, 8).map((n) => (
              <SidebarMenuItem key={n.href}>
                <SidebarMenuButton className="nav-link" asChild isActive={path === n.href}>
                  <Link href={n.href} onClick={() => isMobile && setOpenMobile(false)}>
                    <n.icon />
                    <span>{t(n.zh, n.en)}</span>
                    {n.href === '/providers' && data.providers.length > 0 && (
                      <span className="version" style={{ marginLeft: 'auto' }}>
                        {data.providers.length}
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter style={{ padding: '12px 14px' }}>
        <div className="notice" style={{ margin: '0 5px 12px', padding: 12 }}>
          <div className="inline" style={{ color: 'var(--foreground)', fontSize: 13 }}>
            <ShieldCheck size={15} />
            {t('本地优先', 'Local first')}
          </div>
          <p style={{ fontSize: 12, lineHeight: 1.7, margin: '7px 0 0' }}>
            {t('你的模型，你的数据。', 'Your models. Your data.')}
          </p>
        </div>
        <SidebarMenu>
          {navigation.slice(8).map((n) => (
            <SidebarMenuItem key={n.href}>
              <SidebarMenuButton className="nav-link" isActive={path === n.href} asChild>
                <Link href={n.href} onClick={() => isMobile && setOpenMobile(false)}>
                  <n.icon />
                  <span>{t(n.zh, n.en)}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <div className="sidebar-foot inline">
          <span className="provider-icon" style={{ width: 29, height: 29, fontSize: 12 }}>
            ZJ
          </span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, color: 'var(--foreground)' }}>ModelDock</span>
            <div className="version">Personal workspace</div>
          </div>
          <span className="version">v1.0.0</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
function Shell({ children }: { children: ReactNode }) {
  const { data, update, ready, t, storageError } = useApp();
  const path = usePathname();
  const nav = navigation.find((n) => n.href === path);
  return (
    <SidebarProvider style={{ '--sidebar-width': '228px' } as CSSProperties}>
      <Navigation />
      <SidebarInset className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <SidebarTrigger aria-label={t('切换导航栏', 'Toggle navigation')} />
            <div className="breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={13} />
              <strong>{nav ? t(nav.zh, nav.en) : 'ModelDock'}</strong>
            </div>
          </div>
          <div className="actions">
            <span className="secondary-top badge">
              <LockKeyhole size={12} />
              {t('本地工作空间', 'Local workspace')}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                update((d) => ({ ...d, settings: { ...d.settings, demo: !d.settings.demo } }))
              }
              title={t('切换演示与真实模式', 'Switch Demo / Live mode')}
            >
              <span
                className="status-dot"
                style={{ color: data.settings.demo ? '#d7bf78' : 'var(--primary)' }}
              />
              {data.settings.demo ? t('演示模式', 'Demo mode') : t('真实模式', 'Live mode')}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('切换主题', 'Toggle theme')}
              onClick={() =>
                update((d) => ({
                  ...d,
                  settings: {
                    ...d.settings,
                    theme: d.settings.theme === 'dark' ? 'light' : 'dark',
                  },
                }))
              }
            >
              {data.settings.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
          </div>
        </header>
        {storageError && (
          <div role="alert" className="notice error-box">
            {storageError}
          </div>
        )}
        {ready ? (
          <ErrorBoundary key={`${path}-${data.settings.demo}`}>{children}</ErrorBoundary>
        ) : (
          <div className="page-body" aria-label="Loading ModelDock">
            <Skeleton className="h-10 w-48 mb-8" />
            <Skeleton className="h-48 w-full mb-8" />
            <Skeleton className="h-80 w-full" />
          </div>
        )}
        {ready && <Onboarding />}
      </SidebarInset>
      <Toaster theme={data.settings.theme} richColors position="bottom-right" />
    </SidebarProvider>
  );
}
export function AppRoot({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <AppStore>
        <Shell>{children}</Shell>
      </AppStore>
    </ErrorBoundary>
  );
}
