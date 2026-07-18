import { ReactNode, useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  FilePenLine,
  LayoutGrid,
  LogOut,
  Menu,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ScrollText,
  User,
  ClipboardList,
  X,
} from 'lucide-react';
import { warmPortalRoute } from '../App';

interface PortalLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: '资源申请工作台', icon: FilePenLine },
  { path: '/common-requests', label: '常见资源申请', icon: LayoutGrid },
  { path: '/request-records', label: '资源申请单', icon: ClipboardList },
  { path: '/catalog', label: '完整服务目录', icon: LayoutGrid },
  { path: '/orders', label: '我的工单', icon: ClipboardList },
] as const;

const productTitleMap: Record<string, string> = {
  vm: '虚拟机申请',
  container: '容器申请',
  obs: 'OBS 申请',
  sfs: 'SFS 申请',
  permission: '用户权限申请',
  network: '网络策略申请',
};

const pageHeaderMeta: Array<{
  match: (pathname: string) => boolean;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    match: pathname => pathname === '/',
    title: '资源申请工作台',
    description: '从当前阶段最常用的入口开始，先完成申请材料整理，再进入后续评审与正式流程。',
    icon: FilePenLine,
  },
  {
    match: pathname => pathname === '/common-requests',
    title: '常见资源申请',
    description: '选择资源类型，一键进入申请材料填写。',
    icon: PackageSearch,
  },
  {
    match: pathname => pathname === '/request-records',
    title: '资源申请单',
    description: '用于查看草稿、已导出评审稿和历史申请材料记录，支持回溯、筛选和导出。',
    icon: ScrollText,
  },
  {
    match: pathname => pathname.startsWith('/request-review-export/'),
    title: '评审材料预览',
    description: '按正式评审材料结构查看当前申请单，支持在线审阅、打印 PDF 和导出 Excel。',
    icon: ScrollText,
  },
  {
    match: pathname => pathname === '/catalog',
    title: '完整服务目录',
    description: '当常见资源申请未覆盖当前场景时，可在这里查找其他服务项和补充入口。',
    icon: LayoutGrid,
  },
  {
    match: pathname => pathname === '/orders',
    title: '我的工单',
    description: '用于查看正式审批、交付、验收和归档阶段的工单进展，不承担当前材料整理职责。',
    icon: ClipboardCheck,
  },
  {
    match: pathname => pathname === '/help',
    title: '帮助中心',
    description: '查看平台说明、常见问题和支持方式；填写规则可从常见资源申请页或填写工作区进入。',
    icon: CircleHelp,
  },
  {
    match: pathname => pathname === '/guide',
    title: '填写说明',
    description: '查看申请材料准备方式、字段填写建议和导出后的评审使用方式。',
    icon: CircleHelp,
  },
  {
    match: pathname => pathname.startsWith('/guided-workbench'),
    title: '引导填写',
    description: '适合知道要申请哪类资源，但还不确定具体该怎么写的场景，系统会一步步提示补充。',
    icon: FilePenLine,
  },
  {
    match: pathname => pathname.startsWith('/direct-workbench'),
    title: '直接填写',
    description: '适合已经比较清楚申请内容的场景，可直接把环境、规模、网络和补充材料一次性填完整。',
    icon: FilePenLine,
  },
];

