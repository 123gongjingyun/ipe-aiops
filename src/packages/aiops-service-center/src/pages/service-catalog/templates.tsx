import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, BookTemplate, CircleHelp, CopyPlus, Eye, Pencil, Plus, Save, Trash2, Upload } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  createDraftFromTemplateVersion,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  FieldDictionaryEntry,
  getResolvedTemplateFields,
  publishSchemaTemplateVersion,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  updateSchemaTemplateVersion,
  useFieldDictionary,
  useAtomicSpecs,
  useConfigProfileGroups,
  useSchemaTemplateVersions,
  useSchemaTemplateConfigProfileBinding,
  useComboSpecs,
  useSchemaTemplates,
  useSchemaTemplateVersion,
  saveSchemaTemplateConfigProfileBinding,
  addFieldDictionaryEntry,
} from '@aiops/shared';
import type {
  EnvironmentRecommendedFieldKey,
  FieldSchema,
  FormLayoutCondition,
  FormLayoutConfig,
  SchemaTemplate,
  SchemaTemplateFieldBinding,
  ServiceConfigProfile,
  TemplateEnvironmentConfig,
} from '@aiops/shared';
import { PageHeader } from '../../components/page-header';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

type TemplateFieldEditorForm = {
  key: string;
  label: string;
  type: FieldDictionaryEntry['type'];
  required: boolean;
  category: string;
  description: string;
  placeholder: string;
  defaultValue: string;
  optionsText: string;
};

type TemplateFieldDialogState = {
  open: boolean;
  title: string;
  description: string;
  candidates?: Array<{ label: string; key: string; category: string }>;
  confirmLabel?: string;
  onConfirm?: () => void;
};

type LayoutDraftItem = {
  fieldKey: string;
  sectionId: string;
  order: number;
  widthMode: 'third' | 'half' | 'full';
  visibleWhen?: FormLayoutCondition;
};

type LayoutDraftSection = {
  id: string;
  title: string;
  description: string;
  order: number;
  collapsible: boolean;
  defaultCollapsed: boolean;
};

type EnvironmentRecommendedFieldDefinition = {
  sourceKey: EnvironmentRecommendedFieldKey;
  fieldKey: string;
  label: string;
  placeholder: string;
};

type PreviewFieldState = {
  initialized: boolean;
  overridden: boolean;
};

const ENVIRONMENT_RECOMMENDED_FIELDS: EnvironmentRecommendedFieldDefinition[] = [
  { sourceKey: 'nodes', fieldKey: 'env_nodes', label: '节点', placeholder: '根据环境推荐节点数' },
  { sourceKey: 'cpu', fieldKey: 'env_cpu', label: 'CPU', placeholder: '根据环境推荐 CPU 配置' },
  { sourceKey: 'memory', fieldKey: 'env_memory', label: '内存', placeholder: '根据环境推荐内存配置' },
  { sourceKey: 'disk', fieldKey: 'env_disk', label: '磁盘', placeholder: '根据环境推荐磁盘配置' },
  { sourceKey: 'securityLevel', fieldKey: 'env_security_level', label: '安全等级', placeholder: '根据环境推荐安全等级' },
];

const DEFAULT_ENVIRONMENT_HINT = '默认会根据环境推荐配置，可按需调整';
const EMPTY_TEMPLATE_FIELD_FORM: TemplateFieldEditorForm = {
  key: '',
  label: '',
  type: 'text',
  required: false,
  category: '基础信息',
  description: '',
  placeholder: '',
  defaultValue: '',
  optionsText: '',
};

const EMPTY_TEMPLATE_FIELD_DIALOG_STATE: TemplateFieldDialogState = {
  open: false,
  title: '',
  description: '',
};

function normalizeFieldText(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function collectSimilarDictionaryEntries(
  entries: FieldDictionaryEntry[],
  nextKey: string,
  nextLabel: string,
) {
  const normalizedKey = normalizeFieldText(nextKey);
  const normalizedLabel = normalizeFieldText(nextLabel);
  if (!normalizedKey && !normalizedLabel) return [];

  return entries.filter(entry => {
    const entryKey = normalizeFieldText(entry.key);
    const entryLabel = normalizeFieldText(entry.label);
    const keyClose = normalizedKey
      ? entryKey === normalizedKey || entryKey.includes(normalizedKey) || normalizedKey.includes(entryKey)
      : false;
    const labelClose = normalizedLabel
      ? entryLabel === normalizedLabel || entryLabel.includes(normalizedLabel) || normalizedLabel.includes(entryLabel)
      : false;
    const crossClose = (normalizedKey && entryLabel.includes(normalizedKey))
      || (normalizedLabel && entryKey.includes(normalizedLabel));
    return keyClose || labelClose || crossClose;
  });
}

function getDefaultWidthMode(fieldType?: SchemaTemplateFieldBinding['fieldSnapshot']['type']): LayoutDraftItem['widthMode'] {
  return fieldType === 'textarea' ? 'full' : 'third';
}

function getPreviewRowClassName(columnCount: number) {
  if (columnCount >= 3) return 'grid gap-3 grid-cols-1 md:grid-cols-3';
  if (columnCount === 2) return 'grid gap-3 grid-cols-1 md:grid-cols-2';
  return 'grid gap-3 grid-cols-1';
}

function getPreviewFieldSpanClassName(columnCount: number, span: number) {
  if (columnCount === 1 && span >= 2) return 'md:col-span-3';
  return '';
}

function buildLayoutDraftSections(layout?: FormLayoutConfig): LayoutDraftSection[] {
  if (!layout?.sections?.length) {
    return [{
      id: 'section-default',
      title: '默认分组',
      description: '',
      order: 0,
      collapsible: false,
      defaultCollapsed: false,
    }];
  }

  return layout.sections.map((section, index) => ({
    id: section.id,
    title: section.title,
    description: section.description ?? '',
    order: index,
    collapsible: section.collapsible ?? false,
    defaultCollapsed: section.defaultCollapsed ?? false,
  }));
}

function buildLayoutDraftItems(bindings: SchemaTemplateFieldBinding[], layout?: FormLayoutConfig): LayoutDraftItem[] {
  const fieldOrder = bindings.map(binding => binding.fieldKey);
  const layoutMap = new Map<string, LayoutDraftItem>();
  let orderCursor = 0;

  layout?.sections.forEach(section => {
    section.rows.forEach(row => {
      const rowWidthMode: LayoutDraftItem['widthMode'] = row.columns.length >= 3
        ? 'third'
        : row.columns.length === 2
          ? 'half'
          : row.columns[0]?.span >= 2
            ? 'full'
            : 'half';
      row.columns.forEach(column => {
        layoutMap.set(column.fieldKey, {
          fieldKey: column.fieldKey,
          sectionId: section.id,
          order: orderCursor,
          widthMode: rowWidthMode,
          visibleWhen: column.visibleWhen,
        });
        orderCursor += 1;
      });
    });
  });

  return fieldOrder.map((fieldKey, index) => layoutMap.get(fieldKey) ?? {
    fieldKey,
    sectionId: 'section-default',
    order: index,
    widthMode: getDefaultWidthMode(bindings[index]?.fieldSnapshot.type),
  });
}

function buildLayoutConfig(items: LayoutDraftItem[], sections: LayoutDraftSection[]) {
  const resolvedSections = sections
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(section => {
      const sectionItems = items
        .filter(item => item.sectionId === section.id)
        .slice()
        .sort((a, b) => a.order - b.order);

      const rows: FormLayoutConfig['sections'][number]['rows'] = [];
      let cursor = 0;

      while (cursor < sectionItems.length) {
        const current = sectionItems[cursor];
        const widthMode = current.widthMode;
        const groupSize = widthMode === 'third' ? 3 : widthMode === 'half' ? 2 : 1;
        const bucket: LayoutDraftItem[] = [current];
        let lookahead = cursor + 1;

        while (lookahead < sectionItems.length && bucket.length < groupSize) {
          const candidate = sectionItems[lookahead];
          if (candidate.widthMode !== widthMode) break;
          bucket.push(candidate);
          lookahead += 1;
        }

        rows.push({
          id: `${section.id}-row-${rows.length + 1}`,
          columns: bucket.map(item => ({
            fieldKey: item.fieldKey,
            span: widthMode === 'full' ? 2 : 1,
            visibleWhen: item.visibleWhen,
          })),
        });

        cursor += bucket.length;
      }

      return {
        id: section.id,
        title: section.title,
        description: section.description || undefined,
        collapsible: section.collapsible,
        defaultCollapsed: section.collapsible ? section.defaultCollapsed : false,
        rows,
      };
    })
    .filter(section => section.rows.length > 0);

  return {
    sections: resolvedSections.length > 0 ? resolvedSections : [{
      id: 'section-default',
      title: '默认分组',
      description: undefined,
      collapsible: false,
      defaultCollapsed: false,
      rows: [],
    }],
  } satisfies FormLayoutConfig;
}

function buildPreviewField(binding: SchemaTemplateFieldBinding) {
  return {
    ...binding.fieldSnapshot,
    label: binding.aliasLabel || binding.fieldSnapshot.label,
    required: binding.required ?? binding.fieldSnapshot.required,
  };
}

function getWidthModeLabel(widthMode: LayoutDraftItem['widthMode']) {
  if (widthMode === 'third') return '三个/行';
  if (widthMode === 'full') return '整行';
  return '两个/行';
}

function getRecommendedFieldDefinition(sourceKey: EnvironmentRecommendedFieldKey) {
  return ENVIRONMENT_RECOMMENDED_FIELDS.find(field => field.sourceKey === sourceKey);
}

function isRecommendedEnvironmentField(fieldKey: string) {
  return ENVIRONMENT_RECOMMENDED_FIELDS.some(field => field.fieldKey === fieldKey);
}

function createEnvironmentFieldBinding(definition: EnvironmentRecommendedFieldDefinition, order: number): SchemaTemplateFieldBinding {
  return {
    id: `binding:${definition.fieldKey}:system`,
    fieldKey: definition.fieldKey,
    source: 'custom',
    order,
    required: false,
    helpText: '根据所选环境推荐，可继续手动调整。',
    fieldSnapshot: {
      key: definition.fieldKey,
      label: definition.label,
      type: 'text',
      required: false,
      placeholder: definition.placeholder,
      defaultValue: '',
    },
  };
}

function createDefaultEnvironmentConfig(
  binding: ReturnType<typeof useSchemaTemplateConfigProfileBinding> | undefined,
  fallbackEnvironmentFieldKey?: string,
): TemplateEnvironmentConfig {
  const fields = ENVIRONMENT_RECOMMENDED_FIELDS.map(definition => {
    const current = binding?.environmentConfig?.fields.find(field => field.key === definition.sourceKey);
    return current ?? {
      key: definition.sourceKey,
      enabled: false,
      allowOverride: true,
    };
  });
  return {
    profileGroupKey: binding?.environmentConfig?.profileGroupKey ?? binding?.groupKeys?.[0] ?? '',
    environmentFieldKey: binding?.environmentConfig?.environmentFieldKey ?? fallbackEnvironmentFieldKey ?? '',
    preserveOverrides: binding?.environmentConfig?.preserveOverrides ?? true,
    hintText: binding?.environmentConfig?.hintText ?? DEFAULT_ENVIRONMENT_HINT,
    fields,
  };
}

function normalizeEnvironmentProfileValue(value?: string) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'dev') return 'DEV';
  if (normalized === 'test' || normalized === 'uat') return 'UAT';
  if (normalized === 'prod' || normalized === 'production') return 'PROD';
  if (normalized === 'perf') return 'PERF';
  if (normalized === 'dr') return 'DR';
  return normalized.toUpperCase();
}

