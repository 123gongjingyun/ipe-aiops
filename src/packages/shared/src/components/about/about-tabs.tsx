import { useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

const tabs = [
  { path: '/about', label: '平台介绍', exact: true },
  { path: '/about/collab', label: '协作架构' },
  { path: '/about/guide', label: '使用指引' },
];

export function AboutTabs({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (tab: typeof tabs[number]) =>
    tab.exact ? location.pathname === tab.path : location.pathname.startsWith(tab.path);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">平台概览</h1>
        <p className="text-sm text-muted-foreground">GTMC AI-Native 数智化交付平台 · 框架设计</p>
      </div>

      <nav className="flex items-center gap-1 mb-6 border-b border-border pb-px">
        {tabs.map(tab => (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`px-3 py-2 text-sm rounded-t-md transition-colors border-b-2 -mb-px ${
              isActive(tab)
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div>{children}</div>
    </div>
  );
}