export function PortalLayout({ children }: PortalLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopNavCollapsed, setDesktopNavCollapsed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isWorkbenchRoute =
    location.pathname.startsWith('/apply/') ||
    location.pathname.startsWith('/apply-service/') ||
    location.pathname.startsWith('/guided-workbench') ||
    location.pathname.startsWith('/direct-workbench');
  const mainContainerClass = isWorkbenchRoute
    ? 'w-full max-w-none p-3 md:p-5'
    : 'mx-auto w-full max-w-[1680px] px-6 py-6 2xl:px-8';
  const currentProductTitle = (() => {
    const params = new URLSearchParams(location.search);
    const product = params.get('product') || '';
    return productTitleMap[product] || '';
  })();
  const currentPageHeader = (() => {
    if (location.pathname.startsWith('/guided-workbench') || location.pathname.startsWith('/direct-workbench')) {
      return null;
    }
    return pageHeaderMeta.find(item => item.match(location.pathname));
  })();

  const primeRoute = (path?: string) => {
    if (!path) return;
    warmPortalRoute(path);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

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

  const sidebarContent = (
    <>
      <div className={`border-b border-border ${desktopNavCollapsed ? 'px-3 py-4' : 'px-4 py-4'}`}>
        <div className={`flex items-center ${desktopNavCollapsed ? 'justify-center' : 'justify-between gap-2'}`}>
          <button
            onClick={() => navigate('/')}
            className={`flex items-center ${desktopNavCollapsed ? 'justify-center' : 'gap-2.5'}`}
            title="返回资源申请工作台"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
              AI
            </div>
            {!desktopNavCollapsed && (
              <div className="flex flex-col leading-snug">
                <span className="text-lg font-bold text-foreground">交付门户</span>
                <span className="text-xs text-muted-foreground">资源申请发起入口</span>
              </div>
            )}
          </button>
        </div>
      </div>

      <nav className={`flex-1 space-y-1 overflow-y-auto ${desktopNavCollapsed ? 'px-2 py-3' : 'px-3 py-3'}`}>
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              title={desktopNavCollapsed ? item.label : undefined}
              onClick={() => navigate(item.path)}
              onMouseEnter={() => primeRoute(item.path)}
              onFocus={() => primeRoute(item.path)}
              className={`w-full rounded-md transition-colors ${
                isActive
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className={`flex items-center ${desktopNavCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5 text-sm'}`}>
                <Icon className="h-[18px] w-[18px]" />
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
              ? 'bg-primary/10 font-medium text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <span className={`flex items-center ${desktopNavCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5 text-sm'}`}>
            <CircleHelp className="h-[18px] w-[18px]" />
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
    <div className="theme-portal min-h-screen bg-background md:flex">
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="关闭导航抽屉"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] md:hidden"
        />
      )}

      <aside className={`hidden border-r border-border bg-white md:sticky md:top-0 md:flex md:h-screen md:shrink-0 md:flex-col transition-[width] duration-200 ${desktopNavCollapsed ? 'md:w-[76px]' : 'md:w-[220px]'}`}>
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

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-white px-3 py-2 md:h-12 md:px-5 md:py-0">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              aria-label="打开导航菜单"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">
                {location.pathname === '/'
                  ? '资源申请工作台'
                  : location.pathname === '/common-requests'
                    ? '常见资源申请'
                  : location.pathname === '/request-records'
                    ? '资源申请单'
                  : location.pathname === '/guided-workbench'
                    ? (currentProductTitle || '引导填写')
                    : location.pathname === '/direct-workbench'
                      ? (currentProductTitle || '直接填写')
                      : navItems.find(item => item.path === location.pathname)?.label || (location.pathname === '/help' ? '帮助中心' : '交付门户')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2" ref={menuRef}>
            <button
              onClick={() => navigate('/orders')}
              onMouseEnter={() => primeRoute('/orders')}
              onFocus={() => primeRoute('/orders')}
              className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Bell className="h-[18px] w-[18px]" />
            </button>
            <div className="mx-1 h-5 w-px bg-border" />
            <button
              onClick={() => setUserMenuOpen(v => !v)}
              className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 transition-colors hover:bg-muted"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">张</div>
              <span className="hidden text-sm text-foreground sm:inline">张三</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-6 top-[52px] z-50 w-48 rounded-md border border-border bg-card py-1 shadow-[0_4px_16px_rgba(0,0,0,0.10)]">
                <div className="border-b border-border px-3 py-2">
                  <p className="text-sm font-medium text-foreground">张三</p>
                  <p className="text-xs text-muted-foreground">zhangsan@company.com</p>
                </div>
                <button
                  onClick={() => setUserMenuOpen(false)}
                  className="w-full cursor-not-allowed px-3 py-2 text-left text-sm text-muted-foreground"
                  disabled
                >
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" /> 个人信息
                  </span>
                </button>
                <button
                  onClick={() => setUserMenuOpen(false)}
                  className="w-full cursor-not-allowed px-3 py-2 text-left text-sm text-muted-foreground"
                  disabled
                >
                  <span className="flex items-center gap-2">
                    <Settings className="h-4 w-4" /> 设置
                  </span>
                </button>
                <div className="my-1 border-t border-border" />
                <button
                  onClick={() => {
                    localStorage.removeItem('ipe_orders');
                    setUserMenuOpen(false);
                    navigate('/');
                    window.location.reload();
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-error transition-colors hover:bg-muted"
                >
                  <span className="flex items-center gap-2">
                    <LogOut className="h-4 w-4" /> 退出登录
                  </span>
                </button>
              </div>
            )}
          </div>
        </header>

        <main className={mainContainerClass}>
          {currentPageHeader ? (
            <section className="mb-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <currentPageHeader.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">{currentPageHeader.title}</h1>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{currentPageHeader.description}</p>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
