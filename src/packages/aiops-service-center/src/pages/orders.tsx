import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { buildWorkflowTimelineDetailSummary, buildWorkflowTimelineDurationSummary, buildWorkflowTimelineSlaSummary, Card, CardContent, Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@aiops/shared';
import { getOrders, archiveOrder, deleteOrder, onOrdersSync } from '@aiops/shared';
import type { Order, OrderStatus } from '@aiops/shared';
import { Package, Archive, FileDown, ChevronLeft, ChevronRight, Settings2, Lock, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/page-header';
import { ColumnSettingsDialog } from '../components/column-settings-dialog';
import { downloadStyledExcel } from '../lib/export-table';

const STATUS_TABS: { key: OrderStatus | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待处理' },
  { key: 'reviewing', label: '评审中' },
  { key: 'processing', label: '进行中' },
  { key: 'plan_confirming', label: '待确认方案' },
  { key: 'delivering', label: '交付中' },
  { key: 'completed', label: '待验收' },
  { key: 'confirmed', label: '已验收' },
  { key: 'archived', label: '已归档' },
];

const STATUS_MAP: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-700' },
  reviewing: { label: '评审中', color: 'bg-sky-100 text-sky-700' },
  processing: { label: '进行中', color: 'bg-blue-100 text-blue-700' },
  plan_confirming: { label: '待确认方案', color: 'bg-cyan-100 text-cyan-700' },
  delivering: { label: '交付中', color: 'bg-purple-100 text-purple-700' },
  completed: { label: '待验收', color: 'bg-green-100 text-green-700' },
  confirmed: { label: '已验收', color: 'bg-emerald-100 text-emerald-700' },
  archived: { label: '已归档', color: 'bg-slate-100 text-slate-700' },
};

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

interface ColumnDef {
  key: string;
  label: string;
  visible: boolean;
  exportable: boolean;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'seq', label: '序号', visible: true, exportable: true },
  { key: 'id', label: '工单编号', visible: true, exportable: true },
  { key: 'comboName', label: '服务组合', visible: true, exportable: true },
  { key: 'services', label: '包含服务', visible: true, exportable: true },
  { key: 'status', label: '状态', visible: true, exportable: true },
  { key: 'createdAt', label: '创建时间', visible: true, exportable: true },
  { key: 'archivedAt', label: '归档时间', visible: false, exportable: true },
  { key: 'timelineSla', label: '节点SLA摘要', visible: false, exportable: true },
  { key: 'timelineDuration', label: '节点耗时摘要', visible: false, exportable: true },
  { key: 'timelineDetail', label: '节点时间明细', visible: false, exportable: true },
  { key: 'actions', label: '操作', visible: true, exportable: false },
];

function getOrderColumnValue(order: Order, columnKey: string, index: number) {
  switch (columnKey) {
    case 'seq': return index + 1;
    case 'services': return order.services.join(' / ');
    case 'status': return STATUS_MAP[order.status]?.label || order.status;
    case 'archivedAt': return order.archivedAt || '-';
    case 'timelineSla': return buildWorkflowTimelineSlaSummary(order.workflowTimeline ?? []);
    case 'timelineDuration': return buildWorkflowTimelineDurationSummary(order.workflowTimeline ?? []);
    case 'timelineDetail': return buildWorkflowTimelineDetailSummary(order.workflowTimeline ?? []);
    default: return String((order as unknown as Record<string, string | undefined>)[columnKey] || '');
  }
}

function exportOrdersToExcel(orders: Order[], columns: ColumnDef[]) {
  const exportableColumns = columns.filter(column => column.exportable && column.key !== 'actions');
  downloadStyledExcel({
    title: '工单管理导出',
    filename: `工单列表_${new Date().toLocaleDateString('zh-CN')}.xls`,
    note: '导出范围：当前筛选结果。字段列根据导出字段设置生成。',
    headers: exportableColumns.map(column => column.label),
    rows: orders.map((order, index) => exportableColumns.map(column => getOrderColumnValue(order, column.key, index))),
  });
}