function getEnvironmentProfileValue(profile: ServiceConfigProfile, sourceKey: EnvironmentRecommendedFieldKey) {
  if (sourceKey === 'securityLevel') {
    return profile.details?.['安全等级'] ?? '';
  }
  return String(profile[sourceKey] ?? '');
}

function matchesPreviewVisibleWhen(condition: FormLayoutCondition | undefined, values: Record<string, string>) {
  if (!condition) return true;
  const current = values[condition.fieldKey] ?? '';
  const expected = String(condition.value ?? '');
  if (condition.operator === 'neq') return current !== expected;
  return current === expected;
}

function PreviewSection({
  section,
  previewBindings,
  previewValues,
  hiddenFieldKeys,
}: {
  section: FormLayoutConfig['sections'][number];
  previewBindings: SchemaTemplateFieldBinding[];
  previewValues: Record<string, string>;
  hiddenFieldKeys?: Set<string>;
}) {
  const [collapsed, setCollapsed] = useState(section.collapsible ? section.defaultCollapsed ?? false : false);

  useEffect(() => {
    setCollapsed(section.collapsible ? section.defaultCollapsed ?? false : false);
  }, [section.id, section.collapsible, section.defaultCollapsed]);

  const visibleRows = section.rows
    .map(row => ({
      ...row,
      columns: row.columns.filter(column => (
        !hiddenFieldKeys?.has(column.fieldKey) &&
        matchesPreviewVisibleWhen(column.visibleWhen, previewValues)
      )),
    }))
    .filter(row => row.columns.length > 0);

  if (visibleRows.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">{section.title}</div>
          {section.description && <div className="mt-1 text-xs text-muted-foreground">{section.description}</div>}
        </div>
        {section.collapsible && (
          <Button size="sm" variant="outline" className="h-8" onClick={() => setCollapsed(value => !value)}>
            {collapsed ? '展开分组' : '收起分组'}
          </Button>
        )}
      </div>
      {!collapsed && (
        <div className="space-y-3">
          {visibleRows.map(row => (
            <div
              key={`preview-${row.id}`}
              className={getPreviewRowClassName(row.columns.length)}
            >
              {row.columns.map(column => {
                const binding = previewBindings.find(item => item.fieldKey === column.fieldKey);
                if (!binding) return null;
                const field = buildPreviewField(binding);
                return (
                  <div
                    key={`preview-field-${field.key}`}
                    className={`rounded-lg border border-slate-200 bg-white p-3 ${getPreviewFieldSpanClassName(row.columns.length, column.span)}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-foreground">
                        {field.label}
                        {field.required ? ' *' : ''}
                      </div>
                      {column.visibleWhen && (
                        <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50">
                          {column.visibleWhen.fieldKey} {column.visibleWhen.operator === 'eq' ? '=' : '≠'} {String(column.visibleWhen.value)}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                      {field.type === 'textarea'
                        ? field.placeholder || '多行输入框预览'
                        : field.type === 'select'
                          ? `下拉选项：${field.options?.map(option => option.label).join(' / ') || '无'}`
                          : field.type === 'boolean'
                            ? '开关项预览'
                            : field.placeholder || '单行输入框预览'}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SchemaTemplatesPage() {
  const templates = useSchemaTemplates();
  const atomicSpecs = useAtomicSpecs();
  const comboSpecs = useComboSpecs();
  const [keyword, setKeyword] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | 'input' | 'output'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedTemplate, setSelectedTemplate] = useState<SchemaTemplate | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view');

  const usageMap = useMemo(() => {
    const registry = new Map<string, number>();
    [...atomicSpecs, ...comboSpecs].forEach(spec => {
      [spec.inputTemplateId, spec.outputTemplateId].filter(Boolean).forEach(templateId => {
        registry.set(templateId!, (registry.get(templateId!) || 0) + 1);
      });
    });
    return registry;
  }, [atomicSpecs, comboSpecs]);

  const filteredTemplates = useMemo(() => {
    const lower = keyword.trim().toLowerCase();
    return templates.filter(template => {
      const keywordMatch = !lower || `${template.name} ${template.code} ${template.serviceName ?? ''}`.toLowerCase().includes(lower);
      const kindMatch = kindFilter === 'all' || template.kind === kindFilter;
      return keywordMatch && kindMatch;
    });
  }, [templates, keyword, kindFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedTemplates = filteredTemplates.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const stats = useMemo(() => {
    const inputCount = templates.filter(template => template.kind === 'input').length;
    const outputCount = templates.filter(template => template.kind === 'output').length;
    const activeCount = templates.filter(template => template.status === 'active').length;
    return { inputCount, outputCount, activeCount };
  }, [templates]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BookTemplate className="h-5 w-5" />}
        title="表单模板"
        description="第一阶段先冻结存量结构：每个原子服务当前的输入/输出都已沉淀为专属表单模板首版，服务后续只绑定模板正式版。"
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="模板总数" value={templates.length} hint="输入 + 输出模板" />
        <StatCard title="输入模板" value={stats.inputCount} hint="申请侧字段模板" />
        <StatCard title="输出模板" value={stats.outputCount} hint="交付结果字段模板" />
        <StatCard title="正式模板" value={stats.activeCount} hint="当前正式可绑定版本" />
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={keyword}
              onChange={event => { setKeyword(event.target.value); setPage(1); }}
              placeholder="搜索模板名称 / 编码 / 来源服务"
              className="h-9 min-w-[240px] flex-1 rounded-md border border-border bg-white px-3 text-sm"
            />
            <select
              value={kindFilter}
              onChange={event => { setKindFilter(event.target.value as typeof kindFilter); setPage(1); }}
              className="h-9 rounded-md border border-border bg-white px-3 text-sm"
            >
              <option value="all">全部类型</option>
              <option value="input">输入模板</option>
              <option value="output">输出模板</option>
            </select>
            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <span>共 {filteredTemplates.length} 条</span>
              <select
                value={pageSize}
                onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}
                className="h-9 rounded-md border border-border bg-white px-2 text-sm"
              >
                {PAGE_SIZE_OPTIONS.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">序号</TableHead>
                  <TableHead>模板名称</TableHead>
                  <TableHead className="w-24">类型</TableHead>
                  <TableHead className="w-40">来源服务</TableHead>
                  <TableHead className="w-28">当前版本</TableHead>
                  <TableHead className="w-20">字段数</TableHead>
                  <TableHead className="w-20">引用数</TableHead>
                  <TableHead className="w-20">状态</TableHead>
                  <TableHead className="w-24 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedTemplates.map((template, index) => (
                  <TemplateRow
                    key={template.id}
                    template={template}
                    serial={(currentPage - 1) * pageSize + index + 1}
                    usageCount={usageMap.get(template.id) || 0}
                    onView={() => {
                      setDialogMode('view');
                      setSelectedTemplate(template);
                    }}
                    onEdit={() => {
                      setDialogMode('edit');
                      setSelectedTemplate(template);
                    }}
                  />
                ))}
                {pagedTemplates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      当前筛选条件下暂无模板
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">第 {currentPage} / {totalPages} 页</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>
                  上一页
                </Button>
                <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))}>
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTemplate && (
        <TemplateDetailDialog
          template={selectedTemplate}
          mode={dialogMode}
          open={Boolean(selectedTemplate)}
          onOpenChange={open => { if (!open) setSelectedTemplate(null); }}
        />
      )}
    </div>
  );
}

function TemplateRow({
  template,
  serial,
  usageCount,
  onView,
  onEdit,
}: {
  template: SchemaTemplate;
  serial: number;
  usageCount: number;
  onView: () => void;
  onEdit: () => void;
}) {
  const currentVersion = useSchemaTemplateVersion(template.currentVersionId);
  const fieldCount = currentVersion?.bindings.length ?? 0;

  return (
    <TableRow>
      <TableCell className="text-xs font-mono text-muted-foreground">{serial}</TableCell>
      <TableCell>
        <div className="font-medium text-foreground">{template.name}</div>
        <div className="mt-1 text-xs text-muted-foreground">{template.code}</div>
      </TableCell>
      <TableCell>
        <Badge className={template.kind === 'input' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'}>
          {template.kind === 'input' ? '输入' : '输出'}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{template.serviceName ?? '—'}</TableCell>
      <TableCell className="text-sm">
        {currentVersion ? (
          <div>
            <div className="font-medium text-foreground">v{currentVersion.version}</div>
            <div className="text-xs text-muted-foreground">{currentVersion.status === 'active' ? '正式版' : currentVersion.status === 'draft' ? '草稿版' : '归档版'}</div>
          </div>
        ) : '—'}
      </TableCell>
      <TableCell className="text-sm font-medium text-foreground">{fieldCount}</TableCell>
      <TableCell className="text-sm font-medium text-foreground">{usageCount}</TableCell>
      <TableCell>
        <Badge className={template.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : template.status === 'draft' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-100'}>
          {template.status === 'active' ? '启用' : template.status === 'draft' ? '草稿' : '停用'}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={onEdit}>
            <Pencil className="mr-1 h-3.5 w-3.5" /> 编辑
          </Button>
          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={onView}>
            <Eye className="mr-1 h-3.5 w-3.5" /> 查看
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function TemplateDetailDialog({
  template,
  mode,
  open,
  onOpenChange,
}: {
  template: SchemaTemplate;
  mode: 'view' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dictionaryEntries = useFieldDictionary();
  const versions = useSchemaTemplateVersions(template.id);
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>(template.currentVersionId);
  const version = useSchemaTemplateVersion(selectedVersionId);
  const [draftBindings, setDraftBindings] = useState<SchemaTemplateFieldBinding[]>([]);
  const [draftSections, setDraftSections] = useState<LayoutDraftSection[]>([]);
  const [draftLayout, setDraftLayout] = useState<LayoutDraftItem[]>([]);
  const [changeSummary, setChangeSummary] = useState('');
  const [dictionaryFieldSearch, setDictionaryFieldSearch] = useState('');
  const [newFieldId, setNewFieldId] = useState('');
  const [fieldEditorOpen, setFieldEditorOpen] = useState(false);
  const [fieldEditorForm, setFieldEditorForm] = useState<TemplateFieldEditorForm>(EMPTY_TEMPLATE_FIELD_FORM);
  const [fieldDialogState, setFieldDialogState] = useState<TemplateFieldDialogState>(EMPTY_TEMPLATE_FIELD_DIALOG_STATE);
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const [previewFieldState, setPreviewFieldState] = useState<Record<string, PreviewFieldState>>({});
  const [editingEnabled, setEditingEnabled] = useState(false);
  const [versionListOpen, setVersionListOpen] = useState(false);
  const [fieldCompositionOpen, setFieldCompositionOpen] = useState(true);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [draggingFieldKey, setDraggingFieldKey] = useState<string | null>(null);
  const [bindingSaveState, setBindingSaveState] = useState<'idle' | 'saved'>('idle');
  const configProfileGroups = useConfigProfileGroups();
  const templateProfileBinding = useSchemaTemplateConfigProfileBinding(template.id);
  const [selectedProfileGroupKeys, setSelectedProfileGroupKeys] = useState<string[]>([]);
  const [environmentConfigDraft, setEnvironmentConfigDraft] = useState<TemplateEnvironmentConfig>(() =>
    createDefaultEnvironmentConfig(undefined),
  );

  useEffect(() => {
    setSelectedVersionId(template.currentVersionId);
  }, [template.currentVersionId, template.id]);

  useEffect(() => {
    setEditingEnabled(false);
    setBindingSaveState('idle');
  }, [template.id, mode, open]);

  useEffect(() => {
    setSelectedProfileGroupKeys(templateProfileBinding?.groupKeys ?? []);
    const fallbackEnvironmentFieldKey = version?.bindings.find(binding => binding.fieldKey === 'environment')?.fieldKey;
    setEnvironmentConfigDraft(createDefaultEnvironmentConfig(templateProfileBinding, fallbackEnvironmentFieldKey));
  }, [templateProfileBinding?.groupKeys, template.id]);

  useEffect(() => {
    if (!open || mode !== 'edit') return;
    const currentVersion = versions.find(item => item.id === selectedVersionId)
      ?? versions.find(item => item.id === template.currentVersionId);
    if (!currentVersion) return;
    if (currentVersion.status === 'draft') {
      if (currentVersion.id !== selectedVersionId) setSelectedVersionId(currentVersion.id);
      return;
    }

    const draft = createDraftFromTemplateVersion(template.id, currentVersion.id);
    if (draft) setSelectedVersionId(draft.id);
  }, [mode, open, selectedVersionId, template.currentVersionId, template.id, versions]);

  useEffect(() => {
    setDraftBindings(version?.bindings.map(binding => ({ ...binding, fieldSnapshot: { ...binding.fieldSnapshot } })) ?? []);
    setDraftSections(buildLayoutDraftSections(version?.layout));
    setDraftLayout(buildLayoutDraftItems(version?.bindings ?? [], version?.layout));
    setChangeSummary(version?.changeSummary ?? '');
    const basePreviewValues = Object.fromEntries(
      (version?.bindings ?? []).map(binding => [binding.fieldKey, String(binding.fieldSnapshot.defaultValue ?? '')]),
    );
    setPreviewValues(basePreviewValues);
    setPreviewFieldState({});
  }, [version?.id]);

  const isEditable = mode === 'edit' && editingEnabled;
  const isDraft = isEditable && version?.status === 'draft';

  const addFieldBinding = () => {
    if (!isDraft || !newFieldId) return;
    const entry = dictionaryEntries.find(item => item.id === newFieldId);
    if (!entry) return;
    const nextBinding: SchemaTemplateFieldBinding = {
      id: `binding:${entry.key}:${Date.now()}`,
      fieldKey: entry.key,
      dictionaryEntryId: entry.id,
      source: 'dictionary',
      order: draftBindings.length,
      required: entry.required,
      fieldSnapshot: {
        key: entry.key,
        label: entry.label,
        type: entry.type,
        required: entry.required,
        options: entry.options,
        defaultValue: entry.defaultValue,
        placeholder: entry.placeholder,
        min: entry.min,
        max: entry.max,
        minLength: entry.minLength,
        maxLength: entry.maxLength,
      },
    };
    setDraftBindings(bindings => [...bindings, nextBinding]);
    setDraftLayout(items => [...items, {
      fieldKey: entry.key,
      sectionId: draftSections[0]?.id ?? 'section-default',
      order: items.length,
      widthMode: getDefaultWidthMode(entry.type),
    }]);
    setNewFieldId('');
  };

  const resetFieldEditorForm = () => {
    setFieldEditorForm(EMPTY_TEMPLATE_FIELD_FORM);
  };

  const openCreateFieldDialog = () => {
    resetFieldEditorForm();
    setFieldEditorOpen(true);
  };

  const parseFieldOptions = (optionsText: string) => {
    const items = optionsText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [label, value] = line.split(':');
        const normalizedLabel = (label ?? '').trim();
        const normalizedValue = (value ?? label ?? '').trim();
        return normalizedLabel ? { label: normalizedLabel, value: normalizedValue } : null;
      })
      .filter((item): item is { label: string; value: string } => Boolean(item));
    return items.length > 0 ? items : undefined;
  };

  const handleTemplateFieldFormChange = <K extends keyof TemplateFieldEditorForm>(key: K, value: TemplateFieldEditorForm[K]) => {
    setFieldEditorForm(current => ({ ...current, [key]: value }));
  };

  const commitCustomField = (normalizedKey: string, normalizedLabel: string) => {
    const now = new Date().toISOString();
    const entryId = `field-${normalizedKey}-${Date.now()}`;
    const nextEntry: FieldDictionaryEntry = {
      id: entryId,
      key: normalizedKey,
      label: normalizedLabel,
      type: fieldEditorForm.type,
      required: fieldEditorForm.required,
      category: fieldEditorForm.category.trim() || '基础信息',
      description: fieldEditorForm.description.trim() || undefined,
      sourceScope: template.kind === 'output' ? 'output' : 'input',
      status: 'active',
      placeholder:
        fieldEditorForm.type === 'text' || fieldEditorForm.type === 'textarea'
          ? fieldEditorForm.placeholder.trim() || undefined
          : undefined,
      defaultValue: fieldEditorForm.defaultValue.trim() || undefined,
      options: fieldEditorForm.type === 'select' ? parseFieldOptions(fieldEditorForm.optionsText) : undefined,
      createdAt: now,
      updatedAt: now,
    };
    addFieldDictionaryEntry(nextEntry);

    const nextBinding: SchemaTemplateFieldBinding = {
      id: `binding:${normalizedKey}:${Date.now()}`,
      fieldKey: normalizedKey,
      dictionaryEntryId: nextEntry.id,
      source: 'dictionary',
      order: draftBindings.length,
      required: nextEntry.required,
      fieldSnapshot: {
        key: nextEntry.key,
        label: nextEntry.label,
        type: nextEntry.type,
        required: nextEntry.required,
        options: nextEntry.options,
        defaultValue: nextEntry.defaultValue,
        placeholder: nextEntry.placeholder,
      },
    };

    setDraftBindings(bindings => [...bindings, nextBinding]);
    setDraftLayout(items => [...items, {
      fieldKey: nextEntry.key,
      sectionId: draftSections[0]?.id ?? 'section-default',
      order: items.length,
      widthMode: getDefaultWidthMode(nextEntry.type),
    }]);
    setFieldEditorOpen(false);
    resetFieldEditorForm();
  };

  const handleSaveCustomField = () => {
    if (!isDraft) return;
    const normalizedKey = fieldEditorForm.key.trim();
    const normalizedLabel = fieldEditorForm.label.trim();
    if (!normalizedKey || !normalizedLabel) return;
    const existedBinding = draftBindings.some(binding => binding.fieldKey === normalizedKey);
    if (existedBinding) {
      setFieldDialogState({
        open: true,
        title: '字段不可重复',
        description: `模板中已存在字段 key "${normalizedKey}"，请勿重复新增。`,
      });
      return;
    }
    const duplicatedKey = dictionaryEntries.some(entry => normalizeFieldText(entry.key) === normalizeFieldText(normalizedKey));
    if (duplicatedKey) {
      setFieldDialogState({
        open: true,
        title: '字段字典已存在同 key',
        description: `字段字典中已存在 key "${normalizedKey}"，请直接从字典添加或更换 key。`,
      });
      return;
    }
    const duplicatedLabel = dictionaryEntries.some(entry => normalizeFieldText(entry.label) === normalizeFieldText(normalizedLabel));
    if (duplicatedLabel) {
      setFieldDialogState({
        open: true,
        title: '字段字典已存在同名字段',
        description: `字段字典中已存在名称 "${normalizedLabel}"，请直接从字典添加或调整字段名称。`,
      });
      return;
    }
    const similarEntries = collectSimilarDictionaryEntries(dictionaryEntries, normalizedKey, normalizedLabel);
    if (similarEntries.length > 0) {
      setFieldDialogState({
        open: true,
        title: '发现接近字段',
        description: '字段字典中已有接近字段。请先核对是否可直接复用，确认不是重复字段后再继续保存。',
        candidates: similarEntries.slice(0, 5).map(entry => ({
          label: entry.label,
          key: entry.key,
          category: entry.category,
        })),
        confirmLabel: '确认继续',
        onConfirm: () => {
          commitCustomField(normalizedKey, normalizedLabel);
          setFieldDialogState(EMPTY_TEMPLATE_FIELD_DIALOG_STATE);
        },
      });
      return;
    }

    commitCustomField(normalizedKey, normalizedLabel);
  };

  const removeFieldBinding = (bindingId: string) => {
    if (!isDraft) return;
    setDraftBindings(bindings => {
      const nextBindings = bindings
        .filter(binding => binding.id !== bindingId)
        .map((binding, index) => ({ ...binding, order: index }));
      setDraftLayout(items => items.filter(item => item.fieldKey !== bindings.find(binding => binding.id === bindingId)?.fieldKey));
      return nextBindings;
    });
  };

  const updateBinding = (bindingId: string, patch: Partial<SchemaTemplateFieldBinding>) => {
    if (!isDraft) return;
    setDraftBindings(bindings =>
      bindings.map(binding => (binding.id === bindingId ? { ...binding, ...patch } : binding)),
    );
  };

  const ensureEnvironmentBinding = (sourceKey: EnvironmentRecommendedFieldKey, enabled: boolean) => {
    const definition = getRecommendedFieldDefinition(sourceKey);
    if (!definition) return;
    if (enabled) {
      setDraftBindings(bindings => {
        if (bindings.some(binding => binding.fieldKey === definition.fieldKey)) return bindings;
        return [...bindings, createEnvironmentFieldBinding(definition, bindings.length)];
      });
      setDraftLayout(items => {
        if (items.some(item => item.fieldKey === definition.fieldKey)) return items;
        return [
          ...items,
          {
            fieldKey: definition.fieldKey,
            sectionId: draftSections[0]?.id ?? 'section-default',
            order: items.length,
            widthMode: 'half',
          },
        ];
      });
      return;
    }

    setDraftBindings(bindings => bindings
      .filter(binding => binding.fieldKey !== definition.fieldKey)
      .map((binding, index) => ({ ...binding, order: index })));
    setDraftLayout(items => items
      .filter(item => item.fieldKey !== definition.fieldKey)
      .map((item, index) => ({ ...item, order: index })));
    setPreviewFieldState(current => {
      if (!current[definition.fieldKey]) return current;
      const next = { ...current };
      delete next[definition.fieldKey];
      return next;
    });
  };

  const updateEnvironmentFieldConfig = (sourceKey: EnvironmentRecommendedFieldKey, enabled: boolean) => {
    setEnvironmentConfigDraft(current => ({
      ...current,
      fields: current.fields.map(field => (
        field.key === sourceKey
          ? { ...field, enabled }
          : field
      )),
    }));
    if (isDraft) ensureEnvironmentBinding(sourceKey, enabled);
  };

  const handlePreviewValueChange = (fieldKey: string, value: string) => {
    setPreviewValues(current => ({ ...current, [fieldKey]: value }));
    if (!isRecommendedEnvironmentField(fieldKey)) return;
    setPreviewFieldState(current => ({
      ...current,
      [fieldKey]: {
        initialized: current[fieldKey]?.initialized ?? true,
        overridden: true,
      },
    }));
  };

  const handleCreateDraft = () => {
    const draft = createDraftFromTemplateVersion(template.id, selectedVersionId);
    if (draft) setSelectedVersionId(draft.id);
  };

  const persistTemplateBinding = () => {
    saveSchemaTemplateConfigProfileBinding(template.id, selectedProfileGroupKeys, environmentConfigDraft);
    setBindingSaveState('saved');
    window.setTimeout(() => {
      setBindingSaveState(current => (current === 'saved' ? 'idle' : current));
    }, 2000);
  };

  const handleSaveDraft = () => {
    if (!version || !isDraft) return;
    const nextBindings = draftBindings.map((binding, index) => ({ ...binding, order: index }));
    updateSchemaTemplateVersion(version.id, {
      bindings: nextBindings,
      layout: buildLayoutConfig(draftLayout, draftSections),
      changeSummary: changeSummary.trim() || '更新字段绑定',
    });
    persistTemplateBinding();
  };

  const handlePublish = () => {
    if (!version) return;
    if (isDraft) {
      updateSchemaTemplateVersion(version.id, {
        bindings: draftBindings.map((binding, index) => ({ ...binding, order: index })),
        layout: buildLayoutConfig(draftLayout, draftSections),
        changeSummary: changeSummary.trim() || version.changeSummary,
      });
    }
    persistTemplateBinding();
    publishSchemaTemplateVersion(template.id, version.id);
  };

  const updateLayoutItem = (fieldKey: string, patch: Partial<LayoutDraftItem>) => {
    if (!isDraft) return;
    setDraftLayout(items =>
      items.map(item => (item.fieldKey === fieldKey ? { ...item, ...patch } : item)),
    );
  };

  const buildConditionOptions = (binding: SchemaTemplateFieldBinding) => {
    return draftBindings
      .filter(candidate => candidate.fieldKey !== binding.fieldKey)
      .map(candidate => ({
        key: candidate.fieldKey,
        label: candidate.aliasLabel || candidate.fieldSnapshot.label,
        type: candidate.fieldSnapshot.type,
        options: candidate.fieldSnapshot.options ?? [],
      }));
  };

  const getConditionSource = (fieldKey?: string) => {
    if (!fieldKey) return undefined;
    return draftBindings.find(binding => binding.fieldKey === fieldKey);
  };

  const resolvedVersionFieldMap = useMemo(() => {
    if (!version?.id) return new Map<string, FieldSchema>();
    return new Map(getResolvedTemplateFields(version.id).map(field => [field.key, field]));
  }, [version?.id]);
  const previewBindings = useMemo(() => {
    if (isDraft) return draftBindings;
    return (version?.bindings ?? []).map(binding => {
      const resolvedField = resolvedVersionFieldMap.get(binding.fieldKey);
      if (!resolvedField) return binding;
      return {
        ...binding,
        fieldSnapshot: resolvedField,
      };
    });
  }, [draftBindings, isDraft, resolvedVersionFieldMap, version?.bindings]);
  const availableDictionaryEntries = dictionaryEntries.filter(entry => (
    !draftBindings.some(binding => binding.dictionaryEntryId === entry.id)
  ));
  const filteredDictionaryEntries = availableDictionaryEntries.filter(entry => {
    const keyword = dictionaryFieldSearch.trim().toLowerCase();
    if (!keyword) return true;
    return `${entry.label} ${entry.key} ${entry.category} ${entry.description ?? ''}`.toLowerCase().includes(keyword);
  });
  const previewLayout = isDraft
    ? buildLayoutConfig(draftLayout, draftSections)
    : (version?.layout ?? buildLayoutConfig(buildLayoutDraftItems(previewBindings, version?.layout), buildLayoutDraftSections(version?.layout)));
  const displayLayoutItems = isDraft ? draftLayout : buildLayoutDraftItems(previewBindings, version?.layout);
  const orderedBindings = previewBindings.slice().sort((a, b) => {
    const aOrder = displayLayoutItems.find(item => item.fieldKey === a.fieldKey)?.order ?? 0;
    const bOrder = displayLayoutItems.find(item => item.fieldKey === b.fieldKey)?.order ?? 0;
    return aOrder - bOrder;
  });
  const selectedEnvironmentGroup = configProfileGroups.find(group => group.key === environmentConfigDraft.profileGroupKey)
    ?? configProfileGroups.find(group => selectedProfileGroupKeys.includes(group.key))
    ?? undefined;
  const selectedProfileGroups = configProfileGroups.filter(group => selectedProfileGroupKeys.includes(group.key));
  const recommendedFieldConfigs = environmentConfigDraft.fields;
  const environmentFieldKey = environmentConfigDraft.environmentFieldKey || 'environment';
  const environmentFieldBinding = previewBindings.find(binding => binding.fieldKey === environmentFieldKey);

  useEffect(() => {
    const targetBinding = previewBindings.find(binding => binding.fieldKey === environmentFieldKey);
    const currentEnvironmentValue = previewValues[environmentFieldKey] ?? String(targetBinding?.fieldSnapshot.defaultValue ?? '');
    if (!currentEnvironmentValue || !selectedEnvironmentGroup) return;
    const matchedProfile = selectedEnvironmentGroup.profiles.find(profile => (
      normalizeEnvironmentProfileValue(profile.env) === normalizeEnvironmentProfileValue(currentEnvironmentValue)
    ));
    if (!matchedProfile) return;

    setPreviewValues(current => {
      const nextValues = { ...current };
      let changed = false;

      recommendedFieldConfigs.forEach(fieldConfig => {
        if (!fieldConfig.enabled) return;
        const definition = getRecommendedFieldDefinition(fieldConfig.key);
        if (!definition) return;
        const fieldState = previewFieldState[definition.fieldKey];
        const shouldPreserve = environmentConfigDraft.preserveOverrides !== false && fieldState?.overridden;
        if (shouldPreserve) return;
        const nextValue = getEnvironmentProfileValue(matchedProfile, fieldConfig.key);
        if (nextValues[definition.fieldKey] !== nextValue) {
          nextValues[definition.fieldKey] = nextValue;
          changed = true;
        }
      });

      return changed ? nextValues : current;
    });

    setPreviewFieldState(current => {
      const next = { ...current };
      recommendedFieldConfigs.forEach(fieldConfig => {
        if (!fieldConfig.enabled) return;
        const definition = getRecommendedFieldDefinition(fieldConfig.key);
        if (!definition) return;
        const state = next[definition.fieldKey];
        if (environmentConfigDraft.preserveOverrides !== false && state?.overridden) return;
        next[definition.fieldKey] = {
          initialized: true,
          overridden: state?.overridden ?? false,
        };
      });
      return next;
    });
  }, [
    environmentFieldKey,
    environmentConfigDraft.preserveOverrides,
    previewValues,
    previewFieldState,
    previewBindings,
    recommendedFieldConfigs,
    selectedEnvironmentGroup,
  ]);

  const addSection = () => {
    if (!isDraft) return;
    setDraftSections(sections => [
      ...sections,
      {
        id: `section-${Date.now()}`,
        title: `新分组 ${sections.length + 1}`,
        description: '',
        order: sections.length,
        collapsible: false,
        defaultCollapsed: false,
      },
    ]);
  };

  const updateSection = (sectionId: string, patch: Partial<LayoutDraftSection>) => {
    if (!isDraft) return;
    setDraftSections(sections => sections.map(section => (
      section.id === sectionId ? { ...section, ...patch } : section
    )));
  };

  const moveLayoutItem = (fieldKey: string, direction: 'up' | 'down') => {
    if (!isDraft) return;
    setDraftLayout(items => {
      const ordered = [...items].sort((a, b) => a.order - b.order);
      const index = ordered.findIndex(item => item.fieldKey === fieldKey);
      if (index < 0) return items;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= ordered.length) return items;
      [ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]];
      return ordered.map((item, nextIndex) => ({ ...item, order: nextIndex }));
    });
  };

  const reorderLayoutItem = (fromFieldKey: string, toFieldKey: string) => {
    if (!isDraft || fromFieldKey === toFieldKey) return;
    setDraftLayout(items => {
      const ordered = [...items].sort((a, b) => a.order - b.order);
      const fromIndex = ordered.findIndex(item => item.fieldKey === fromFieldKey);
      const toIndex = ordered.findIndex(item => item.fieldKey === toFieldKey);
      if (fromIndex < 0 || toIndex < 0) return items;
      const [moved] = ordered.splice(fromIndex, 1);
      ordered.splice(toIndex, 0, moved);
      return ordered.map((item, nextIndex) => ({ ...item, order: nextIndex }));
    });
  };

  const moveLayoutItemToSection = (fieldKey: string, sectionId: string) => {
    if (!isDraft) return;
    setDraftLayout(items =>
      items.map(item => (item.fieldKey === fieldKey ? { ...item, sectionId } : item)),
    );
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    if (!isDraft) return;
    setDraftSections(sections => {
      const ordered = [...sections].sort((a, b) => a.order - b.order);
      const index = ordered.findIndex(section => section.id === sectionId);
      if (index < 0) return sections;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= ordered.length) return sections;
      [ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]];
      return ordered.map((section, nextIndex) => ({ ...section, order: nextIndex }));
    });
  };

  const hiddenPreviewFieldKeys = new Set<string>();
  const environmentSelected = Boolean((previewValues[environmentFieldKey] ?? '').trim());
  recommendedFieldConfigs.forEach(fieldConfig => {
    const definition = getRecommendedFieldDefinition(fieldConfig.key);
    if (!definition) return;
    if (!fieldConfig.enabled || !environmentSelected) {
      hiddenPreviewFieldKeys.add(definition.fieldKey);
    }
  });
  const orderedSections = draftSections.slice().sort((a, b) => a.order - b.order);
  const unassignedBindings = orderedBindings.filter(binding => {
    const layoutItem = displayLayoutItems.find(item => item.fieldKey === binding.fieldKey);
    return !layoutItem || !orderedSections.some(section => section.id === layoutItem.sectionId);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-hidden p-0">
        <DialogHeader className="sticky top-0 z-10 border-b bg-background px-6 py-5">
          <DialogTitle>{mode === 'edit' ? `编辑模板：${template.name}` : template.name}</DialogTitle>
          <DialogDescription>
            {template.serviceName ? `来源服务：${template.serviceName}` : '模板详情'} · 当前版本 {version ? `v${version.version}` : '未发布'}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(92vh-88px)] space-y-4 overflow-y-auto px-6 pb-6 pt-4">
          <Card>
            <CardContent className="p-4">
              <div className="grid gap-2 text-sm md:grid-cols-3">
                <InfoChip label="模板编码" value={template.code} mono />
                <InfoChip label="模板类型" value={template.kind === 'input' ? '输入模板' : '输出模板'} />
                <InfoChip label="服务范围" value={template.scope === 'atomic' ? '原子服务' : '组合服务'} />
                <InfoChip label="来源服务" value={template.serviceName ?? '—'} />
                <InfoChip label="模板状态" value={template.status === 'active' ? '启用' : template.status === 'draft' ? '草稿' : '停用'} />
                <InfoChip label="当前版本状态" value={version?.status === 'draft' ? '草稿版' : version?.status === 'active' ? '正式版' : version?.status === 'archived' ? '归档版' : '未发布'} />
              </div>
              <div className="mt-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                {template.description ?? '暂无模板说明'}
              </div>

              <div className="mt-5 border-t border-border pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">当前版本</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {version ? `v${version.version} · ${version.changeSummary || '无变更说明'}` : '未发布版本'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {version && (
                      <Badge className={version.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : version.status === 'draft' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-100'}>
                        {version.status === 'active' ? '正式版' : version.status === 'draft' ? '草稿版' : '归档版'}
                      </Badge>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setVersionListOpen(value => !value)}>
                      {versionListOpen ? '收起版本列表' : '展开版本列表'}
                    </Button>
                  </div>
                </div>
                {versionListOpen && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {versions.map(item => (
                      <Button
                        key={item.id}
                        size="sm"
                        variant={selectedVersionId === item.id ? 'default' : 'outline'}
                        onClick={() => setSelectedVersionId(item.id)}
                      >
                        v{item.version}
                      </Button>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {mode === 'view' && (
                    <Button size="sm" variant="outline" onClick={handleCreateDraft}>
                      <CopyPlus className="mr-1 h-3.5 w-3.5" /> 复制为新版本
                    </Button>
                  )}
                  {mode === 'edit' && !editingEnabled && (
                    <Button size="sm" onClick={() => setEditingEnabled(true)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> 编辑
                    </Button>
                  )}
                  {mode === 'edit' && editingEnabled && (
                    <Button size="sm" variant="outline" onClick={() => setEditingEnabled(false)}>
                      取消编辑
                    </Button>
                  )}
                  {isEditable && version && version.status !== 'active' && (
                    <Button size="sm" variant="outline" onClick={handlePublish}>
                      <Upload className="mr-1 h-3.5 w-3.5" /> 发布正式版
                    </Button>
                  )}
                </div>
              </div>

                <div className="mt-5 border-t border-border pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">环境推荐套餐绑定</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      表单模板统一绑定套餐分类，原子服务页不再维护这层关系。
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={persistTemplateBinding}
                  >
                    <Save className="mr-1 h-3.5 w-3.5" /> {bindingSaveState === 'saved' ? '已保存' : '保存套餐绑定'}
                  </Button>
                </div>
                {bindingSaveState === 'saved' && (
                  <div className="mt-2 text-xs text-emerald-600">套餐绑定已保存</div>
                )}
                <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
                  {selectedProfileGroups.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span>当前已绑定：</span>
                      {selectedProfileGroups.map(group => (
                        <span key={group.key} className="rounded-full border border-border bg-white px-2 py-1 text-foreground">
                          {group.title} · {group.profiles.length} 条套餐
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span>当前尚未绑定套餐分类，环境推荐字段将无法按环境带出套餐值。</span>
                  )}
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <div className="rounded-lg border border-border bg-white px-3 py-2.5 text-xs">
                    <div className="text-muted-foreground">当前环境字段</div>
                    <div className="mt-1 font-medium text-foreground">
                      {environmentFieldBinding ? (environmentFieldBinding.aliasLabel || environmentFieldBinding.fieldSnapshot.label) : '未指定'}
                    </div>
                    <div className="mt-1 font-mono text-muted-foreground">{environmentFieldKey || '-'}</div>
                  </div>
                  <div className="rounded-lg border border-border bg-white px-3 py-2.5 text-xs">
                    <div className="text-muted-foreground">当前推荐来源分类</div>
                    <div className="mt-1 font-medium text-foreground">{selectedEnvironmentGroup?.title || '未指定'}</div>
                    <div className="mt-1 font-mono text-muted-foreground">{selectedEnvironmentGroup?.key || '-'}</div>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {configProfileGroups.map(group => {
                    const checked = selectedProfileGroupKeys.includes(group.key);
                    return (
                      <label key={group.key} className="flex items-start gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={event => setSelectedProfileGroupKeys(current => (
                            event.target.checked
                              ? [...current, group.key]
                              : current.filter(item => item !== group.key)
                          ))}
                        />
                        <span>
                          <span className="font-medium text-foreground">{group.title}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {group.profiles.length} 条套餐
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-4 rounded-lg border border-border bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">环境驱动字段</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        选择环境后自动展示并初始化推荐配置，用户后续可以继续手动调整。
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                      <CircleHelp className="h-3.5 w-3.5" />
                      默认会根据环境推荐配置，可按需调整
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">环境字段</span>
                      <select
                        value={environmentConfigDraft.environmentFieldKey ?? ''}
                        onChange={event => setEnvironmentConfigDraft(current => ({ ...current, environmentFieldKey: event.target.value }))}
                        className="h-9 rounded-md border border-border bg-white px-3 text-sm"
                        disabled={!isEditable}
                      >
                        <option value="">请选择环境字段</option>
                        {(isDraft ? draftBindings : previewBindings)
                          .filter(binding => binding.fieldSnapshot.type === 'select')
                          .map(binding => (
                            <option key={binding.id} value={binding.fieldKey}>
                              {binding.aliasLabel || binding.fieldSnapshot.label}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">推荐提示文案</span>
                      <input
                        value={environmentConfigDraft.hintText ?? DEFAULT_ENVIRONMENT_HINT}
                        onChange={event => setEnvironmentConfigDraft(current => ({ ...current, hintText: event.target.value }))}
                        className="h-9 rounded-md border border-border bg-white px-3 text-sm"
                        disabled={!isEditable}
                      />
                    </label>
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={environmentConfigDraft.preserveOverrides !== false}
                      onChange={event => setEnvironmentConfigDraft(current => ({ ...current, preserveOverrides: event.target.checked }))}
                      disabled={!isEditable}
                    />
                    用户手动修改后保留该字段值，再次选择环境时不覆盖
                  </label>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {recommendedFieldConfigs.map(fieldConfig => {
                      const definition = getRecommendedFieldDefinition(fieldConfig.key);
                      if (!definition) return null;
                      return (
                        <div key={fieldConfig.key} className="rounded-lg border border-border bg-white p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium text-foreground">{definition.label}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{definition.fieldKey}</div>
                            </div>
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={fieldConfig.enabled}
                                onChange={event => updateEnvironmentFieldConfig(fieldConfig.key, event.target.checked)}
                                disabled={!isEditable}
                              />
                              显示
                            </label>
                          </div>
                          <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={fieldConfig.allowOverride}
                              onChange={event => setEnvironmentConfigDraft(current => ({
                                ...current,
                                fields: current.fields.map(item => (
                                  item.key === fieldConfig.key
                                    ? { ...item, allowOverride: event.target.checked }
                                    : item
                                )),
                              }))}
                              disabled={!isEditable}
                            />
                            允许手动修改
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-foreground">字段与布局</div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setFieldCompositionOpen(value => !value)}>
                      {fieldCompositionOpen ? '收起字段组成' : '展开字段组成'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setLayoutOpen(value => !value)}>
                      {layoutOpen ? '收起页面布局' : '展开页面布局'}
                    </Button>
                    {isDraft && (
                      <Button size="sm" onClick={handleSaveDraft}>
                        <Save className="mr-1 h-3.5 w-3.5" /> 保存草稿
                      </Button>
                    )}
                  </div>
                </div>
              {isDraft && (
                <div className="mt-3 space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">变更说明</span>
                    <input
                      value={changeSummary}
                      onChange={event => setChangeSummary(event.target.value)}
                      className="h-9 rounded-md border border-border bg-white px-3 text-sm"
                      placeholder="例如：新增公网访问字段、调整资源规格字段"
                    />
                  </label>
                  <div className="grid gap-2 lg:grid-cols-[220px,minmax(0,1fr),auto]">
                    <input
                      value={dictionaryFieldSearch}
                      onChange={event => {
                        setDictionaryFieldSearch(event.target.value);
                        setNewFieldId('');
                      }}
                      className="h-9 rounded-md border border-border bg-white px-3 text-sm"
                      placeholder="搜索字段中文 / key / 分类"
                    />
                    <select
                      value={newFieldId}
                      onChange={event => setNewFieldId(event.target.value)}
                      className="h-9 rounded-md border border-border bg-white px-3 text-sm"
                    >
                      <option value="">从字段字典选择待绑定字段...</option>
                      {filteredDictionaryEntries.map(entry => (
                        <option key={entry.id} value={entry.id}>
                          {entry.label} · {entry.key} · {entry.category}
                        </option>
                      ))}
                    </select>
                    <Button size="sm" variant="outline" onClick={addFieldBinding} disabled={!newFieldId}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> 从字典添加
                    </Button>
                    <Button size="sm" onClick={openCreateFieldDialog} disabled={!isDraft}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> 新增字段
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>匹配 {filteredDictionaryEntries.length} 个字段</span>
                    {filteredDictionaryEntries.length === 0 && (
                      <span>未找到匹配字段，请尝试中文标签或英文 key</span>
                    )}
                  </div>
                </div>
              )}
              {fieldCompositionOpen && (
              <div className="mt-3 rounded-lg border border-border">
                <div className="border-b border-border bg-muted/20 px-4 py-3">
                  <div className="text-sm font-semibold text-foreground">字段池</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    这里维护模板绑定的全部字段，保留表格视图便于快速扫描字段 key、标签、类型、必填和来源。
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">序号</th>
                        <th className="px-3 py-2 text-left font-medium">字段 Key</th>
                        <th className="px-3 py-2 text-left font-medium">显示标签</th>
                        <th className="px-3 py-2 text-left font-medium">类型</th>
                        <th className="px-3 py-2 text-left font-medium">必填</th>
                        <th className="px-3 py-2 text-left font-medium">来源</th>
                        {isDraft && <th className="px-3 py-2 text-right font-medium">操作</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {orderedBindings.map((binding, index) => (
                        <tr
                          key={binding.id}
                          className={`border-t ${draggingFieldKey === binding.fieldKey ? 'bg-sky-50/50' : ''}`}
                          draggable={isDraft}
                          onDragStart={() => setDraggingFieldKey(binding.fieldKey)}
                          onDragOver={event => {
                            if (!isDraft) return;
                            event.preventDefault();
                          }}
                          onDrop={event => {
                            if (!isDraft || !draggingFieldKey) return;
                            event.preventDefault();
                            reorderLayoutItem(draggingFieldKey, binding.fieldKey);
                            setDraggingFieldKey(null);
                          }}
                          onDragEnd={() => setDraggingFieldKey(null)}
                        >
                          <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
                          <td className="px-3 py-2 font-mono">{binding.fieldKey}</td>
                          <td className="px-3 py-2">
                            {isDraft ? (
                              <input
                                value={binding.aliasLabel ?? binding.fieldSnapshot.label}
                                onChange={event => updateBinding(binding.id, { aliasLabel: event.target.value })}
                                className="h-8 w-full rounded-md border border-border bg-white px-2 text-xs"
                              />
                            ) : (
                              binding.aliasLabel || binding.fieldSnapshot.label
                            )}
                          </td>
                          <td className="px-3 py-2">{binding.fieldSnapshot.type}</td>
                          <td className="px-3 py-2">
                            {isDraft ? (
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={binding.required ?? binding.fieldSnapshot.required}
                                  onChange={event => updateBinding(binding.id, { required: event.target.checked })}
                                />
                                <span>{(binding.required ?? binding.fieldSnapshot.required) ? '是' : '否'}</span>
                              </label>
                            ) : (
                              (binding.required ?? binding.fieldSnapshot.required) ? '是' : '否'
                            )}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{binding.source === 'dictionary' ? '字段字典' : '历史快照'}</td>
                          {isDraft && (
                            <td className="px-3 py-2">
                              <div className="flex justify-end">
                                <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive hover:text-destructive" onClick={() => removeFieldBinding(binding.id)}>
                                  <Trash2 className="mr-1 h-3.5 w-3.5" /> 删除
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                      {(!version || (isDraft ? draftBindings.length === 0 : version.bindings.length === 0)) ? (
                        <tr>
                          <td colSpan={isDraft ? 7 : 6} className="px-3 py-6 text-center text-muted-foreground">当前版本暂无字段绑定</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
              )}

              {layoutOpen && (
              <div className="mt-4 rounded-lg border border-border">
                <div className="border-b border-border px-3 py-2 text-sm font-semibold text-foreground">页面布局</div>
                <div className="space-y-4 p-4">
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    用分组画布直接编排字段。卡片支持拖拽换顺序、切换宽度档位，并配置条件显隐；环境推荐字段只有启用后才会参与排版。
                  </div>

                  {isDraft && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">先维护分组，再把字段卡片拖进对应分组。</div>
                      <Button size="sm" variant="outline" onClick={addSection}>
                        <Plus className="mr-1 h-3.5 w-3.5" /> 新增分组
                      </Button>
                    </div>
                  )}

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),320px]">
                    <div className="space-y-4">
                      {orderedSections.map(section => {
                        const sectionBindings = orderedBindings.filter(binding => {
                          const layoutItem = displayLayoutItems.find(item => item.fieldKey === binding.fieldKey);
                          return (layoutItem?.sectionId ?? 'section-default') === section.id;
                        });

                        return (
                          <div
                            key={section.id}
                            className="rounded-xl border border-border bg-white"
                            onDragOver={event => {
                              if (!isDraft) return;
                              event.preventDefault();
                            }}
                            onDrop={event => {
                              if (!isDraft || !draggingFieldKey) return;
                              event.preventDefault();
                              moveLayoutItemToSection(draggingFieldKey, section.id);
                              setDraggingFieldKey(null);
                            }}
                          >
                            <div className="border-b border-border px-4 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  {isDraft ? (
                                    <div className="grid gap-2 md:grid-cols-[180px,1fr]">
                                      <input
                                        value={section.title}
                                        onChange={event => updateSection(section.id, { title: event.target.value })}
                                        className="h-9 rounded-md border border-border bg-white px-3 text-sm"
                                        placeholder="分组标题"
                                      />
                                      <input
                                        value={section.description}
                                        onChange={event => updateSection(section.id, { description: event.target.value })}
                                        className="h-9 rounded-md border border-border bg-white px-3 text-sm"
                                        placeholder="分组说明，可选"
                                      />
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="text-sm font-semibold text-foreground">{section.title}</div>
                                      {section.description && <div className="mt-1 text-xs text-muted-foreground">{section.description}</div>}
                                    </div>
                                  )}
                                </div>
                                {isDraft && (
                                  <div className="flex items-center gap-1">
                                    <Button size="sm" variant="ghost" className="h-8 w-8 px-0" onClick={() => moveSection(section.id, 'up')}>
                                      <ArrowUp className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 px-0" onClick={() => moveSection(section.id, 'down')}>
                                      <ArrowDown className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              {isDraft && (
                                <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={section.collapsible}
                                      onChange={event => updateSection(section.id, {
                                        collapsible: event.target.checked,
                                        defaultCollapsed: event.target.checked ? section.defaultCollapsed : false,
                                      })}
                                    />
                                    允许折叠
                                  </label>
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={section.defaultCollapsed}
                                      disabled={!section.collapsible}
                                      onChange={event => updateSection(section.id, { defaultCollapsed: event.target.checked })}
                                    />
                                    默认收起
                                  </label>
                                </div>
                              )}
                            </div>

                            <div className="space-y-3 p-4">
                              {sectionBindings.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center text-xs text-slate-500">
                                  把字段拖到这里，作为该分组的表单内容。
                                </div>
                              ) : (
                                sectionBindings.map(binding => {
                                  const layoutItem = displayLayoutItems.find(item => item.fieldKey === binding.fieldKey);
                                  const conditionOptions = buildConditionOptions(binding);
                                  const disabledByEnvironment = isRecommendedEnvironmentField(binding.fieldKey) &&
                                    !recommendedFieldConfigs.find(item => getRecommendedFieldDefinition(item.key)?.fieldKey === binding.fieldKey)?.enabled;
                                  return (
                                    <div
                                      key={`layout-card-${binding.id}`}
                                      className={`rounded-xl border px-4 py-3 ${draggingFieldKey === binding.fieldKey ? 'border-sky-300 bg-sky-50' : 'border-border bg-white'}`}
                                      draggable={isDraft}
                                      onDragStart={() => setDraggingFieldKey(binding.fieldKey)}
                                      onDragOver={event => {
                                        if (!isDraft) return;
                                        event.preventDefault();
                                      }}
                                      onDrop={event => {
                                        if (!isDraft || !draggingFieldKey) return;
                                        event.preventDefault();
                                        reorderLayoutItem(draggingFieldKey, binding.fieldKey);
                                        setDraggingFieldKey(null);
                                      }}
                                      onDragEnd={() => setDraggingFieldKey(null)}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                          <div className="text-sm font-medium text-foreground">{binding.aliasLabel || binding.fieldSnapshot.label}</div>
                                          <div className="mt-1 font-mono text-[11px] text-muted-foreground">{binding.fieldKey}</div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {isDraft && (
                                            <>
                                              <Button size="sm" variant="ghost" className="h-8 w-8 px-0" onClick={() => moveLayoutItem(binding.fieldKey, 'up')}>
                                                <ArrowUp className="h-3.5 w-3.5" />
                                              </Button>
                                              <Button size="sm" variant="ghost" className="h-8 w-8 px-0" onClick={() => moveLayoutItem(binding.fieldKey, 'down')}>
                                                <ArrowDown className="h-3.5 w-3.5" />
                                              </Button>
                                            </>
                                          )}
                                          <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">{getWidthModeLabel(layoutItem?.widthMode ?? 'half')}</Badge>
                                        </div>
                                      </div>

                                      <div className="mt-3 grid gap-3 lg:grid-cols-[140px,1fr]">
                                        <label className="grid gap-1 text-xs text-muted-foreground">
                                          宽度档位
                                          {isDraft ? (
                                            <select
                                              value={layoutItem?.widthMode ?? getDefaultWidthMode(binding.fieldSnapshot.type)}
                                              onChange={event => updateLayoutItem(binding.fieldKey, { widthMode: event.target.value as LayoutDraftItem['widthMode'] })}
                                              className="h-8 rounded-md border border-border bg-white px-2 text-xs"
                                              disabled={disabledByEnvironment}
                                            >
                                              <option value="third">三个/行</option>
                                              <option value="half">两个/行</option>
                                              <option value="full">整行</option>
                                            </select>
                                          ) : (
                                            <div className="rounded-md border border-border bg-slate-50 px-2 py-2 text-xs text-foreground">
                                              {getWidthModeLabel(layoutItem?.widthMode ?? 'half')}
                                            </div>
                                          )}
                                        </label>
                                        <div className="grid gap-1 text-xs text-muted-foreground">
                                          <span>显示条件</span>
                                          {isDraft ? (
                                            <div className="space-y-1">
                                              <select
                                                value={layoutItem?.visibleWhen?.fieldKey ?? ''}
                                                onChange={event => {
                                                  const nextFieldKey = event.target.value;
                                                  if (!nextFieldKey) {
                                                    updateLayoutItem(binding.fieldKey, { visibleWhen: undefined });
                                                    return;
                                                  }
                                                  updateLayoutItem(binding.fieldKey, {
                                                    visibleWhen: { fieldKey: nextFieldKey, operator: 'eq', value: '' },
                                                  });
                                                }}
                                                className="h-8 w-full rounded-md border border-border bg-white px-2 text-xs"
                                              >
                                                <option value="">始终显示</option>
                                                {conditionOptions.map(option => (
                                                  <option key={option.key} value={option.key}>
                                                    当 {option.label}
                                                  </option>
                                                ))}
                                              </select>
                                              {layoutItem?.visibleWhen && (
                                                <div className="flex gap-1">
                                                  <select
                                                    value={layoutItem.visibleWhen.operator}
                                                    onChange={event => updateLayoutItem(binding.fieldKey, {
                                                      visibleWhen: {
                                                        ...layoutItem.visibleWhen!,
                                                        operator: event.target.value as 'eq' | 'neq',
                                                      },
                                                    })}
                                                    className="h-8 rounded-md border border-border bg-white px-2 text-xs"
                                                  >
                                                    <option value="eq">等于</option>
                                                    <option value="neq">不等于</option>
                                                  </select>
                                                  {getConditionSource(layoutItem.visibleWhen.fieldKey)?.fieldSnapshot.type === 'select' &&
                                                  getConditionSource(layoutItem.visibleWhen.fieldKey)?.fieldSnapshot.options ? (
                                                    <select
                                                      value={String(layoutItem.visibleWhen.value ?? '')}
                                                      onChange={event => updateLayoutItem(binding.fieldKey, {
                                                        visibleWhen: {
                                                          ...layoutItem.visibleWhen!,
                                                          value: event.target.value,
                                                        },
                                                      })}
                                                      className="h-8 flex-1 rounded-md border border-border bg-white px-2 text-xs"
                                                    >
                                                      <option value="">请选择触发值</option>
                                                      {getConditionSource(layoutItem.visibleWhen.fieldKey)?.fieldSnapshot.options?.map(option => (
                                                        <option key={option.value} value={option.value}>
                                                          {option.label}
                                                        </option>
                                                      ))}
                                                    </select>
                                                  ) : getConditionSource(layoutItem.visibleWhen.fieldKey)?.fieldSnapshot.type === 'boolean' ? (
                                                    <select
                                                      value={String(layoutItem.visibleWhen.value ?? 'false')}
                                                      onChange={event => updateLayoutItem(binding.fieldKey, {
                                                        visibleWhen: {
                                                          ...layoutItem.visibleWhen!,
                                                          value: event.target.value === 'true',
                                                        },
                                                      })}
                                                      className="h-8 flex-1 rounded-md border border-border bg-white px-2 text-xs"
                                                    >
                                                      <option value="true">是</option>
                                                      <option value="false">否</option>
                                                    </select>
                                                  ) : (
                                                    <input
                                                      value={String(layoutItem.visibleWhen.value ?? '')}
                                                      onChange={event => updateLayoutItem(binding.fieldKey, {
                                                        visibleWhen: {
                                                          ...layoutItem.visibleWhen!,
                                                          value: event.target.value,
                                                        },
                                                      })}
                                                      className="h-8 flex-1 rounded-md border border-border bg-white px-2 text-xs"
                                                      placeholder="触发值"
                                                    />
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="rounded-md border border-border bg-slate-50 px-2 py-2 text-xs text-foreground">
                                              {layoutItem?.visibleWhen
                                                ? `${layoutItem.visibleWhen.fieldKey} ${layoutItem.visibleWhen.operator === 'eq' ? '=' : '≠'} ${String(layoutItem.visibleWhen.value)}`
                                                : '始终显示'}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-xl border border-border bg-white p-4">
                        <div className="text-sm font-semibold text-foreground">未分配字段</div>
                        <div className="mt-1 text-xs text-muted-foreground">新增字段或暂未编排的字段会先停在这里，可直接拖进左侧任一分组。</div>
                        <div className="mt-3 space-y-2">
                          {unassignedBindings.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                              当前没有待分配字段
                            </div>
                          ) : (
                            unassignedBindings.map(binding => (
                              <div
                                key={`unassigned-${binding.id}`}
                                className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2"
                                draggable={isDraft}
                                onDragStart={() => setDraggingFieldKey(binding.fieldKey)}
                                onDragEnd={() => setDraggingFieldKey(null)}
                              >
                                <div className="text-sm font-medium text-foreground">{binding.aliasLabel || binding.fieldSnapshot.label}</div>
                                <div className="mt-1 font-mono text-[11px] text-muted-foreground">{binding.fieldKey}</div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-white p-4">
                        <div className="text-sm font-semibold text-foreground">编排说明</div>
                        <div className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                          <div>1. 先新增或整理分组，再把字段拖进分组。</div>
                          <div>2. 卡片内直接切换“三个/行、两个/行、整行”。</div>
                          <div>3. 条件显隐仍按字段 key 配置，预览会实时反映效果。</div>
                          <div>4. 环境推荐字段未启用时不会参与页面布局和预览显示。</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              )}

              <div className="mt-4 rounded-lg border border-border">
                <div className="border-b border-border px-3 py-2 text-sm font-semibold text-foreground">实时预览</div>
                <div className="space-y-4 p-4">
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    这里按当前版本的分组、顺序、整行/半宽和显示条件渲染，样式尽量贴近实际发起表单。你可以修改下方预览驱动值，观察条件显隐效果。
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {previewBindings
                      .filter(binding => binding.fieldSnapshot.type === 'select' || binding.fieldSnapshot.type === 'boolean' || binding.fieldSnapshot.type === 'text')
                      .slice(0, 6)
                      .map(binding => (
                        <label key={`preview-driver-${binding.id}`} className="grid gap-1.5">
                          <span className="text-xs font-medium text-muted-foreground">{binding.aliasLabel || binding.fieldSnapshot.label}</span>
                          {binding.fieldSnapshot.type === 'select' && binding.fieldSnapshot.options ? (
                            <select
                              value={previewValues[binding.fieldKey] ?? ''}
                              onChange={event => handlePreviewValueChange(binding.fieldKey, event.target.value)}
                              className="h-9 rounded-md border border-border bg-white px-3 text-sm"
                              disabled={isRecommendedEnvironmentField(binding.fieldKey) && recommendedFieldConfigs.find(item => getRecommendedFieldDefinition(item.key)?.fieldKey === binding.fieldKey)?.allowOverride === false}
                            >
                              <option value="">请选择</option>
                              {binding.fieldSnapshot.options.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : binding.fieldSnapshot.type === 'boolean' ? (
                            <select
                              value={previewValues[binding.fieldKey] ?? 'false'}
                              onChange={event => handlePreviewValueChange(binding.fieldKey, event.target.value)}
                              className="h-9 rounded-md border border-border bg-white px-3 text-sm"
                              disabled={isRecommendedEnvironmentField(binding.fieldKey) && recommendedFieldConfigs.find(item => getRecommendedFieldDefinition(item.key)?.fieldKey === binding.fieldKey)?.allowOverride === false}
                            >
                              <option value="false">否</option>
                              <option value="true">是</option>
                            </select>
                          ) : (
                            <input
                              value={previewValues[binding.fieldKey] ?? ''}
                              onChange={event => handlePreviewValueChange(binding.fieldKey, event.target.value)}
                              className="h-9 rounded-md border border-border bg-white px-3 text-sm"
                              placeholder="输入预览值"
                              disabled={isRecommendedEnvironmentField(binding.fieldKey) && recommendedFieldConfigs.find(item => getRecommendedFieldDefinition(item.key)?.fieldKey === binding.fieldKey)?.allowOverride === false}
                            />
                          )}
                        </label>
                      ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                    <span>{environmentConfigDraft.hintText || DEFAULT_ENVIRONMENT_HINT}</span>
                    <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                      <CircleHelp className="h-3.5 w-3.5" />
                      <span>系统会结合所选环境推荐节点、CPU、内存、磁盘和安全等级等配置，手动调整后会保留。</span>
                    </div>
                  </div>

                  <div className="space-y-5 rounded-xl bg-slate-50 p-4">
                    {previewLayout.sections.map(section => (
                      <PreviewSection
                        key={`preview-${section.id}`}
                        section={section}
                        previewBindings={previewBindings}
                        previewValues={previewValues}
                        hiddenFieldKeys={hiddenPreviewFieldKeys}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>

      <Dialog open={fieldEditorOpen} onOpenChange={setFieldEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新增字段</DialogTitle>
            <DialogDescription>
              直接新增字段并写入字段字典，保存后会自动绑定到当前模板。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">字段名称</span>
                <input
                  value={fieldEditorForm.label}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => handleTemplateFieldFormChange('label', event.target.value)}
                  className="h-10 rounded-md border border-border bg-white px-3 text-sm"
                  placeholder="例如：应用英文名"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">字段 Key</span>
                <input
                  value={fieldEditorForm.key}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => handleTemplateFieldFormChange('key', event.target.value)}
                  className="h-10 rounded-md border border-border bg-white px-3 text-sm font-mono"
                  placeholder="例如：app_name"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">字段类型</span>
                <select
                  value={fieldEditorForm.type}
                  onChange={event => handleTemplateFieldFormChange('type', event.target.value as TemplateFieldEditorForm['type'])}
                  className="h-10 rounded-md border border-border bg-white px-3 text-sm"
                >
                  {['text', 'select', 'integer', 'boolean', 'textarea'].map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">字段分类</span>
                <input
                  value={fieldEditorForm.category}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => handleTemplateFieldFormChange('category', event.target.value)}
                  className="h-10 rounded-md border border-border bg-white px-3 text-sm"
                  placeholder="例如：基础信息"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={fieldEditorForm.required}
                onChange={event => handleTemplateFieldFormChange('required', event.target.checked)}
              />
              设为必填字段
            </label>
            {(fieldEditorForm.type === 'text' || fieldEditorForm.type === 'textarea') && (
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">占位提示</span>
                <input
                  value={fieldEditorForm.placeholder}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => handleTemplateFieldFormChange('placeholder', event.target.value)}
                  className="h-10 rounded-md border border-border bg-white px-3 text-sm"
                  placeholder="例如：请输入应用英文名"
                />
              </label>
            )}
            {fieldEditorForm.type === 'select' && (
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">选项配置</span>
                <textarea
                  value={fieldEditorForm.optionsText}
                  onChange={event => handleTemplateFieldFormChange('optionsText', event.target.value)}
                  className="min-h-[96px] rounded-md border border-border bg-white px-3 py-2 text-sm"
                  placeholder={'按行填写，格式：显示名:值\n例如：生产:PROD'}
                />
              </label>
            )}
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">默认值</span>
              <input
                value={fieldEditorForm.defaultValue}
                onChange={(event: ChangeEvent<HTMLInputElement>) => handleTemplateFieldFormChange('defaultValue', event.target.value)}
                className="h-10 rounded-md border border-border bg-white px-3 text-sm"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">字段说明</span>
              <textarea
                value={fieldEditorForm.description}
                onChange={event => handleTemplateFieldFormChange('description', event.target.value)}
                className="min-h-[88px] rounded-md border border-border bg-white px-3 py-2 text-sm"
                placeholder="说明该字段的用途，可选"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setFieldEditorOpen(false);
              resetFieldEditorForm();
            }}>
              取消
            </Button>
            <Button onClick={handleSaveCustomField} disabled={!isDraft}>
              <Save className="mr-1 h-4 w-4" /> 保存字段
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={fieldDialogState.open} onOpenChange={open => {
        if (!open) setFieldDialogState(EMPTY_TEMPLATE_FIELD_DIALOG_STATE);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{fieldDialogState.title}</DialogTitle>
            <DialogDescription>{fieldDialogState.description}</DialogDescription>
          </DialogHeader>
          {fieldDialogState.candidates && fieldDialogState.candidates.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/20">
              <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">接近字段候选</div>
              <div className="divide-y divide-border">
                {fieldDialogState.candidates.map(candidate => (
                  <div key={`${candidate.key}-${candidate.label}`} className="px-3 py-2 text-sm">
                    <div className="font-medium text-foreground">{candidate.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground font-mono">{candidate.key}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{candidate.category}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFieldDialogState(EMPTY_TEMPLATE_FIELD_DIALOG_STATE)}>
              关闭
            </Button>
            {fieldDialogState.onConfirm && (
              <Button onClick={fieldDialogState.onConfirm}>
                {fieldDialogState.confirmLabel ?? '确认'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function StatCard({ title, value, hint }: { title: string; value: number; hint: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="mt-1 text-2xl font-bold text-foreground">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 ${mono ? 'font-mono text-xs' : 'text-sm'} text-foreground`}>{value}</div>
    </div>
  );
}

function InfoChip({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`mt-1 ${mono ? 'font-mono text-xs' : 'text-sm'} text-foreground`}>{value}</div>
    </div>
  );
}
