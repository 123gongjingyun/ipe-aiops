import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge, Card, CardContent, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, getArchivedOrders, getAssetFieldSchema, getDeliveredAssets, onOrdersSync } from '@aiops/shared';
import type { AssetCategory, AssetFieldDefinition, DeliveredAsset } from '@aiops/shared';
import { BookOpen, Package, Layers, ChevronLeft, ChevronRight, FileDown, Search, FolderOpen, ChevronDown, ChevronUp, ExternalLink, Settings2 } from 'lucide-react';
import { PageHeader } from '../components/page-header';
import { ColumnSettingsDialog } from '../components/column-settings-dialog';
import { DeliveredAssetsTable, getHighlightFields } from '../components/delivered-assets-table';
import { downloadStyledExcel } from '../lib/export-table';

const ASSET_CATEGORIES: { key: 'all' | AssetCategory; label: string }[] = [
  { key: 'all', label: '全部资产' },
  { key: 'paas', label: 'PaaS' },
  { key: 'database', label: '数据库' },
  { key: 'middleware', label: '中间件' },
  { key: 'vm', label: '计算资源' },
  { key: 'network', label: '网络' },
  { key: 'monitor', label: '监控' },
  { key: 'security', label: '安全' },
  { key: 'backup', label: '备份' },
  { key: 'logging', label: '日志' },
];

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const FIELD_PREF_STORAGE_KEY = 'ipe_asset_field_preferences_v2';

function getAssetStatusLabel(status: DeliveredAsset['status']) {
  switch (status) {
    case 'pending_acceptance':
      return '待验收';
    case 'accepted':
      return '已验收';
    case 'archived':
      return '已归档';
    default:
      return status;
  }
}

type FieldPreference = {
  visible: boolean;
  exportable: boolean;
};

type CategoryFieldPreferences = Record<AssetCategory, Record<string, FieldPreference>>;

function csvEscape(value: string | number | undefined) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function buildAllAssetsCsv(assets: DeliveredAsset[]) {
  const headers = ['序号', '资产分类', '资产名称', '资产状态', '关键字段', '详情', '归属工单', '服务组合', '服务名称', '交付时间', '归档时间'];
  const rows = assets.map((asset, index) => [
    index + 1,
    asset.categoryLabel,
    asset.assetName,
    getAssetStatusLabel(asset.status),
    getHighlightFields(asset).join(' / '),
    asset.assetDetail || '',
    asset.orderId,
    asset.orderName,
    asset.serviceName,
    asset.deliveredAt,
    asset.archivedAt || '',
  ].map(csvEscape).join(','));

  return ['\ufeff' + headers.join(','), ...rows].join('\n');
}

export function buildCategoryAssetsCsv(
  assets: DeliveredAsset[],
  fields: AssetFieldDefinition[],
) {
  const headers = ['序号', '资产名称', '归属工单', '服务组合', '服务名称', ...fields.map(field => field.label), '详情'];
  const rows = assets.map((asset, index) => [
    index + 1,
    asset.assetName,
    asset.orderId,
    asset.orderName,
    asset.serviceName,
    ...fields.map(field => asset.assetMeta[field.key] || ''),
    asset.assetDetail || '',
  ].map(csvEscape).join(','));

  return ['\ufeff' + headers.join(','), ...rows].join('\n');
}

