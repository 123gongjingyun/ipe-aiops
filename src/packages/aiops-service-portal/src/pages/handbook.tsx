import { Suspense, lazy, useEffect, useState } from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const HandbookViewer = lazy(() =>
  import('../../../shared/src/components/handbook-viewer').then(module => ({ default: module.HandbookViewer })),
);

const docs = [
  { key: 'background', label: '背景与定位' },
  { key: 'architecture', label: '平台架构' },
  { key: 'design-principles', label: '设计原则' },
  { key: 'brand-glossary', label: '品牌术语' },
  { key: 'service-specs', label: 'Spec 体系' },
] as const;

const docLoaders: Record<(typeof docs)[number]['key'], () => Promise<string>> = {
  background: () => import('@docs/handbook/background.md?raw').then(module => module.default),
  architecture: () => import('@docs/handbook/architecture.md?raw').then(module => module.default),
  'design-principles': () => import('@docs/handbook/design-principles.md?raw').then(module => module.default),
  'brand-glossary': () => import('@docs/handbook/brand-glossary.md?raw').then(module => module.default),
  'service-specs': () => import('@docs/handbook/service-specs.md?raw').then(module => module.default),
};

function HandbookFallback({ label }: { label: string }) {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-5 w-40 rounded bg-slate-200" />
      <div className="h-4 w-72 rounded bg-slate-100" />
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4">
        <div className="mb-3 text-xs text-slate-500">正在加载：{label}</div>
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-slate-100" />
          <div className="h-4 w-11/12 rounded bg-slate-100" />
          <div className="h-4 w-4/5 rounded bg-slate-100" />
          <div className="h-4 w-5/6 rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export function Handbook() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const activeKey = (searchParams.get('doc') as (typeof docs)[number]['key'] | null) || docs[0].key;
  const activeDoc = docs.find(d => d.key === activeKey) || docs[0];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void docLoaders[activeDoc.key]().then(nextContent => {
      if (cancelled) return;
      setContent(nextContent);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeDoc.key]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <BookOpen className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold text-foreground">设计手册</h1>
          <p className="text-xs text-muted-foreground">IPE/AIOps 平台设计文档</p>
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {docs.map(doc => (
          <button
            key={doc.key}
            onClick={() => setSearchParams({ doc: doc.key })}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors ${
              activeDoc.key === doc.key
                ? 'border-primary font-medium text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {doc.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-6">
        {loading ? (
          <HandbookFallback label={activeDoc.label} />
        ) : (
          <Suspense fallback={<HandbookFallback label={activeDoc.label} />}>
            <HandbookViewer content={content} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
