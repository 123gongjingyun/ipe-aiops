import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, Power, PowerOff, BookOpen } from 'lucide-react';
import {
  useSpecs,
  useAtomicSpecs,
  useComboSpecs,
  deleteSpec,
  updateSpecStatus,
  Badge,
  Button,
  Card,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Label,
  Textarea,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@aiops/shared';
import type {
  ServiceSpec,
  AtomicServiceSpec,
  ServiceStatus,
  SpecFilter,
} from '@aiops/shared';
import { DOMAIN_META } from '@aiops/shared';
import { SpecSheet, CreateSpecSheet } from './spec-sheet';
import { PageHeader } from '../../components/page-header';

// ===== Status helpers =====

const STATUS_META: Record<ServiceStatus, { label: string; dot: string; badge: string }> = {
  online: { label: '已上线', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  offline: { label: '已下线', dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600' },
  draft: { label: '草稿', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700' },
};

function StatusBadge({ status }: { status: ServiceStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge className={`${meta.badge} hover:${meta.badge}`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${meta.dot}`} />
      {meta.label}
    </Badge>
  );
}

function typeBadge(spec: ServiceSpec) {
  if (spec.type === 'atomic') {
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">原子</Badge>;
  }
  return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">组合</Badge>;
}

function slaBadge(level: string) {
  const map: Record<string, string> = {
    gold: 'bg-amber-100 text-amber-700',
    silver: 'bg-gray-100 text-gray-600',
    bronze: 'bg-orange-100 text-orange-700',
  };
  const labels: Record<string, string> = { gold: '金', silver: '银', bronze: '铜' };
  return (
    <Badge className={map[level] ?? 'bg-gray-100 text-gray-600'}>
      {labels[level] ?? level}
    </Badge>
  );
}

function renderAtomicSummary(spec: ServiceSpec) {
  if (spec.type !== 'atomic') {
    return spec.description;
  }

  const atomicSpec = spec as AtomicServiceSpec;
  const outputs = atomicSpec.deliveryOutputs?.slice(0, 3).map(item => item.label).join('、');

  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground mt-0.5">
        {atomicSpec.serviceSummary || atomicSpec.description}
      </div>
      {(atomicSpec.supportedEnvironments?.length || outputs) && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {atomicSpec.supportedEnvironments?.map(env => (
            <span
              key={env}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700"
            >
              {env}
            </span>
          ))}
          {outputs && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">
              产出：{outputs}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ===== Delete confirm =====

function DeleteConfirm({ open, onOpenChange, onConfirm, name }: {
  open: boolean; onOpenChange: (v: boolean) => void; onConfirm: () => void; name: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>确定要删除「{name}」吗？此操作不可撤销。</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <DialogClose asChild><Button variant="outline" size="sm">取消</Button></DialogClose>
          <Button variant="destructive" size="sm" onClick={() => { onConfirm(); onOpenChange(false); }}>删除</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== Main page =====

const DOMAIN_OPTIONS = Object.entries(DOMAIN_META).map(([key, meta]) => ({ value: key, label: meta.name }));
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'online', label: '已上线' },
  { value: 'offline', label: '已下线' },
  { value: 'draft', label: '草稿' },
];
const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function ServiceCatalog() {
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState<SpecFilter>({});
  const specs = useSpecs(filter);
  const atomicSpecs = useAtomicSpecs();
  const comboSpecs = useComboSpecs();
  const [searchText, setSearchText] = useState('');

  // Sheet state
  const [viewSpec, setViewSpec] = useState<ServiceSpec | null>(null);
  const [editSpec, setEditSpec] = useState<ServiceSpec | null>(null);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ServiceSpec | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPage, setJumpPage] = useState('');

  useEffect(() => {
    const domain = searchParams.get('domain') || undefined;
    const status = (searchParams.get('status') as ServiceStatus | null) || undefined;
    const type = (searchParams.get('type') as 'atomic' | 'combo' | null) || undefined;
    const q = searchParams.get('q') || '';

    setFilter({ domain, status, type });
    setSearchText(q);
    setPage(1);
  }, [searchParams]);

  const domains = useMemo(() => new Set(atomicSpecs.map(s => s.domain)).size, [atomicSpecs]);

  const filtered = useMemo(() => {
    if (!searchText) return specs;
    const lower = searchText.toLowerCase();
    return specs.filter(s => s.name.toLowerCase().includes(lower) || s.description.toLowerCase().includes(lower));
  }, [specs, searchText]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const domainLabel = (key: string) => DOMAIN_META[key]?.name ?? key;

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteSpec(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleToggleStatus = (spec: ServiceSpec) => {
    updateSpecStatus(spec.id, spec.status === 'online' ? 'offline' : 'online');
  };

  const jumpToPage = () => {
    const next = Number(jumpPage);
    if (!Number.isFinite(next)) return;
    setPage(Math.max(1, Math.min(totalPages, next)));
    setJumpPage('');
  };

  return (
    <div>
      <div className="mb-6">
        <PageHeader
          icon={<BookOpen className="h-5 w-5" />}
          title="服务目录"
          description={
            `统一管理原子服务、组合服务、SLA 与交付模板${filter.domain ? ` · 当前已按「${domainLabel(filter.domain)}」过滤` : ''}${searchText ? ` · 关键词「${searchText}」` : ''}`
          }
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCard('总服务数', specs.length, 'text-foreground')}
        {statCard('原子服务', atomicSpecs.length, 'text-emerald-600')}
        {statCard('组合服务', comboSpecs.length, 'text-blue-600')}
        {statCard('服务域', domains, 'text-primary')}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={searchText} onChange={e => { setSearchText(e.target.value); setPage(1); }} placeholder="搜索服务名称..." className="w-full h-9 pl-8 pr-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/30" />
        </div>
        <Select value={filter.type ?? 'all'} onValueChange={v => { setFilter(f => ({ ...f, type: v === 'all' ? undefined : (v as 'atomic' | 'combo') })); setPage(1); }}>
          <SelectTrigger className="w-32 h-9"><SelectValue placeholder="服务类型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="atomic">原子服务</SelectItem>
            <SelectItem value="combo">组合服务</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filter.domain ?? 'all'} onValueChange={v => { setFilter(f => ({ ...f, domain: v === 'all' ? undefined : v })); setPage(1); }}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="服务领域" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部领域</SelectItem>
            {DOMAIN_OPTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filter.status ?? 'all'} onValueChange={v => { setFilter(f => ({ ...f, status: v === 'all' ? undefined : (v as ServiceStatus) })); setPage(1); }}>
          <SelectTrigger className="w-32 h-9"><SelectValue placeholder="状态" /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>共 {filtered.length} 条</span>
          <span>/</span>
          <span>每页</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="h-9 px-2 text-sm rounded-md border border-border bg-white"
          >
            {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
          </select>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-1" />新建服务</Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">序号</TableHead>
              <TableHead className="w-12">图标</TableHead>
              <TableHead>服务名称</TableHead>
              <TableHead className="w-20">类型</TableHead>
              <TableHead className="w-28">领域</TableHead>
              <TableHead className="w-20">SLA</TableHead>
              <TableHead className="w-24">状态</TableHead>
              <TableHead className="w-16">版本</TableHead>
              <TableHead className="w-44 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((spec, index) => (
              <TableRow key={spec.id}>
                <TableCell className="text-xs text-muted-foreground font-mono">
                  {(currentPage - 1) * pageSize + index + 1}
                </TableCell>
                <TableCell className="text-lg">{spec.icon}</TableCell>
                <TableCell>
                  <div className="font-medium text-sm">{spec.name}</div>
                  {renderAtomicSummary(spec)}
                </TableCell>
                <TableCell>{typeBadge(spec)}</TableCell>
                <TableCell className="text-sm">{spec.type === 'atomic' ? domainLabel((spec as AtomicServiceSpec).domain) : '-'}</TableCell>
                <TableCell>{slaBadge(spec.sla.level)}</TableCell>
                <TableCell><StatusBadge status={spec.status} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">v{spec.version}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setViewSpec(spec)}>详情</Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditSpec(spec)} title="编辑"><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(spec)} title={spec.status === 'online' ? '下线' : '上线'}>
                      {spec.status === 'online' ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5 text-emerald-600" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(spec)} disabled={spec.status === 'online'} title={spec.status === 'online' ? '上线状态不可删除' : '删除'}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无匹配的服务</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">第 {currentPage} / {totalPages} 页</span>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>上一页</Button>
            <Input
              value={jumpPage}
              onChange={e => setJumpPage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') jumpToPage(); }}
              placeholder="页码"
              className="h-8 w-16 text-center"
            />
            <Button variant="outline" size="sm" onClick={jumpToPage}>跳转</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>下一页</Button>
          </div>
        </div>
      )}

      {/* Sheet: View */}
      {viewSpec && (
        <SpecSheet spec={viewSpec} mode="view" open={!!viewSpec} onClose={() => setViewSpec(null)} onSwitchToEdit={() => { setViewSpec(null); setEditSpec(viewSpec); }} />
      )}

      {/* Sheet: Edit */}
      {editSpec && (
        <SpecSheet spec={editSpec} mode="edit" open={!!editSpec} onClose={() => setEditSpec(null)} />
      )}

      {/* Dialogs */}
      <CreateSpecSheet open={createOpen} onOpenChange={setCreateOpen} />
      {deleteTarget && (
        <DeleteConfirm open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }} onConfirm={handleDelete} name={deleteTarget.name} />
      )}
    </div>
  );
}

function statCard(label: string, value: number, color: string) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