function buildDefaultFieldPreferences(): CategoryFieldPreferences {
  return {
    paas: Object.fromEntries(getAssetFieldSchema('paas').map(field => [field.key, { visible: field.defaultVisible ?? true, exportable: field.defaultExportable ?? true }])),
    database: Object.fromEntries(getAssetFieldSchema('database').map(field => [field.key, { visible: field.defaultVisible ?? true, exportable: field.defaultExportable ?? true }])),
    middleware: Object.fromEntries(getAssetFieldSchema('middleware').map(field => [field.key, { visible: field.defaultVisible ?? true, exportable: field.defaultExportable ?? true }])),
    vm: Object.fromEntries(getAssetFieldSchema('vm').map(field => [field.key, { visible: field.defaultVisible ?? true, exportable: field.defaultExportable ?? true }])),
    network: Object.fromEntries(getAssetFieldSchema('network').map(field => [field.key, { visible: field.defaultVisible ?? true, exportable: field.defaultExportable ?? true }])),
    monitor: Object.fromEntries(getAssetFieldSchema('monitor').map(field => [field.key, { visible: field.defaultVisible ?? true, exportable: field.defaultExportable ?? true }])),
    security: Object.fromEntries(getAssetFieldSchema('security').map(field => [field.key, { visible: field.defaultVisible ?? true, exportable: field.defaultExportable ?? true }])),
    backup: Object.fromEntries(getAssetFieldSchema('backup').map(field => [field.key, { visible: field.defaultVisible ?? true, exportable: field.defaultExportable ?? true }])),
    logging: Object.fromEntries(getAssetFieldSchema('logging').map(field => [field.key, { visible: field.defaultVisible ?? true, exportable: field.defaultExportable ?? true }])),
  };
}

function loadFieldPreferences(): CategoryFieldPreferences {
  const defaults = buildDefaultFieldPreferences();
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(FIELD_PREF_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<CategoryFieldPreferences>;
    const categories = Object.keys(defaults) as AssetCategory[];
    for (const category of categories) {
      const schema = getAssetFieldSchema(category);
      for (const field of schema) {
        const stored = parsed?.[category]?.[field.key];
        if (stored) {
          defaults[category][field.key] = {
            visible: typeof stored.visible === 'boolean' ? stored.visible : defaults[category][field.key].visible,
            exportable: typeof stored.exportable === 'boolean' ? stored.exportable : defaults[category][field.key].exportable,
          };
        }
      }
    }
  } catch {
    return defaults;
  }
  return defaults;
}

function exportAllAssetsToExcel(assets: DeliveredAsset[]) {
  downloadStyledExcel({
    title: '交付资产总表',
    filename: `交付资产_全部_${new Date().toLocaleDateString('zh-CN')}.xls`,
    note: '导出范围：全部已交付资产，覆盖待验收、已验收、已归档三种状态。当前视图展示的是按摘要字段压缩后的总表。',
    headers: ['序号', '资产分类', '资产名称', '资产状态', '关键字段', '详情', '归属工单', '服务组合', '服务名称', '交付时间', '归档时间'],
    rows: assets.map((asset, index) => [
      index + 1,
      asset.categoryLabel,
      asset.assetName,
      getAssetStatusLabel(asset.status),
      getHighlightFields(asset).join(' / '),
      asset.assetDetail || '',
      asset.orderId,
      asset.orderName,
      asset.serviceName,
      asset.deliveredAt,
      asset.archivedAt || '',
    ]),
  });
}

function exportCategoryAssetsToExcel(
  categoryLabel: string,
  assets: DeliveredAsset[],
  fields: AssetFieldDefinition[],
) {
  downloadStyledExcel({
    title: `${categoryLabel}交付资产明细`,
    filename: `交付资产_${categoryLabel}_${new Date().toLocaleDateString('zh-CN')}.xls`,
    note: '导出范围：当前分类资产。字段列根据导出字段设置生成。',
    headers: ['序号', '资产名称', '归属工单', '服务组合', '服务名称', ...fields.map(field => field.label), '详情'],
    rows: assets.map((asset, index) => [
      index + 1,
      asset.assetName,
      asset.orderId,
      asset.orderName,
      asset.serviceName,
      ...fields.map(field => asset.assetMeta[field.key] || ''),
      asset.assetDetail || '',
    ]),
  });
}

