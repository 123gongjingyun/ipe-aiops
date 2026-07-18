import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, deleteOrder, useOrders } from '@aiops/shared';
import type { Order, OrderStatus } from '@aiops/shared';
import { ChevronLeft, ChevronRight, FileDown, Search, Trash2 } from 'lucide-react';
import { warmPortalRoute } from '../App';

const PAGE_SIZE_OPTIONS = [5, 10, 20];

const statusFilters: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'reviewing', label: '架构评审中' },
  { value: 'processing', label: 'ITSM审批中' },
  { value: 'plan_confirming', label: '待确认方案' },
  { value: 'delivering', label: '交付实施中' },
  { value: 'completed', label: '待验收' },
  { value: 'confirmed', label: '已验收' },
  { value: 'archived', label: '已归档' },
];

const statusMeta: Record<OrderStatus, { label: string; badge: string }> = {
  pending: { label: '待处理', badge: 'bg-amber-50 text-amber-700 border border-amber-200' },
  reviewing: { label: '架构评审中', badge: 'bg-sky-50 text-sky-700 border border-sky-200' },
  processing: { label: 'ITSM审批中', badge: 'bg-blue-50 text-blue-700 border border-blue-200' },
  plan_confirming: { label: '待确认方案', badge: 'bg-cyan-50 text-cyan-700 border border-cyan-200' },
  delivering: { label: '交付实施中', badge: 'bg-violet-50 text-violet-700 border border-violet-200' },
  completed: { label: '待验收', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  confirmed: { label: '已验收', badge: 'bg-emerald-100 text-emerald-800 border border-emerald-300' },
  archived: { label: '已归档', badge: 'bg-slate-100 text-slate-700 border border-slate-200' },
};

function getCurrentStageLabel(order: Order) {
  switch (order.status) {
    case 'pending':
      return order.reviewStatus === 'rejected' ? '待补充并重新提交' : '需求受理';
    case 'reviewing':
      return '架构评审';
    case 'processing':
      return 'ITSM审批';
    case 'plan_confirming':
      return '方案确认';
    case 'delivering':
      return '交付实施';
    case 'completed':
      return '验收处理中';
    case 'confirmed':
      return '已验收待归档';
    case 'archived':
      return '归档完成';
  }
}

function getNextActionText(order: Order) {
  switch (order.status) {
    case 'pending':
      return order.reviewStatus === 'rejected'
        ? '根据评审意见补充需求后重新提交'
        : '等待进入架构评审';
    case 'reviewing':
      return '等待架构评审通过后流转到审批阶段';
    case 'processing':
      return '等待 ITSM 审批结果回传';
    case 'plan_confirming':
      return '进入详情确认方案或反馈调整意见';
    case 'delivering':
      return '服务团队正在交付实施，完成后进入待验收';
    case 'completed':
      return '交付已完成，等待你确认验收';
    case 'confirmed':
      return '已验收完成，等待归档';
    case 'archived':
      return '工单与交付资产已归档';
  }
}

function getRecentUpdate(order: Order) {
  return order.archivedAt
    || order.reviewedAt
    || order.planFeedbackAt
    || order.itsm?.lastSyncedAt
    || order.deliverySteps?.find(step => step.updatedAt)?.updatedAt
    || order.approvalStages?.find(stage => stage.updatedAt)?.updatedAt
    || order.createdAt;
}

function getPendingSignal(order: Order) {
  if (order.status === 'plan_confirming') return '待你确认';
  if (order.status === 'completed') return '待你验收';
  if (order.status === 'pending' && order.reviewStatus === 'rejected') return '待你补充';
  if (order.status === 'archived') return '已结束';
  return '流转中';
}

function getProgressSummary(order: Order) {
  const totalSteps = 5;
  const current = (() => {
    switch (order.status) {
      case 'pending': return 1;
      case 'reviewing': return 1;
      case 'processing': return 2;
      case 'plan_confirming': return 3;
      case 'delivering': return 4;
      case 'completed': return 5;
      case 'confirmed': return 5;
      case 'archived': return 5;
    }
  })();
  return { current, total: totalSteps, percent: Math.round((current / totalSteps) * 100) };
}

function getServiceSummary(order: Order) {
  return `${order.services.length} 个服务`;
}

export function Orders() {
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const { allOrders, refresh } = useOrders();

  const searchedOrders = useMemo(() => {
    const lower = keyword.trim().toLowerCase();
    if (!lower) return allOrders;
    return allOrders.filter(order =>
      order.id.toLowerCase().includes(lower)
      || order.comboName.toLowerCase().includes(lower)
      || order.services.some(service => service.toLowerCase().includes(lower))
      || Object.values(order.answers || {}).some(value => String(value).toLowerCase().includes(lower)),
    );
  }, [allOrders, keyword]);

  const filteredOrders = useMemo(() => {
    return filter === 'all'
      ? searchedOrders
      : searchedOrders.filter(order => order.status === filter);
  }, [filter, searchedOrders]);

  const statusCounts = useMemo(() => {
    return statusFilters.reduce<Record<string, number>>((acc, item) => {
      acc[item.value] = item.value === 'all'
        ? searchedOrders.length
        : searchedOrders.filter(order => order.status === item.value).length;
      return acc;
    }, {});
  }, [searchedOrders]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const exportOrders = async () => {
    const { downloadOrdersExcel } = await import('../../../shared/src/lib/order-export');
    await downloadOrdersExcel({
      orders: filteredOrders,
      filename: `我的工单_${new Date().toLocaleDateString('zh-CN')}.xlsx`,
      dashboardUrl: `${window.location.origin}/portal/#/`,
    });
  };

  const handleChangeFilter = (value: OrderStatus | 'all') => {
    setFilter(value);
    setPage(1);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteOrder(deleteTarget.id);
    setDeleteTarget(null);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">查看正式审批、交付与验收进展</h2>
          <p className="mt-1 text-sm text-slate-600">
            用更直观的工单视图跟踪当前阶段、待你处理事项和交付进展。
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block min-w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={event => {
                setKeyword(event.target.value);
                setPage(1);
              }}
              placeholder="搜索工单号 / 申请名称 / 服务 / 表单内容"
              className="h-10 w-full rounded-full border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
          </label>
          <Button variant="outline" size="sm" onClick={exportOrders} disabled={filteredOrders.length === 0}>
            <FileDown className="mr-1.5 h-4 w-4" />
            导出当前结果
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-9">
        {statusFilters.map(item => {
          const active = filter === item.value;
          return (
            <button
              key={item.value}
              onClick={() => handleChangeFilter(item.value)}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                active
                  ? 'border-primary/30 bg-primary/5 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs text-slate-500">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{statusCounts[item.value] || 0}</div>
            </button>
          );
        })}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-600">
            当前状态：
            <span className="ml-1 font-medium text-slate-950">{statusFilters.find(item => item.value === filter)?.label}</span>
            <span className="ml-2 text-slate-400">共 {filteredOrders.length} 条</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>每页</span>
            <select
              value={pageSize}
              onChange={event => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm"
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span>条</span>
          </div>
        </div>

        {pagedOrders.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-500">当前筛选条件下暂无工单</div>
        ) : (
          <div className="space-y-0">
            <div className="grid grid-cols-[76px_minmax(0,1.15fr)_180px_180px_190px_220px_108px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-medium tracking-wide text-slate-500">
              <div>序号</div>
              <div>申请信息</div>
              <div>当前状态</div>
              <div>当前阶段</div>
              <div>最近更新时间</div>
              <div>阶段进展</div>
              <div>操作</div>
            </div>

            {pagedOrders.map((order, index) => {
              const progress = getProgressSummary(order);
              const recentUpdate = getRecentUpdate(order);
              const serial = (currentPage - 1) * pageSize + index + 1;

              return (
                <div
                  key={order.id}
                  onMouseEnter={() => warmPortalRoute(`/order/${order.id}`)}
                  className="grid w-full grid-cols-[76px_minmax(0,1.15fr)_180px_180px_190px_220px_108px] gap-4 border-b border-slate-100 px-5 py-5 text-left transition hover:bg-slate-50"
                >
                  <div
                    className="flex cursor-pointer items-start"
                    onClick={() => navigate(`/order/${order.id}`)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/order/${order.id}`);
                      }
                    }}
                    onFocus={() => warmPortalRoute(`/order/${order.id}`)}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">{serial}</span>
                  </div>

                  <div
                    className="min-w-0 cursor-pointer"
                    onClick={() => navigate(`/order/${order.id}`)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/order/${order.id}`);
                      }
                    }}
                    onFocus={() => warmPortalRoute(`/order/${order.id}`)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="font-mono text-sm font-medium text-primary">{order.id}</div>
                    <div className="mt-3 text-lg font-semibold text-slate-950">{order.comboName}</div>
                    <div className="mt-2 text-xs leading-5 text-slate-500">
                      {getServiceSummary(order)}
                    </div>
                    {order.reviewStatus === 'rejected' && order.reviewComment && (
                      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                        已退回补充：{order.reviewComment}
                      </div>
                    )}
                  </div>

                  <div
                    className="flex cursor-pointer items-start"
                    onClick={() => navigate(`/order/${order.id}`)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/order/${order.id}`);
                      }
                    }}
                    onFocus={() => warmPortalRoute(`/order/${order.id}`)}
                    role="button"
                    tabIndex={0}
                  >
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusMeta[order.status].badge}`}>
                      {statusMeta[order.status].label}
                    </span>
                  </div>

                  <div
                    className="cursor-pointer text-sm text-slate-700"
                    onClick={() => navigate(`/order/${order.id}`)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/order/${order.id}`);
                      }
                    }}
                    onFocus={() => warmPortalRoute(`/order/${order.id}`)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="font-medium text-slate-900">{getCurrentStageLabel(order)}</div>
                    <div className="mt-2 text-xs text-slate-500">{getNextActionText(order)}</div>
                  </div>

                  <div
                    className="cursor-pointer text-sm text-slate-700"
                    onClick={() => navigate(`/order/${order.id}`)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/order/${order.id}`);
                      }
                    }}
                    onFocus={() => warmPortalRoute(`/order/${order.id}`)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="font-medium text-slate-900">{recentUpdate || '-'}</div>
                    <div className="mt-2 text-xs text-slate-500">创建于 {order.createdAt}</div>
                  </div>

                  <div
                    className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                    onClick={() => navigate(`/order/${order.id}`)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/order/${order.id}`);
                      }
                    }}
                    onFocus={() => warmPortalRoute(`/order/${order.id}`)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>阶段进展</span>
                      <span>{getPendingSignal(order)}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-emerald-100">
                      <div
                        className="h-2 rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>第 {progress.current} / {progress.total} 阶段</span>
                      <span>按门户主要阶段统计</span>
                    </div>
                  </div>

                  <div
                    className="flex items-start justify-end"
                    onClick={event => event.stopPropagation()}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                      onClick={() => setDeleteTarget(order)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      删除
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-500">
            第 {currentPage} / {totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(value => Math.max(1, value - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(value => Math.min(totalPages, value + 1))}
              disabled={currentPage >= totalPages}
            >
              下一页
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

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