export function Orders() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>(getOrders());
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [draftColumns, setDraftColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [columnDialogMode, setColumnDialogMode] = useState<'visible' | 'exportable' | null>(null);
  const queryText = searchParams.get('q')?.trim().toLowerCase() || '';

  useEffect(() => {
    setOrders(getOrders());
    return onOrdersSync(() => setOrders(getOrders()));
  }, []);

  const filtered = useMemo(() => {
    const list = activeTab === 'all' ? orders : orders.filter(o => o.status === activeTab);
    if (!queryText) return list;
    return list.filter(order =>
      order.id.toLowerCase().includes(queryText) ||
      order.comboName.toLowerCase().includes(queryText) ||
      order.services.some(service => service.toLowerCase().includes(queryText)),
    );
  }, [orders, activeTab, queryText]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleArchive = (id: string) => {
    archiveOrder(id);
    setOrders(getOrders());
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteOrder(deleteTarget.id);
    setDeleteTarget(null);
    setOrders(getOrders());
  };

  const toggleColumn = (key: string, mode: 'visible' | 'exportable') => {
    setDraftColumns(prev => prev.map(column => {
      if (column.key !== key) return column;
      return { ...column, [mode]: !column[mode] };
    }));
  };

  const openColumnDialog = (mode: 'visible' | 'exportable') => {
    setDraftColumns(columns);
    setColumnDialogMode(mode);
  };

  const applyColumnDialog = (afterApply?: () => void) => {
    setColumns(draftColumns);
    setColumnDialogMode(null);
    afterApply?.();
  };

  const resetColumns = (mode: 'visible' | 'exportable') => {
    setDraftColumns(prev => prev.map(column => {
      const defaults = DEFAULT_COLUMNS.find(item => item.key === column.key);
      return defaults ? { ...column, [mode]: defaults[mode] } : column;
    }));
  };

  const setAllColumns = (mode: 'visible' | 'exportable', value: boolean) => {
    setDraftColumns(prev => prev.map(column => {
      if (column.key === 'actions' && mode === 'exportable') return column;
      return { ...column, [mode]: value };
    }));
  };

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<Package className="h-5 w-5" />}
        title="工单管理"
        description={`查看和管理所有服务交付工单。归档后资产将固化入库，默认不可解档${queryText ? ` · 当前按关键字筛选：${searchParams.get('q')}` : ''}`}
      />

      {/* Status Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-primary text-white'
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-80">
              ({tab.key === 'all' ? orders.length : orders.filter(o => o.status === tab.key).length})
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => openColumnDialog('exportable')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-muted text-foreground hover:bg-muted/80 transition-colors"
          >
            <FileDown className="w-4 h-4" /> 导出表格
          </button>
          <button
            onClick={() => openColumnDialog('visible')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-muted text-foreground hover:bg-muted/80 transition-colors"
          >
            <Settings2 className="w-4 h-4" /> 字段显示
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>共 {filtered.length} 条</span>
          <span>/</span>
          <span>每页</span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="h-7 px-2 text-sm rounded-md border border-border bg-white"
          >
            {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span>条</span>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {columns.filter(c => c.visible).map(col => (
                    <th key={col.key} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.map((order, idx) => {
                  const seq = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      {columns.filter(c => c.visible).map(col => {
                        let content: React.ReactNode;
                        switch (col.key) {
                          case 'seq':
                            content = <span className="text-muted-foreground font-mono">{seq}</span>;
                            break;
                          case 'id':
                            content = (
                              <button
                                onClick={() => navigate(`/order/${order.id}`)}
                                className="text-primary hover:underline font-mono"
                              >
                                {order.id}
                              </button>
                            );
                            break;
                          case 'comboName':
                            content = <span className="font-medium">{order.comboName}</span>;
                            break;
                          case 'services':
                            content = (
                              <div className="flex flex-wrap gap-1">
                                {order.services.map(s => (
                                  <span key={s} className="px-1.5 py-0.5 text-xs rounded bg-muted">{s}</span>
                                ))}
                              </div>
                            );
                            break;
                          case 'status':
                            content = (
                              <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_MAP[order.status]?.color || 'bg-gray-100'}`}>
                                {STATUS_MAP[order.status]?.label || order.status}
                              </span>
                            );
                            break;
                          case 'createdAt':
                            content = <span className="text-muted-foreground">{order.createdAt}</span>;
                            break;
                          case 'archivedAt':
                            content = <span className="text-muted-foreground">{order.archivedAt || '-'}</span>;
                            break;
                          case 'actions':
                            content = (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => navigate(`/order/${order.id}`)}
                                  className="px-2 py-1 text-xs rounded bg-primary text-white hover:bg-primary/90"
                                >
                                  查看
                                </button>
                                {order.status === 'confirmed' && (
                                  <button
                                    onClick={() => handleArchive(order.id)}
                                    className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-muted text-foreground hover:bg-muted/80"
                                  >
                                    <Archive className="w-3 h-3" /> 归档
                                  </button>
                                )}
                                {order.status === 'archived' && (
                                  <span className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-slate-100 text-slate-700">
                                    <Lock className="w-3 h-3" /> 已归档锁定
                                  </span>
                                )}
                                <button
                                  onClick={() => setDeleteTarget(order)}
                                  className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-rose-200 text-rose-700 hover:bg-rose-50"
                                >
                                  <Trash2 className="w-3 h-3" /> 删除
                                </button>
                              </div>
                            );
                            break;
                          default:
                            content = String((order as any)[col.key] || '-');
                        }
                        return <td key={col.key} className="px-4 py-3">{content}</td>;
                      })}
                    </tr>
                  );
                })}
                {paged.length === 0 && (
                  <tr>
                    <td colSpan={columns.filter(c => c.visible).length} className="px-4 py-8 text-center text-muted-foreground">
                      暂无工单数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            第 {currentPage} / {totalPages} 页，共 {filtered.length} 条
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-md border border-border disabled:opacity-30 hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`min-w-[32px] h-8 px-2 text-sm rounded-md transition-colors ${
                  p === currentPage
                    ? 'bg-primary text-white'
                    : 'border border-border hover:bg-muted'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-md border border-border disabled:opacity-30 hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {columnDialogMode && (
        <ColumnSettingsDialog
          open
          title={columnDialogMode === 'visible' ? '工单字段显示' : '工单导出字段'}
          description={columnDialogMode === 'visible' ? '选择当前工单表格展示列。未确认前不会影响页面。' : '选择导出 Excel 的字段列，确认后生成带表头与自适应列宽的报表。'}
          items={draftColumns
            .filter(column => columnDialogMode === 'visible' || column.key !== 'actions')
            .map(column => ({ key: column.key, label: column.label, meta: column.key }))}
          selectedMap={Object.fromEntries(
            draftColumns
              .filter(column => columnDialogMode === 'visible' || column.key !== 'actions')
              .map(column => [column.key, column[columnDialogMode]])
          )}
          onOpenChange={open => { if (!open) setColumnDialogMode(null); }}
          onToggle={key => toggleColumn(key, columnDialogMode)}
          onReset={() => resetColumns(columnDialogMode)}
          onSelectAll={() => setAllColumns(columnDialogMode, true)}
          onClear={() => setAllColumns(columnDialogMode, false)}
          onConfirm={() => {
            if (columnDialogMode === 'visible') {
              applyColumnDialog();
              return;
            }
            applyColumnDialog(() => exportOrdersToExcel(filtered, draftColumns));
          }}
        />
      )}

      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除工单</DialogTitle>
            <DialogDescription>
              确定要删除「{deleteTarget?.comboName || '-'}」吗？删除后 Portal 和 Center 两侧将同步移除，该操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              确认删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