export function ServiceLedger() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeDimension, setActiveDimension] = useState<'orders' | 'assets'>('orders');
  const [assetCategory, setAssetCategory] = useState<'all' | AssetCategory>('all');
  const [assetSearch, setAssetSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [orderPageSize, setOrderPageSize] = useState(5);
  const [assetPage, setAssetPage] = useState(1);
  const [assetPageSize, setAssetPageSize] = useState(10);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [fieldPreferences, setFieldPreferences] = useState<CategoryFieldPreferences>(() => loadFieldPreferences());
  const [draftFieldPreferences, setDraftFieldPreferences] = useState<Record<string, FieldPreference>>({});
  const [fieldDialogMode, setFieldDialogMode] = useState<'visible' | 'exportable' | null>(null);
  const [orderJumpPage, setOrderJumpPage] = useState('');
  const [assetJumpPage, setAssetJumpPage] = useState('');
  const [assetPreviewOpen, setAssetPreviewOpen] = useState(false);
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onOrdersSync(() => setRefreshKey(key => key + 1));
    return unsubscribe;
  }, []);

  useEffect(() => {
    const view = searchParams.get('view');
    const category = searchParams.get('category') as AssetCategory | null;
    if (view === 'assets') {
      setActiveDimension('assets');
      if (category && (ASSET_CATEGORIES.some(item => item.key === category))) {
        setAssetCategory(category);
      } else {
        setAssetCategory('all');
      }
      setAssetPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(FIELD_PREF_STORAGE_KEY, JSON.stringify(fieldPreferences));
    }
  }, [fieldPreferences]);

  const allAssets = useMemo(() => getDeliveredAssets(), [refreshKey]);
  const assetOrders = useMemo(
    () => allAssets
      .map(asset => asset.orderId)
      .filter((orderId, index, list) => list.indexOf(orderId) === index)
      .map(orderId => {
        const orderAssets = allAssets.filter(asset => asset.orderId === orderId);
        const sampleAsset = orderAssets[0];
        return {
          orderId,
          orderAssets,
          sampleAsset,
        };
      }),
    [allAssets],
  );
  const activeCategorySchema = useMemo(
    () => assetCategory === 'all' ? [] : getAssetFieldSchema(assetCategory),
    [assetCategory],
  );
  const activeFieldPreferences = assetCategory === 'all' ? {} : fieldPreferences[assetCategory];
  const previewAsset = useMemo(
    () => allAssets.find(asset => asset.id === previewAssetId),
    [allAssets, previewAssetId],
  );
  const previewAssetFields = useMemo(
    () => (previewAsset ? getAssetFieldSchema(previewAsset.category) : []),
    [previewAsset],
  );

  const filteredOrders = useMemo(() => {
    let list = assetOrders;
    if (orderSearch.trim()) {
      const query = orderSearch.trim().toLowerCase();
      list = list.filter(order =>
        order.orderId.toLowerCase().includes(query) ||
        order.sampleAsset?.orderName.toLowerCase().includes(query) ||
        order.orderAssets.some(asset => asset.serviceName.toLowerCase().includes(query)),
      );
    }
    return list;
  }, [assetOrders, orderSearch]);

  const filteredAssets = useMemo(() => {
    let list = allAssets;
    if (assetCategory !== 'all') {
      list = list.filter(asset => asset.category === assetCategory);
    }
    if (assetSearch.trim()) {
        const query = assetSearch.trim().toLowerCase();
        list = list.filter(asset => {
        const baseFields = [asset.assetName, asset.serviceName, asset.orderName, asset.orderId, asset.assetDetail || ''];
        const categoryFields = assetCategory === 'all'
          ? Object.values(asset.assetMeta)
          : activeCategorySchema.map(field => asset.assetMeta[field.key] || '');
        return [...baseFields, ...categoryFields].some(value => value.toLowerCase().includes(query));
      });
    }
    return list;
  }, [activeCategorySchema, allAssets, assetCategory, assetSearch]);

  const visibleCategoryFields = useMemo(
    () => activeCategorySchema.filter(field => activeFieldPreferences[field.key]?.visible ?? (field.defaultVisible ?? true)),
    [activeCategorySchema, activeFieldPreferences],
  );
  const exportableCategoryFields = useMemo(
    () => activeCategorySchema.filter(field => activeFieldPreferences[field.key]?.exportable ?? (field.defaultExportable ?? true)),
    [activeCategorySchema, activeFieldPreferences],
  );

  const orderTotalPages = Math.max(1, Math.ceil(filteredOrders.length / orderPageSize));
  const orderCurrentPage = Math.min(orderPage, orderTotalPages);
  const pagedOrders = filteredOrders.slice((orderCurrentPage - 1) * orderPageSize, orderCurrentPage * orderPageSize);

  const assetTotalPages = Math.max(1, Math.ceil(filteredAssets.length / assetPageSize));
  const assetCurrentPage = Math.min(assetPage, assetTotalPages);
  const pagedAssets = filteredAssets.slice((assetCurrentPage - 1) * assetPageSize, assetCurrentPage * assetPageSize);

  const handleToggleVisible = (fieldKey: string) => {
    setDraftFieldPreferences(prev => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        visible: !prev[fieldKey].visible,
      },
    }));
  };

  const handleToggleExportable = (fieldKey: string) => {
    setDraftFieldPreferences(prev => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        exportable: !prev[fieldKey].exportable,
      },
    }));
  };

  const handleResetFieldPreferences = (mode: 'visible' | 'exportable') => {
    if (assetCategory === 'all') return;
    const defaults = buildDefaultFieldPreferences();
    setDraftFieldPreferences(prev => Object.fromEntries(
      Object.entries(prev).map(([fieldKey, pref]) => [
        fieldKey,
        {
          ...pref,
          [mode]: defaults[assetCategory][fieldKey][mode],
        },
      ]),
    ));
  };

  const handleSelectAllFieldPreferences = (mode: 'visible' | 'exportable') => {
    setDraftFieldPreferences(prev => Object.fromEntries(
      Object.entries(prev).map(([fieldKey, pref]) => [fieldKey, { ...pref, [mode]: true }]),
    ));
  };

  const handleClearFieldPreferences = (mode: 'visible' | 'exportable') => {
    setDraftFieldPreferences(prev => Object.fromEntries(
      Object.entries(prev).map(([fieldKey, pref]) => [fieldKey, { ...pref, [mode]: false }]),
    ));
  };

  const openFieldDialog = (mode: 'visible' | 'exportable') => {
    if (assetCategory === 'all') return;
    setDraftFieldPreferences(fieldPreferences[assetCategory]);
    setFieldDialogMode(mode);
  };

  const closeFieldDialog = (open: boolean) => {
    if (!open) setFieldDialogMode(null);
  };

  const commitFieldPreferences = (afterCommit?: () => void) => {
    if (assetCategory === 'all') return;
    setFieldPreferences(prev => ({
      ...prev,
      [assetCategory]: draftFieldPreferences,
    }));
    setFieldDialogMode(null);
    afterCommit?.();
  };

  const handleExportAssets = () => {
    if (assetCategory === 'all') {
      exportAllAssetsToExcel(filteredAssets);
      return;
    }
    exportCategoryAssetsToExcel(
      ASSET_CATEGORIES.find(category => category.key === assetCategory)?.label || assetCategory,
      filteredAssets,
      activeCategorySchema.filter(field => draftFieldPreferences[field.key]?.exportable),
    );
  };

  const openAssetPreview = (assetId: string) => {
    setPreviewAssetId(assetId);
    setAssetPreviewOpen(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <PageHeader
          icon={<BookOpen className="h-5 w-5" />}
          title="交付资产"
          description="展示已交付资产池，覆盖待验收、已验收、已归档三种状态。归档后资产正式固化入库。"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveDimension('orders')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-md transition-colors ${activeDimension === 'orders' ? 'bg-primary text-white' : 'bg-muted text-foreground hover:bg-muted/80'}`}
        >
          <Package className="w-4 h-4" /> 已交付工单
        </button>
        <button
          onClick={() => {
            setActiveDimension('assets');
            setAssetCategory('all');
            setAssetSearch('');
            setAssetPage(1);
          }}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-md transition-colors ${activeDimension === 'assets' ? 'bg-primary text-white' : 'bg-muted text-foreground hover:bg-muted/80'}`}
        >
          <Layers className="w-4 h-4" /> 按属性归类
        </button>
      </div>

      {activeDimension === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative w-80">
              <Search className="w-4 h-4 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索工单编号、服务组合..."
                value={orderSearch}
                onChange={event => { setOrderSearch(event.target.value); setOrderPage(1); }}
                className="w-full h-9 pl-8 pr-3 text-sm rounded-md border border-border bg-white"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>共 {filteredOrders.length} 条</span>
              <select
                value={orderPageSize}
                onChange={event => { setOrderPageSize(Number(event.target.value)); setOrderPage(1); }}
                className="h-8 px-2 text-sm rounded-md border border-border bg-white"
              >
                {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
              </select>
            </div>
          </div>

          {pagedOrders.map((order, index) => {
            const seq = (orderCurrentPage - 1) * orderPageSize + index + 1;
            const isExpanded = expandedOrder === order.orderId;
            const orderAssets = order.orderAssets;
            const sampleAsset = order.sampleAsset;
            return (
              <Card key={order.orderId} className={isExpanded ? 'ring-1 ring-primary/20' : ''}>
                <CardContent className="p-0">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => setExpandedOrder(isExpanded ? null : order.orderId)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground font-mono w-6">{seq}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-primary" />
                          <button
                            onClick={event => { event.stopPropagation(); navigate(`/order/${order.orderId}`); }}
                            className="text-primary hover:underline font-mono text-sm"
                          >
                            {order.orderId}
                          </button>
                          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700">
                            {sampleAsset ? getAssetStatusLabel(sampleAsset.status) : '待验收'}
                          </span>
                        </div>
                        <div className="text-sm font-medium mt-1">{sampleAsset?.orderName || order.orderId}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {orderAssets.map(asset => asset.serviceName).join(' / ')}
                          {' · '}
                          交付于 {sampleAsset?.deliveredAt || '-'}
                          {sampleAsset?.archivedAt ? ` · 归档于 ${sampleAsset.archivedAt}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{orderAssets.length} 项资产</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <DeliveredAssetsTable assets={orderAssets} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {pagedOrders.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">暂无已交付工单</CardContent></Card>
          )}

          {orderTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">第 {orderCurrentPage} / {orderTotalPages} 页</span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setOrderPage(page => Math.max(1, page - 1))} disabled={orderCurrentPage <= 1} className="p-1.5 rounded-md border border-border disabled:opacity-30 hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
                <input
                  value={orderJumpPage}
                  onChange={event => setOrderJumpPage(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      const next = Number(orderJumpPage);
                      if (Number.isFinite(next)) setOrderPage(Math.max(1, Math.min(orderTotalPages, next)));
                      setOrderJumpPage('');
                    }
                  }}
                  placeholder="页码"
                  className="h-8 w-16 rounded-md border border-border bg-white px-2 text-center text-sm"
                />
                <button
                  onClick={() => {
                    const next = Number(orderJumpPage);
                    if (Number.isFinite(next)) setOrderPage(Math.max(1, Math.min(orderTotalPages, next)));
                    setOrderJumpPage('');
                  }}
                  className="h-8 px-3 text-sm rounded-md border border-border hover:bg-muted"
                >
                  跳转
                </button>
                <button onClick={() => setOrderPage(page => Math.min(orderTotalPages, page + 1))} disabled={orderCurrentPage >= orderTotalPages} className="p-1.5 rounded-md border border-border disabled:opacity-30 hover:bg-muted"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeDimension === 'assets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {ASSET_CATEGORIES.map(category => (
                <button
                  key={category.key}
                  onClick={() => {
                    setAssetCategory(category.key);
                    setAssetPage(1);
                  }}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${assetCategory === category.key ? 'bg-primary text-white' : 'bg-muted text-foreground hover:bg-muted/80'}`}
                >
                  {category.label}
                  {category.key !== 'all' && (
                    <span className="ml-1 opacity-70">({allAssets.filter(asset => asset.category === category.key).length})</span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-56">
                <Search className="w-4 h-4 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={assetCategory === 'all' ? '搜索资产...' : '搜索当前分类字段...'}
                  value={assetSearch}
                  onChange={event => { setAssetSearch(event.target.value); setAssetPage(1); }}
                  className="w-full h-8 pl-8 pr-3 text-sm rounded-md border border-border bg-white"
                />
              </div>
              <button
                onClick={() => openFieldDialog('visible')}
                disabled={assetCategory === 'all'}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Settings2 className="w-4 h-4" /> 字段设置
              </button>
              <button
                onClick={() => assetCategory === 'all' ? handleExportAssets() : openFieldDialog('exportable')}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-muted text-foreground hover:bg-muted/80"
              >
                <FileDown className="w-4 h-4" /> 导出
              </button>
              <select
                value={assetPageSize}
                onChange={event => { setAssetPageSize(Number(event.target.value)); setAssetPage(1); }}
                className="h-8 px-2 text-sm rounded-md border border-border bg-white"
              >
                {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
              </select>
            </div>
          </div>

          {assetCategory !== 'all' && (
            <div className="text-xs text-muted-foreground">
              当前分类：{ASSET_CATEGORIES.find(category => category.key === assetCategory)?.label}。字段设置同时影响列表展示和导出字段勾选。
            </div>
          )}

          {assetCategory === 'all' && (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
              {ASSET_CATEGORIES.filter(category => category.key !== 'all').map(category => {
                const count = allAssets.filter(asset => asset.category === category.key).length;
                return (
                  <Card key={category.key} className="cursor-pointer border-slate-200 shadow-none transition-all hover:border-primary/30 hover:bg-primary/5" onClick={() => setAssetCategory(category.key)}>
                    <CardContent className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-800">{category.label}</div>
                        <div className="text-[11px] text-slate-500">点击查看分类资产</div>
                      </div>
                      <div className="rounded-md bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-700">
                        {count}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">序号</th>
                      {assetCategory === 'all' ? (
                        <>
                          <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">资产分类</th>
                          <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">资产名称</th>
                          <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">资产状态</th>
                          <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">关键字段</th>
                          <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">详情</th>
                          <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">归属工单</th>
                          <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">服务</th>
                          <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">重建预览</th>
                        </>
                      ) : (
                        <>
                          <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">资产名称</th>
                          <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">资产状态</th>
                          {visibleCategoryFields.map(field => (
                            <th key={field.key} className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{field.label}</th>
                          ))}
                          <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">详情</th>
                          <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">归属工单</th>
                          <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">服务</th>
                          <th className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">重建预览</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pagedAssets.map((asset, index) => {
                      const seq = (assetCurrentPage - 1) * assetPageSize + index + 1;
                      return (
                        <tr key={asset.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-3 text-muted-foreground font-mono text-xs">{seq}</td>
                          {assetCategory === 'all' ? (
                            <>
                              <td className="px-3 py-3">
                                <span className="px-2 py-0.5 text-xs rounded bg-primary/10 text-primary">{asset.categoryLabel}</span>
                              </td>
                              <td className="px-3 py-3 text-sm font-medium whitespace-nowrap">{asset.assetName}</td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700">
                                  {getAssetStatusLabel(asset.status)}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-xs text-muted-foreground min-w-[220px]">{getHighlightFields(asset).join(' · ') || '-'}</td>
                              <td className="px-3 py-3 text-xs text-muted-foreground min-w-[260px]">
                                <div className="line-clamp-2" title={asset.assetDetail || '-'}>
                                  {asset.assetDetail || '-'}
                                </div>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                <button
                                  onClick={() => navigate(`/order/${asset.orderId}`)}
                                  className="flex items-center gap-1 text-primary hover:underline font-mono text-xs"
                                >
                                  {asset.orderId}
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                                <div className="text-xs text-muted-foreground truncate max-w-[140px]" title={asset.orderName}>{asset.orderName}</div>
                              </td>
                              <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{asset.serviceName}</td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                {asset.schemaDrift?.hasDrift ? (
                                  <button
                                    type="button"
                                    onClick={() => openAssetPreview(asset.id)}
                                    className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800 hover:bg-amber-100"
                                  >
                                    查看预览
                                  </button>
                                ) : (
                                  <span className="text-xs text-muted-foreground">当前一致</span>
                                )}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-3 text-sm font-medium whitespace-nowrap">{asset.assetName}</td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700">
                                  {getAssetStatusLabel(asset.status)}
                                </span>
                              </td>
                              {visibleCategoryFields.map(field => (
                                <td key={field.key} className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                  {asset.assetMeta[field.key] || '-'}
                                </td>
                              ))}
                              <td className="px-3 py-3 text-xs text-muted-foreground min-w-[260px]">
                                <div className="line-clamp-2" title={asset.assetDetail || '-'}>
                                  {asset.assetDetail || '-'}
                                </div>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                <button
                                  onClick={() => navigate(`/order/${asset.orderId}`)}
                                  className="flex items-center gap-1 text-primary hover:underline font-mono text-xs"
                                >
                                  {asset.orderId}
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                                <div className="text-xs text-muted-foreground truncate max-w-[140px]" title={asset.orderName}>{asset.orderName}</div>
                              </td>
                              <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{asset.serviceName}</td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                {asset.schemaDrift?.hasDrift ? (
                                  <button
                                    type="button"
                                    onClick={() => openAssetPreview(asset.id)}
                                    className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800 hover:bg-amber-100"
                                  >
                                    查看预览
                                  </button>
                                ) : (
                                  <span className="text-xs text-muted-foreground">当前一致</span>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                    {pagedAssets.length === 0 && (
                      <tr>
                        <td colSpan={assetCategory === 'all' ? 9 : visibleCategoryFields.length + 7} className="px-4 py-8 text-center text-muted-foreground">
                          <div>暂无资产数据</div>
                          {assetCategory !== 'all' && <div className="text-xs mt-1">当前筛选：{ASSET_CATEGORIES.find(category => category.key === assetCategory)?.label}</div>}
                          {assetSearch.trim() && <div className="text-xs mt-1">搜索关键词：{assetSearch}</div>}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {assetTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">第 {assetCurrentPage} / {assetTotalPages} 页，共 {filteredAssets.length} 条</span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setAssetPage(page => Math.max(1, page - 1))} disabled={assetCurrentPage <= 1} className="p-1.5 rounded-md border border-border disabled:opacity-30 hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
                <input
                  value={assetJumpPage}
                  onChange={event => setAssetJumpPage(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      const next = Number(assetJumpPage);
                      if (Number.isFinite(next)) setAssetPage(Math.max(1, Math.min(assetTotalPages, next)));
                      setAssetJumpPage('');
                    }
                  }}
                  placeholder="页码"
                  className="h-8 w-16 rounded-md border border-border bg-white px-2 text-center text-sm"
                />
                <button
                  onClick={() => {
                    const next = Number(assetJumpPage);
                    if (Number.isFinite(next)) setAssetPage(Math.max(1, Math.min(assetTotalPages, next)));
                    setAssetJumpPage('');
                  }}
                  className="h-8 px-3 text-sm rounded-md border border-border hover:bg-muted"
                >
                  跳转
                </button>
                <button onClick={() => setAssetPage(page => Math.min(assetTotalPages, page + 1))} disabled={assetCurrentPage >= assetTotalPages} className="p-1.5 rounded-md border border-border disabled:opacity-30 hover:bg-muted"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {assetCategory !== 'all' && fieldDialogMode && (
        <ColumnSettingsDialog
          open
          title={`${ASSET_CATEGORIES.find(category => category.key === assetCategory)?.label || assetCategory}${fieldDialogMode === 'visible' ? ' 字段设置' : ' 导出字段'}`}
          description={fieldDialogMode === 'visible' ? '选择当前表格展示字段。未确认前不会影响页面展示。' : '选择导出表格字段。确认后按所选字段导出 Excel 表格。'}
          items={activeCategorySchema.map(field => ({ key: field.key, label: field.label, meta: field.key }))}
          selectedMap={Object.fromEntries(activeCategorySchema.map(field => [field.key, draftFieldPreferences[field.key]?.[fieldDialogMode] ?? false]))}
          onOpenChange={closeFieldDialog}
          onToggle={key => (fieldDialogMode === 'visible' ? handleToggleVisible(key) : handleToggleExportable(key))}
          onReset={() => handleResetFieldPreferences(fieldDialogMode)}
          onSelectAll={() => handleSelectAllFieldPreferences(fieldDialogMode)}
          onClear={() => handleClearFieldPreferences(fieldDialogMode)}
          onConfirm={() => {
            if (fieldDialogMode === 'visible') {
              commitFieldPreferences();
              return;
            }
            commitFieldPreferences(() => handleExportAssets());
          }}
        />
      )}

      <Dialog open={assetPreviewOpen} onOpenChange={setAssetPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>资产重建预览</DialogTitle>
            <DialogDescription>
              这里只按当前字段口径做预览，不会修改历史归档资产。
            </DialogDescription>
          </DialogHeader>
          {!previewAsset ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              当前没有可预览的漂移资产。
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-sm font-medium text-foreground">冻结版本</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">工单</span>
                      <span className="font-mono text-foreground">{previewAsset.orderId}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">服务</span>
                      <span className="text-foreground">{previewAsset.serviceName}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">表单版本</span>
                      <span className="font-mono text-foreground">{previewAsset.formSchemaVersion || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">输出模板版本</span>
                      <span className="font-mono text-foreground">{previewAsset.sourceTemplateVersionId || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">资产字段版本</span>
                      <span className="font-mono text-foreground">{previewAsset.assetSchemaVersion}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <div className="text-sm font-medium text-emerald-950">当前口径预览</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">当前模板版本</span>
                      <span className="font-mono text-foreground">{previewAsset.schemaDrift?.currentTemplateVersionId || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">资产分类</span>
                      <span className="text-foreground">{previewAsset.categoryLabel}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">漂移原因</span>
                      <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50">{previewAsset.schemaDrift?.reason || '-'}</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">当前字段数</span>
                      <span className="text-foreground">{previewAssetFields.length}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">缺失字段</span>
                      <span className="text-foreground">
                        {previewAssetFields.filter(field => !(previewAsset.assetMeta[field.key] || '').trim()).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border overflow-x-auto">
                <Table className="w-max min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">序号</TableHead>
                      <TableHead className="whitespace-nowrap">当前字段</TableHead>
                      <TableHead className="whitespace-nowrap">来源映射</TableHead>
                      <TableHead className="whitespace-nowrap">当前预览值</TableHead>
                      <TableHead className="whitespace-nowrap">状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewAssetFields.map((field, index) => {
                      const value = previewAsset.assetMeta[field.key] || '';
                      const missing = !value.trim();
                      return (
                        <TableRow key={field.key}>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground font-mono">{index + 1}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm font-medium">{field.label}</TableCell>
                          <TableCell className="min-w-[180px] text-xs text-muted-foreground font-mono">
                            {field.sourceFieldKeys?.join(', ') || '-'}
                          </TableCell>
                          <TableCell className="min-w-[220px] text-sm">
                            {value || <span className="text-muted-foreground">待补齐</span>}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge className={missing ? 'bg-amber-50 text-amber-700 hover:bg-amber-50' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50'}>
                              {missing ? '缺失' : '可承接'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {previewAssetFields.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">当前分类还没有可用字段 schema</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
