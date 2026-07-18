import { ReactNode, useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Grid3X3, Bell, Search, CircleHelp, BookOpen, Activity, Settings, Shield, AlertTriangle, Server, Brain, ChevronDown, ChevronRight, Layers, Gauge, GitBranch, Menu, X, PanelLeftClose, PanelLeftOpen, User2, KeyRound, LogOut } from 'lucide-react';
import { DOMAIN_META, getOrders } from '@aiops/shared';
import { PLATFORM_BRANDING_EVENT, loadPlatformBranding } from '../lib/platform-branding';
import { warmCenterRoute } from '../App';

interface CenterLayoutProps {
  children: ReactNode;
}

interface MenuItem {
  path?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { path: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
}

interface Crumb {
  label: string;
  path?: string;
}

const PLATFORM_MODULES = [
  { key: 'portal', name: '平台首页', url: '/' },
  { key: 'ipe-portal', name: '服务门户', url: '/portal/' },
  { key: 'ipe-center', name: '运营中心', url: '/center/' },
  { key: 'ai-hub', name: 'AI 工具台', url: '/modules/ai-hub/index.html' },
  { key: 'inspect', name: '智能点检', url: '/modules/inspect/autoops3.0.html' },
  { key: 'anomaly', name: '异常检测', url: '/modules/anomaly/anomaly-overview.html' },
  { key: 'alert', name: '告警运营', url: '/modules/alert/index.html' },
  { key: 'capacity', name: '容量运营', url: '/modules/capacity/capacity-overview.html' },
];

function ModuleSwitcher({ currentKey }: { currentKey: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
          open ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary hover:bg-primary/20'
        }`}
      >
        切换模块 <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] w-52 bg-white border border-border rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.10)] py-1 z-50">
          {PLATFORM_MODULES.map(m => (
            <a
              key={m.key}
              href={m.url}
              className={`block px-3 py-2 text-sm transition-colors ${
                m.key === currentKey
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {m.name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

const menuItems: MenuItem[] = [
  { path: '/', label: '仪表板', icon: LayoutDashboard },
  { path: '/orders', label: '工单管理', icon: ClipboardList },
  {
    label: '服务目录',
    icon: BookOpen,
    children: [
      { path: '/service-catalog', label: '全部服务', icon: Layers },
      { path: '/service-catalog/sla', label: 'SLA管理', icon: Gauge },
      { path: '/service-catalog/flow', label: '服务流程', icon: GitBranch },
    ],
  },
  { path: '/matrix', label: '能力矩阵', icon: Grid3X3 },
  { path: '/service-ledger', label: '交付资产', icon: BookOpen },
  { path: '/ai-knowledge', label: 'AI知识库', icon: Brain },
  { path: '/ops-integration', label: '运维集成中心', icon: Settings },
  { path: '/settings', label: '设置', icon: Settings },
];

function MenuGroup({ item, collapsed }: { item: MenuItem; collapsed: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isGroupActive = location.pathname === item.path || item.children!.some(c => location.pathname === c.path);
  const [expanded, setExpanded] = useState(isGroupActive);
  const GroupIcon = item.icon;
  const primaryTarget = item.path ?? item.children?.[0]?.path;
  const primeRoute = (path?: string) => {
    if (!path) return;
    warmCenterRoute(path);
  };

  useEffect(() => {
    if (collapsed) setExpanded(false);
  }, [collapsed]);

  if (collapsed) {
    return (
      <button
        title={item.label}
        onClick={() => primaryTarget && navigate(primaryTarget)}
        onMouseEnter={() => primeRoute(primaryTarget)}
        onFocus={() => primeRoute(primaryTarget)}
        className={`flex h-10 w-full items-center justify-center rounded-md transition-colors ${
          isGroupActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <GroupIcon className="h-[18px] w-[18px]" />
      </button>
    );
  }

  return (
    <div>
      <div
        className={`flex items-center gap-1 rounded-md transition-colors ${
          isGroupActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
      >
        <button
          onClick={() => item.path ? navigate(item.path) : setExpanded(!expanded)}
          onMouseEnter={() => primeRoute(item.path ?? primaryTarget)}
          onFocus={() => primeRoute(item.path ?? primaryTarget)}
          className={`flex-1 text-left px-3 py-2.5 text-sm flex items-center gap-3 rounded-md ${
            isGroupActive ? 'font-medium' : ''
          }`}
        >
          <GroupIcon className="w-[18px] h-[18px]" />
          <span className="flex-1">{item.label}</span>
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? `收起${item.label}` : `展开${item.label}`}
          className={`mr-2 rounded p-1 transition-colors ${
            isGroupActive ? 'hover:bg-primary/10' : 'hover:bg-muted'
          }`}
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>
      {expanded && (
        <div className="ml-4 mt-0.5 space-y-0.5">
          {item.children!.map(child => {
            const isActive = location.pathname === child.path;
            const ChildIcon = child.icon;
            return (
              <button
                key={child.path}
                onClick={() => navigate(child.path)}
                onMouseEnter={() => primeRoute(child.path)}
                onFocus={() => primeRoute(child.path)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <ChildIcon className="w-4 h-4" />
                <span>{child.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CenterLayout({ children }: CenterLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopNavCollapsed, setDesktopNavCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [brandingRefreshKey, setBrandingRefreshKey] = useState(0);
  const primeRoute = (path?: string) => {
    if (!path) return;
    warmCenterRoute(path);
  };

  const pendingCount = useMemo(() => {
    return getOrders().filter(o => o.status === 'pending' || o.status === 'reviewing' || o.status === 'processing').length;
  }, []);
  const branding = useMemo(() => loadPlatformBranding(), [brandingRefreshKey]);

  const breadcrumbs = useMemo<Crumb[]>(() => {
    const pathname = location.pathname;
    if (pathname === '/') return [{ label: '运营中心' }, { label: '仪表板' }];
    if (pathname === '/orders') return [{ label: '运营中心' }, { label: '工单管理' }];
    if (pathname.startsWith('/service-catalog')) return [{ label: '运营中心' }, { label: '服务目录', path: '/service-catalog' }];
    if (pathname === '/matrix') return [{ label: '运营中心' }, { label: '能力矩阵' }];
    if (pathname.startsWith('/matrix/')) {
      const domainKey = pathname.split('/')[2] || '';
      return [
        { label: '运营中心' },
        { label: '能力矩阵', path: '/matrix' },
        { label: DOMAIN_META[domainKey]?.name ?? '领域详情' },
      ];
    }
    if (pathname === '/service-ledger') return [{ label: '运营中心' }, { label: '交付资产' }];
    if (pathname.startsWith('/settings')) return [{ label: '运营中心' }, { label: '设置' }];
    if (pathname === '/ai-knowledge') return [{ label: '运营中心' }, { label: 'AI知识库' }];
    if (pathname.startsWith('/ops-integration')) return [{ label: '运营中心' }, { label: '运维集成中心' }];
    if (pathname === '/monitoring-center') return [{ label: '运营中心' }, { label: '运维集成中心', path: '/ops-integration' }, { label: '监控中心' }];
    if (pathname === '/ops-management') return [{ label: '运营中心' }, { label: '运维集成中心', path: '/ops-integration' }, { label: '运维管理' }];
    if (pathname === '/security-ops') return [{ label: '运营中心' }, { label: '运维集成中心', path: '/ops-integration' }, { label: '安全运维' }];
    if (pathname === '/fault-handling') return [{ label: '运营中心' }, { label: '运维集成中心', path: '/ops-integration' }, { label: '故障处理' }];
    if (pathname === '/dc-facility') return [{ label: '运营中心' }, { label: '运维集成中心', path: '/ops-integration' }, { label: '机房设施' }];
    return [{ label: '运营中心' }];
  }, [location.pathname]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [userMenuOpen]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'ipe_center_platform_branding_v1') {
        setBrandingRefreshKey(key => key + 1);
      }
    };
    const onBrandingChange = () => setBrandingRefreshKey(key => key + 1);
    window.addEventListener('storage', onStorage);
    window.addEventListener(PLATFORM_BRANDING_EVENT, onBrandingChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(PLATFORM_BRANDING_EVENT, onBrandingChange);
    };
  }, []);

  useEffect(() => {
    document.title = branding.browserTitle;
    const head = document.head;
    let favicon = head.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      head.appendChild(favicon);
    }
    favicon.href = branding.faviconDataUrl || '/favicon.ico';
  }, [branding]);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/orders?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const sidebarContent = (
    <>
      <div className={`border-b border-border ${desktopNavCollapsed ? 'px-3 py-4' : 'px-4 py-4'}`}>
        <div className={`flex items-center ${desktopNavCollapsed ? 'justify-center' : 'justify-between gap-2'}`}>
          <button onClick={() => navigate('/')} className={`flex items-center ${desktopNavCollapsed ? 'justify-center' : 'gap-2.5'}`} title="返回仪表板">
          <div className="w-8 h-8 overflow-hidden rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs shrink-0">
            {branding.logoDataUrl ? (
              <img src={branding.logoDataUrl} alt={branding.platformShortName} className="h-full w-full object-cover" />
            ) : (
              branding.platformShortName
            )}
          </div>
          {!desktopNavCollapsed && (
            <div className="flex flex-col leading-snug">
              <span className="font-bold text-lg text-foreground">{branding.platformName}</span>
              {branding.showSubtitle && <span className="text-xs text-muted-foreground">{branding.platformSubtitle}</span>}
            </div>
          )}
        </button>
        </div>
      </div>

      <nav className={`flex-1 space-y-1 overflow-y-auto ${desktopNavCollapsed ? 'px-2 py-3' : 'px-3 py-3'}`}>
        {menuItems.map((item, idx) => {
          if (item.children) {
            return <MenuGroup key={idx} item={item} collapsed={desktopNavCollapsed} />;
          }
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              title={desktopNavCollapsed ? item.label : undefined}
              key={item.path}
              onClick={() => navigate(item.path!)}
              onMouseEnter={() => primeRoute(item.path)}
              onFocus={() => primeRoute(item.path)}
              className={`w-full rounded-md transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <span className={`flex items-center ${desktopNavCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5 text-sm'}`}>
                <Icon className="w-[18px] h-[18px]" />
                {!desktopNavCollapsed && <span>{item.label}</span>}
              </span>
            </button>
          );
        })}
      </nav>

      <div className={`border-t border-border ${desktopNavCollapsed ? 'px-2 py-2' : 'px-3 py-2'}`}>
        <button
          title={desktopNavCollapsed ? '帮助中心' : undefined}
          onClick={() => navigate('/help')}
          onMouseEnter={() => primeRoute('/help')}
          onFocus={() => primeRoute('/help')}
          className={`w-full rounded-md transition-colors ${
            location.pathname === '/help'
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <span className={`flex items-center ${desktopNavCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5 text-sm'}`}>
            <CircleHelp className="w-[18px] h-[18px]" />
            {!desktopNavCollapsed && <span>帮助中心</span>}
          </span>
        </button>
      </div>
      <div className={`border-t border-border ${desktopNavCollapsed ? 'px-2 py-2' : 'px-3 py-2'}`}>
        <button
          type="button"
          title={desktopNavCollapsed ? '展开导航' : undefined}
          aria-label={desktopNavCollapsed ? '展开导航' : '收起导航'}
          onClick={() => setDesktopNavCollapsed(value => !value)}
          className={`w-full rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
            desktopNavCollapsed ? 'flex justify-center px-0 py-2.5' : 'flex items-center gap-3 px-3 py-2.5 text-sm'
          }`}
        >
          {desktopNavCollapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          {!desktopNavCollapsed && <span>收起导航</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="theme-center min-h-screen bg-background md:flex">
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="关闭导航抽屉"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] md:hidden"
        />
      )}

      <aside className={`hidden bg-white border-r border-border md:sticky md:top-0 md:flex md:h-screen md:shrink-0 md:flex-col transition-[width] duration-200 ${desktopNavCollapsed ? 'md:w-[76px]' : 'md:w-[208px]'}`}>
        {sidebarContent}
      </aside>

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)] transition-transform duration-300 md:hidden ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="text-sm font-semibold text-foreground">导航菜单</div>
          <button
            type="button"
            aria-label="关闭导航菜单"
            onClick={() => setMobileNavOpen(false)}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Main Content */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-white px-3 py-2 md:h-12 md:px-5 md:py-0">
          {/* Global Search */}
          <div className="flex min-w-0 flex-1 items-center gap-2 md:max-w-xs">
            <button
              type="button"
              aria-label="打开导航菜单"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索工单、服务..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              className="w-full h-8 pl-8 pr-3 text-sm rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
            />
            </div>
          </div>

          <div className="hidden min-w-0 flex-1 md:block" />

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <ModuleSwitcher currentKey="ipe-center" />
                    <button
                      onClick={() => navigate('/orders')}
                      className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Bell className="w-[18px] h-[18px]" />
              {pendingCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />}
            </button>
            <span className="hidden text-xs text-muted-foreground lg:inline">
              {pendingCount > 0 ? `${pendingCount} 个待处理工单` : '无待处理工单'}
            </span>
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(value => !value)}
                className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">张</span>
                <span className="hidden text-left md:block">
                  <span className="block text-xs font-medium text-foreground">张工</span>
                  <span className="block text-[11px] text-muted-foreground">基础架构师</span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 rounded-lg border border-border bg-white py-1 shadow-[0_10px_30px_rgba(15,23,42,0.14)]">
                  <button
                    onClick={() => { navigate('/settings?tab=security'); setUserMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    <User2 className="h-4 w-4 text-muted-foreground" />
                    账号与安全
                  </button>
                  <button
                    onClick={() => { navigate('/settings?tab=security'); setUserMenuOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    修改密码
                  </button>
                  <div className="my-1 h-px bg-border" />
                  <button
                    onClick={() => setUserMenuOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    <LogOut className="h-4 w-4 text-muted-foreground" />
                    退出登录
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-x-hidden p-3 md:p-5">
          {breadcrumbs.length > 2 && (
            <div className="mb-3 rounded-xl border border-slate-200 bg-white/88 px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)] backdrop-blur md:mb-4 md:px-4">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                {breadcrumbs.map((crumb, index) => (
                  <div key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
                    {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                    {crumb.path ? (
                      <button
                        onClick={() => navigate(crumb.path!)}
                        className="truncate text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {crumb.label}
                      </button>
                    ) : (
                      <span
                        className={`truncate text-sm ${
                          index === breadcrumbs.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {crumb.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
