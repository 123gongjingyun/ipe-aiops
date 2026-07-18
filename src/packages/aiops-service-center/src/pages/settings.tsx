import { Suspense, lazy } from 'react';
import { Database, Download, KeyRound, Palette, Pencil, Plus, RotateCcw, Save, Settings2, ShieldCheck, Trash2, Upload, Users, Workflow, X } from 'lucide-react';
import {
  addConfigProfileGroup,
  Badge,
  Button,
  Card,
  CardContent,
  DOMAIN_META,
  DEFAULT_PRICING_CONFIG,
  DEFAULT_SUPPORT_WIDGET,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  FieldDictionaryEntry,
  RoleDefinition,
  getAssetFieldSchema,
  getDeliveredAssets,
  getResolvedSpecSchemaFields,
  getSchemaTemplateVersion,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  formatPriceRange,
  addFieldDictionaryEntry,
  deleteFieldDictionaryEntry,
  deleteConfigProfileGroup,
  loadSupportWidgetConfig,
  resetFieldDictionaryEntries,
  loadPricingConfig,
  saveSupportWidgetConfig,
  savePricingConfig,
  useAtomicSpecs,
  useComboSpecs,
  useFieldDictionary,
  useOrders,
  useRoleDefinitions,
  useSchemaTemplateConfigProfileBindings,
  updateFieldDictionaryEntry,
  useConfigProfileGroups,
  updateConfigProfileGroup,
  resetConfigProfileGroups,
  updateRoleDefinition,
  resetRoleDefinitions,
} from '@aiops/shared';
import type { ServiceConfigProfile } from '@aiops/shared';
import { useSearchParams } from 'react-router-dom';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '../components/page-header';
import { DEFAULT_PLATFORM_BRANDING, loadPlatformBranding, savePlatformBranding } from '../lib/platform-branding';
import { downloadStyledExcel } from '../lib/export-table';
const SchemaTemplatesPage = lazy(() => import('./service-catalog/templates'));

const TABS = [
  { key: 'appearance', label: '平台外观', icon: Palette },
  { key: 'fields', label: '字段字典', icon: Database },
  { key: 'templates', label: '表单模板', icon: Workflow },
  { key: 'config-profiles', label: '套餐与定价', icon: Settings2 },
  { key: 'roles', label: '角色与用户', icon: Users },
  { key: 'approval', label: '审批流程', icon: ShieldCheck },
  { key: 'security', label: '账号与安全', icon: KeyRound },
] as const;

const PACKAGE_SUB_TABS = [
  { key: 'packages', label: '套餐管理', description: '维护套餐分类与环境套餐明细' },
  { key: 'pricing', label: '定价管理', description: '维护价格区间、计价口径与成本系数' },
] as const;

const APPROVAL_STAGES = [
  { name: '部门负责人', desc: '确认业务必要性与优先级', sla: '4h', role: '评审人' },
  { name: '架构师', desc: '评估资源方案、技术路径与标准模板', sla: '8h', role: '交付工程师' },
  { name: '安全审批', desc: '检查公网、账号、数据与合规风险', sla: '8h', role: '安全管理员' },
] as const;

const FIELD_PAGE_SIZE_OPTIONS = [3, 5, 10, 20];
const FIELD_DICTIONARY_TYPES: FieldDictionaryEntry['type'][] = ['text', 'select', 'integer', 'boolean', 'textarea'];
const FIELD_SUB_TABS = [
  { key: 'dictionary', label: '字段字典', description: '标准字段治理与绑定入口' },
  { key: 'impact', label: '影响分析', description: '字段调整前的历史影响评估' },
  { key: 'catalog', label: '字段总表', description: '全量字段盘点与导出' },
] as const;
const APPEARANCE_SUB_TABS = [
  { key: 'branding', label: '平台标识', description: '名称、Logo 与 favicon' },
  { key: 'support', label: '咨询入口', description: 'Portal 浮动入口与联系配置' },
] as const;

type FieldEditorForm = {
  id?: string;
  key: string;
  label: string;
  type: FieldDictionaryEntry['type'];
  required: boolean;
  category: string;
  description: string;
  sourceScope: FieldDictionaryEntry['sourceScope'];
  status: FieldDictionaryEntry['status'];
  placeholder: string;
  defaultValue: string;
  optionsText: string;
};

type ConfigPackageGroupForm = {
  key: string;
  title: string;
  specIds: string[];
};

type ConfigPackageDialogState = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm?: () => void;
};

const EMPTY_FIELD_FORM: FieldEditorForm = {
  key: '',
  label: '',
  type: 'text',
  required: false,
  category: '基础信息',
  description: '',
  sourceScope: 'input',
  status: 'active',
  placeholder: '',
  defaultValue: '',
  optionsText: '',
};

const EMPTY_CONFIG_PACKAGE_GROUP_FORM: ConfigPackageGroupForm = {
  key: '',
  title: '',
  specIds: [],
};

const EMPTY_CONFIG_PACKAGE_DIALOG_STATE: ConfigPackageDialogState = {
  open: false,
  title: '',
  description: '',
};

function TabPanelFallback({ title }: { title: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="animate-pulse space-y-4">
          <div className="space-y-2">
            <div className="h-5 w-36 rounded bg-slate-200" />
            <div className="h-4 w-72 rounded bg-slate-100" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="h-28 rounded-xl bg-slate-100" />
            <div className="h-28 rounded-xl bg-slate-100" />
          </div>
          <div className="text-xs text-slate-500">{title}加载中...</div>
        </div>
      </CardContent>
    </Card>
  );
}

function buildEmptyConfigProfile(groupKey: string): ServiceConfigProfile {
  return {
    id: `cfg:${groupKey}:${Date.now()}`,
    env: 'DEV',
    name: '',
    nodes: '',
    cpu: '',
    memory: '',
    disk: '',
    details: {},
    description: '',
    updatedAt: new Date().toISOString(),
  };
}

function categorizeField(key: string, label: string) {
  const text = `${key} ${label}`.toLowerCase();
  if (text.includes('cpu') || text.includes('memory') || text.includes('disk') || text.includes('spec') || text.includes('count')) return '资源规格';
  if (text.includes('deadline') || text.includes('urgency') || text.includes('time')) return '时效要求';
  if (text.includes('network') || text.includes('ip') || text.includes('port') || text.includes('security')) return '网络与安全';
  if (text.includes('purpose') || text.includes('description') || text.includes('name')) return '基础信息';
  return '业务属性';
}

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const atomicSpecs = useAtomicSpecs();
  const comboSpecs = useComboSpecs();
  const dictionaryEntries = useFieldDictionary();
  const configProfileGroups = useConfigProfileGroups();
  const templateConfigBindings = useSchemaTemplateConfigProfileBindings();
  const roleDefinitions = useRoleDefinitions();
  const { allOrders } = useOrders();
  const requestedTab = searchParams.get('tab');
  const normalizedTab = requestedTab === 'pricing' ? 'config-profiles' : requestedTab;
  const activeTab = TABS.find(tab => tab.key === normalizedTab)?.key ?? 'fields';
  const activeAppearanceSubTab = APPEARANCE_SUB_TABS.find(tab => tab.key === searchParams.get('section'))?.key ?? 'branding';
  const activeFieldSubTab = FIELD_SUB_TABS.find(tab => tab.key === searchParams.get('view'))?.key ?? 'dictionary';
  const activePackageSubTab = PACKAGE_SUB_TABS.find(tab => tab.key === searchParams.get('scope'))?.key
    ?? 'packages';
  const shouldPrepareFieldCandidates = activeTab === 'fields' && activeFieldSubTab === 'dictionary';
  const shouldPrepareImpactSummary = activeTab === 'fields' && activeFieldSubTab === 'impact';
  const shouldPrepareFieldCatalog = activeTab === 'fields' && activeFieldSubTab === 'catalog';
  const [fieldSearch, setFieldSearch] = useState('');
  const [fieldTypeFilter, setFieldTypeFilter] = useState('all');
  const [fieldCategoryFilter, setFieldCategoryFilter] = useState('all');
  const [fieldPage, setFieldPage] = useState(1);
  const [fieldPageSize, setFieldPageSize] = useState(5);
  const [fieldJumpPage, setFieldJumpPage] = useState('');
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogPageSize, setCatalogPageSize] = useState(10);
  const [catalogJumpPage, setCatalogJumpPage] = useState('');
  const [configProfilePage, setConfigProfilePage] = useState(1);
  const [configProfilePageSize, setConfigProfilePageSize] = useState(3);
  const [configProfileJumpPage, setConfigProfileJumpPage] = useState('');
  const [configPackageGroupDialogOpen, setConfigPackageGroupDialogOpen] = useState(false);
  const [configPackageGroupForm, setConfigPackageGroupForm] = useState<ConfigPackageGroupForm>(EMPTY_CONFIG_PACKAGE_GROUP_FORM);
  const [configPackageDialogState, setConfigPackageDialogState] = useState<ConfigPackageDialogState>(EMPTY_CONFIG_PACKAGE_DIALOG_STATE);
  const [editingConfigPackageGroupKey, setEditingConfigPackageGroupKey] = useState<string | null>(null);
  const [editingConfigProfileId, setEditingConfigProfileId] = useState<string | null>(null);
  const [configProfileDraft, setConfigProfileDraft] = useState<{ groupKey: string; profile: ServiceConfigProfile } | null>(null);
  const [configProfileSaveState, setConfigProfileSaveState] = useState<'idle' | 'saved'>('idle');
  const [roleSearch, setRoleSearch] = useState('');
  const [fieldForm, setFieldForm] = useState<FieldEditorForm>(EMPTY_FIELD_FORM);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fieldEditorOpen, setFieldEditorOpen] = useState(false);
  const [fieldCandidatesOpen, setFieldCandidatesOpen] = useState(false);
  const [assetPreviewOpen, setAssetPreviewOpen] = useState(false);
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [branding, setBranding] = useState(DEFAULT_PLATFORM_BRANDING);
  const [pricingConfig, setPricingConfig] = useState(DEFAULT_PRICING_CONFIG);
  const [supportWidget, setSupportWidget] = useState(DEFAULT_SUPPORT_WIDGET);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const supportQrInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBranding(loadPlatformBranding());
    setPricingConfig(loadPricingConfig());
    setSupportWidget(loadSupportWidgetConfig());
  }, []);

  const beginEditConfigProfile = (groupKey: string, profile: ServiceConfigProfile) => {
    setEditingConfigProfileId(profile.id);
    setConfigProfileDraft({
      groupKey,
      profile: {
        ...profile,
        details: { ...(profile.details ?? {}) },
      },
    });
  };

  const cancelEditConfigProfile = () => {
    setEditingConfigProfileId(null);
    setConfigProfileDraft(null);
  };

  const updateConfigProfileDraft = (patch: Partial<ServiceConfigProfile>) => {
    setConfigProfileDraft(current => (
      current
        ? {
            ...current,
            profile: {
              ...current.profile,
              ...patch,
              details: patch.details ? { ...patch.details } : { ...(current.profile.details ?? {}) },
            },
          }
        : current
    ));
  };

  const saveEditedConfigProfile = () => {
    if (!configProfileDraft) return;
    const targetGroup = configProfileGroups.find(group => group.key === configProfileDraft.groupKey);
    if (!targetGroup) return;
    updateConfigProfileGroup(targetGroup.key, {
      profiles: targetGroup.profiles.map(item => (
        item.id === configProfileDraft.profile.id
          ? { ...configProfileDraft.profile, updatedAt: new Date().toISOString() }
          : item
      )),
    });
    setConfigProfileSaveState('saved');
    window.setTimeout(() => {
      setConfigProfileSaveState(current => (current === 'saved' ? 'idle' : current));
    }, 2000);
    cancelEditConfigProfile();
  };

  const fieldCandidates = useMemo(() => {
    if (!shouldPrepareFieldCandidates) return [];

    const registry = new Map<string, {
      key: string;
      label: string;
      type: string;
      count: number;
      specs: Set<string>;
      scopes: Set<FieldDictionaryEntry['sourceScope']>;
      conflict: boolean;
    }>();

    const collect = (serviceName: string, fields: FieldDictionaryEntry[], scope: FieldDictionaryEntry['sourceScope']) => {
      fields.forEach(field => {
        const current = registry.get(field.key) ?? {
          key: field.key,
          label: field.label,
          type: field.type,
          count: 0,
          specs: new Set<string>(),
          scopes: new Set<FieldDictionaryEntry['sourceScope']>(),
          conflict: false,
        };
        if (current.type !== field.type) current.conflict = true;
        current.count += 1;
        current.specs.add(serviceName);
        current.scopes.add(scope);
        registry.set(field.key, current);
      });
    };

    atomicSpecs.forEach(spec => {
      collect(spec.name, getResolvedSpecSchemaFields(spec, 'input') as FieldDictionaryEntry[], 'input');
      collect(spec.name, getResolvedSpecSchemaFields(spec, 'output') as FieldDictionaryEntry[], 'output');
    });
    comboSpecs.forEach(spec => {
      collect(spec.name, getResolvedSpecSchemaFields(spec, 'input') as FieldDictionaryEntry[], 'input');
      collect(spec.name, getResolvedSpecSchemaFields(spec, 'output') as FieldDictionaryEntry[], 'output');
    });

    return Array.from(registry.values())
      .filter(item => !dictionaryEntries.some(entry => entry.key === item.key))
      .map(item => ({
        ...item,
        category: categorizeField(item.key, item.label),
        specs: Array.from(item.specs),
        sourceScope: item.scopes.has('input') && item.scopes.has('output')
          ? 'both'
          : item.scopes.has('output')
            ? 'output'
            : 'input',
      }))
      .sort((a, b) => b.count - a.count);
  }, [atomicSpecs, comboSpecs, dictionaryEntries, shouldPrepareFieldCandidates]);
  const dictionaryCategories = useMemo(() => Array.from(new Set(dictionaryEntries.map(item => item.category))).sort((a, b) => a.localeCompare(b, 'zh-CN')), [dictionaryEntries]);
  const filteredDictionaryEntries = useMemo(() => {
    return dictionaryEntries.filter(item => {
      const textMatch =
        fieldSearch.trim().length === 0 ||
        `${item.label} ${item.key} ${item.description ?? ''}`.toLowerCase().includes(fieldSearch.trim().toLowerCase());
      const typeMatch = fieldTypeFilter === 'all' || item.type === fieldTypeFilter;
      const categoryMatch = fieldCategoryFilter === 'all' || item.category === fieldCategoryFilter;
      return textMatch && typeMatch && categoryMatch;
    });
  }, [dictionaryEntries, fieldCategoryFilter, fieldSearch, fieldTypeFilter]);
  const filteredFieldCandidates = useMemo(() => {
    return fieldCandidates.filter(item => {
      const typeMatch = fieldTypeFilter === 'all' || item.type === fieldTypeFilter;
      const categoryMatch = fieldCategoryFilter === 'all' || item.category === fieldCategoryFilter;
      return typeMatch && categoryMatch;
    });
  }, [fieldCandidates, fieldTypeFilter, fieldCategoryFilter]);
  const schemaImpactSummary = useMemo(() => {
    if (!shouldPrepareImpactSummary) {
      return {
        impactedOrders: [],
        driftAssets: [],
        driftReasons: {},
        latestTemplateVersions: [],
      };
    }

    const specs = [...atomicSpecs, ...comboSpecs];
    const assets = getDeliveredAssets();
    const impactedOrders = allOrders.filter(order => {
      const spec = specs.find(item => item.id === (order.sourceSpecId || order.comboId));
      const currentInputVersion = spec?.inputTemplateVersionId || spec?.version;
      return Boolean(order.formSchemaVersion && currentInputVersion && order.formSchemaVersion !== currentInputVersion);
    });
    const driftAssets = assets.filter(asset => asset.schemaDrift?.hasDrift);
    const driftReasons = driftAssets.reduce<Record<string, number>>((acc, asset) => {
      const key = asset.schemaDrift?.reason || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const latestTemplateVersions = specs
      .map(spec => ({
        specId: spec.id,
        specName: spec.name,
        inputVersionLabel: spec.inputTemplateVersionId ? getSchemaTemplateVersion(spec.inputTemplateVersionId)?.version || spec.inputTemplateVersionId : spec.version,
        outputVersionLabel: spec.outputTemplateVersionId ? getSchemaTemplateVersion(spec.outputTemplateVersionId)?.version || spec.outputTemplateVersionId : spec.version,
      }))
      .slice(0, 6);

    return { impactedOrders, driftAssets, driftReasons, latestTemplateVersions };
  }, [allOrders, atomicSpecs, comboSpecs, shouldPrepareImpactSummary]);
  const domainFieldExports = useMemo(() => {
    if (!shouldPrepareFieldCatalog) return [];

    const keyUsage = new Map<string, Set<string>>();
    atomicSpecs.forEach(spec => {
      const resolvedFields = getResolvedSpecSchemaFields(spec, 'input');
      resolvedFields.forEach(field => {
        const set = keyUsage.get(field.key) ?? new Set<string>();
        set.add(spec.name);
        keyUsage.set(field.key, set);
      });
    });

    return atomicSpecs.map(spec => {
      const resolvedFields = getResolvedSpecSchemaFields(spec, 'input');
      return {
        domain: spec.domain,
        domainLabel: DOMAIN_META[spec.domain]?.name || spec.domain,
        serviceName: spec.name,
        templateVersion: spec.inputTemplateVersionId ? getSchemaTemplateVersion(spec.inputTemplateVersionId)?.version || spec.inputTemplateVersionId : spec.version,
        fields: resolvedFields.map(field => {
          const dictionaryEntry = dictionaryEntries.find(entry => entry.key === field.key);
          return {
            ...field,
            sourceScope: dictionaryEntry?.sourceScope || 'input',
            category: dictionaryEntry?.category || categorizeField(field.key, field.label),
            reusedBy: keyUsage.get(field.key)?.size || 1,
          };
        }),
      };
    });
  }, [atomicSpecs, dictionaryEntries, shouldPrepareFieldCatalog]);
  const previewAsset = useMemo(
    () => schemaImpactSummary.driftAssets.find(asset => asset.id === previewAssetId),
    [previewAssetId, schemaImpactSummary.driftAssets],
  );
  const previewAssetFields = useMemo(
    () => (previewAsset ? getAssetFieldSchema(previewAsset.category) : []),
    [previewAsset],
  );
  const fieldTotalPages = Math.max(1, Math.ceil(filteredDictionaryEntries.length / fieldPageSize));
  const fieldCurrentPage = Math.min(fieldPage, fieldTotalPages);
  const pagedDictionaryEntries = filteredDictionaryEntries.slice((fieldCurrentPage - 1) * fieldPageSize, fieldCurrentPage * fieldPageSize);
  const catalogTotalPages = Math.max(1, Math.ceil(domainFieldExports.length / catalogPageSize));
  const catalogCurrentPage = Math.min(catalogPage, catalogTotalPages);
  const pagedDomainFieldExports = domainFieldExports.slice((catalogCurrentPage - 1) * catalogPageSize, catalogCurrentPage * catalogPageSize);
  const filteredRoles = useMemo(() => {
    const keyword = roleSearch.trim().toLowerCase();
    return roleDefinitions.filter(role => {
      if (!keyword) return true;
      return `${role.name} ${role.summary} ${role.perms.join(' ')} ${role.members.map(member => `${member.name} ${member.account}`).join(' ')}`
        .toLowerCase()
        .includes(keyword);
    });
  }, [roleDefinitions, roleSearch]);
  const configPackageTotalPages = Math.max(1, Math.ceil(configProfileGroups.length / configProfilePageSize));
  const configPackageCurrentPage = Math.min(configProfilePage, configPackageTotalPages);
  const pagedConfigProfileGroups = configProfileGroups.slice(
    (configPackageCurrentPage - 1) * configProfilePageSize,
    configPackageCurrentPage * configProfilePageSize,
  );

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    if (value !== 'fields') next.delete('view');
    if (value === 'fields' && !next.get('view')) next.set('view', 'dictionary');
    if (value !== 'appearance') next.delete('section');
    if (value === 'appearance' && !next.get('section')) next.set('section', 'branding');
    if (value !== 'config-profiles') next.delete('scope');
    if (value === 'config-profiles') next.set('scope', 'packages');
    setSearchParams(next, { replace: true });
  };

  const handleAppearanceSubTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'appearance');
    next.set('section', value);
    setSearchParams(next, { replace: true });
  };

  const handleFieldSubTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'fields');
    next.set('view', value);
    setSearchParams(next, { replace: true });
  };

  const handlePackageSubTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'config-profiles');
    next.set('scope', value);
    setSearchParams(next, { replace: true });
  };

  const persistBranding = (next: typeof branding) => {
    setBranding(next);
    savePlatformBranding(next);
  };

  const persistPricingConfig = (next: typeof pricingConfig) => {
    setPricingConfig(next);
    savePricingConfig(next);
  };

  const persistSupportWidget = (next: typeof supportWidget) => {
    setSupportWidget(next);
    saveSupportWidgetConfig(next);
  };

  const resetConfigPackageGroupForm = () => {
    setConfigPackageGroupForm(EMPTY_CONFIG_PACKAGE_GROUP_FORM);
  };

  const openCreateConfigPackageGroupDialog = () => {
    resetConfigPackageGroupForm();
    setEditingConfigPackageGroupKey(null);
    setConfigPackageGroupDialogOpen(true);
  };

  const openEditConfigPackageGroupDialog = (groupKey: string) => {
    const targetGroup = configProfileGroups.find(group => group.key === groupKey);
    if (!targetGroup) return;
    setEditingConfigPackageGroupKey(groupKey);
    setConfigPackageGroupForm({
      key: targetGroup.key,
      title: targetGroup.title,
      specIds: [...targetGroup.specIds],
    });
    setConfigPackageGroupDialogOpen(true);
  };

  const submitConfigPackageGroupForm = () => {
    const normalizedKey = configPackageGroupForm.key.trim().toLowerCase().replace(/\s+/g, '-');
    const normalizedTitle = configPackageGroupForm.title.trim();
    if (!normalizedKey || !normalizedTitle) return;
    if (editingConfigPackageGroupKey) {
      updateConfigProfileGroup(editingConfigPackageGroupKey, {
        title: normalizedTitle,
        specIds: [...configPackageGroupForm.specIds],
      });
      setConfigPackageGroupDialogOpen(false);
      setEditingConfigPackageGroupKey(null);
      resetConfigPackageGroupForm();
      return;
    }
    const created = addConfigProfileGroup({
      key: normalizedKey,
      title: normalizedTitle,
      specIds: [...configPackageGroupForm.specIds],
      profiles: [],
    });
    if (!created) return;
    setConfigProfilePage(configPackageTotalPages);
    setConfigPackageGroupDialogOpen(false);
    resetConfigPackageGroupForm();
  };

  const getBoundTemplateNamesByGroupKey = (groupKey: string) => {
    return templateConfigBindings
      .filter(binding => binding.groupKeys.includes(groupKey))
      .map(binding => {
        const atomicTemplate = atomicSpecs.find(spec => spec.inputTemplateId === binding.templateId || spec.outputTemplateId === binding.templateId);
        const comboTemplate = comboSpecs.find(spec => spec.inputTemplateId === binding.templateId || spec.outputTemplateId === binding.templateId);
        return atomicTemplate?.name ?? comboTemplate?.name ?? binding.templateId;
      });
  };

  const promptDeleteConfigPackageGroup = (groupKey: string, groupTitle: string) => {
    const boundTemplateNames = getBoundTemplateNamesByGroupKey(groupKey);
    if (boundTemplateNames.length > 0) {
      setConfigPackageDialogState({
        open: true,
        title: '当前分类已被模板绑定',
        description: `套餐分类“${groupTitle}”已被以下模板绑定：${boundTemplateNames.join('、')}。请先解除模板绑定后再删除分类。`,
      });
      return;
    }
    setConfigPackageDialogState({
      open: true,
      title: '确认删除套餐分类',
      description: `确认删除套餐分类“${groupTitle}”吗？删除后该分类下套餐明细会一并移除。`,
      confirmLabel: '确认删除',
      onConfirm: () => {
        deleteConfigProfileGroup(groupKey);
        setConfigPackageDialogState(EMPTY_CONFIG_PACKAGE_DIALOG_STATE);
      },
    });
  };

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    persistBranding({ ...branding, logoDataUrl: dataUrl });
    event.target.value = '';
  };

  const handleLogoDownload = () => {
    if (!branding.logoDataUrl) return;
    const link = document.createElement('a');
    link.href = branding.logoDataUrl;
    link.download = `${branding.platformShortName || 'platform-logo'}.png`;
    link.click();
  };

  const resetFieldForm = () => {
    setFieldForm(EMPTY_FIELD_FORM);
    setEditingFieldId(null);
  };

  const openCreateFieldDialog = () => {
    resetFieldForm();
    setFieldEditorOpen(true);
  };

  const openAssetPreview = (assetId: string) => {
    setPreviewAssetId(assetId);
    setAssetPreviewOpen(true);
  };

  const exportSchemaImpactReport = () => {
    downloadStyledExcel({
      title: '字段调整影响清单',
      filename: `字段调整影响清单_${new Date().toLocaleDateString('zh-CN')}.xls`,
      note: '导出范围：字段调整辅助分析区识别出的旧表单版本工单与资产口径差异记录。仅供评估与核对，不代表已执行重建。',
      headers: ['序号', '类型', '工单/服务', '对象名称', '当前状态', '版本或差异原因', '补充说明'],
      rows: [
        ...schemaImpactSummary.impactedOrders.map((order, index) => [
          index + 1,
          '工单',
          order.id,
          order.comboName,
          order.status,
          order.formSchemaVersion || '-',
          '工单仍绑定历史 input 模板版本',
        ]),
        ...schemaImpactSummary.driftAssets.map((asset, index) => [
          schemaImpactSummary.impactedOrders.length + index + 1,
          '资产',
          asset.orderId,
          `${asset.assetName} / ${asset.serviceName}`,
          asset.categoryLabel,
          asset.schemaDrift?.reason || '-',
          `表单版本 ${asset.formSchemaVersion || '-'} / 输出模板 ${asset.sourceTemplateVersionId || '-'}`,
        ]),
      ],
    });
  };

  const exportDomainFieldCatalog = (domain?: string) => {
    const records = domain
      ? domainFieldExports.filter(item => item.domain === domain)
      : domainFieldExports;
    const label = domain ? (DOMAIN_META[domain]?.name || domain) : '全部领域';
    const detailRows = records.flatMap(item =>
      item.fields.map((field, index) => [
        index + 1,
        item.domainLabel,
        item.serviceName,
        item.templateVersion,
        field.label,
        field.key,
        field.type,
        field.sourceScope === 'both' ? '输入/输出' : field.sourceScope === 'output' ? '仅输出' : '仅输入',
        field.category,
        field.reusedBy,
        field.required ? '是' : '否',
        field.defaultValue == null ? '' : String(field.defaultValue),
        field.placeholder || '',
      ]),
    );
    const summaryRows = records.map((item, index) => [
      index + 1,
      item.domainLabel,
      item.serviceName,
      item.templateVersion,
      item.fields.length,
      item.fields.map(field => field.label).slice(0, 6).join('、'),
    ]);
    downloadStyledExcel({
      title: `${label}表单字段清单`,
      filename: `表单字段清单_${label}_${new Date().toLocaleDateString('zh-CN')}.xls`,
      note: [
        '导出范围：当前服务输入表单字段，用于与生产字段口径逐项对比。',
        '上半部分为全量字段明细；下半部分为按领域分类的服务汇总。',
        '不涉及历史资产重建。',
      ].join(' '),
      headers: ['序号', '领域', '服务名称', '模板版本', '字段标签', '字段Key', '字段类型', '来源范围', '所属分类', '复用服务数', '是否必填', '默认值', '占位提示'],
      rows: [
        ...detailRows,
        [],
        ['--- 按领域分类汇总 ---', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['序号', '领域', '服务名称', '模板版本', '字段数', '字段示例', '', '', '', '', '', '', ''],
        ...summaryRows.map(row => [...row, '', '', '', '', '', '', '']),
      ],
    });
  };

  const startEditField = (entry: FieldDictionaryEntry) => {
    setEditingFieldId(entry.id);
    setFieldForm({
      id: entry.id,
      key: entry.key,
      label: entry.label,
      type: entry.type,
      required: entry.required,
      category: entry.category,
      description: entry.description ?? '',
      sourceScope: entry.sourceScope,
      status: entry.status,
      placeholder: entry.placeholder ?? '',
      defaultValue: entry.defaultValue == null ? '' : String(entry.defaultValue),
      optionsText: (entry.options ?? []).map(option => `${option.label}:${option.value}`).join('\n'),
    });
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

  const buildDictionaryEntry = (): FieldDictionaryEntry | null => {
    if (!fieldForm.key.trim() || !fieldForm.label.trim()) return null;
    return {
      id: editingFieldId ?? `field-${fieldForm.key.trim()}-${Date.now()}`,
      key: fieldForm.key.trim(),
      label: fieldForm.label.trim(),
      type: fieldForm.type,
      required: fieldForm.required,
      category: fieldForm.category.trim() || '基础信息',
      description: fieldForm.description.trim() || undefined,
      sourceScope: fieldForm.sourceScope,
      status: fieldForm.status,
      placeholder:
        fieldForm.type === 'text' || fieldForm.type === 'textarea'
          ? fieldForm.placeholder.trim() || undefined
          : undefined,
      defaultValue: fieldForm.defaultValue.trim() || undefined,
      options: fieldForm.type === 'select' ? parseFieldOptions(fieldForm.optionsText) : undefined,
      createdAt: editingFieldId ? dictionaryEntries.find(entry => entry.id === editingFieldId)?.createdAt ?? new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const submitFieldForm = () => {
    const entry = buildDictionaryEntry();
    if (!entry) return;
    const duplicatedKey = dictionaryEntries.some(item => item.key === entry.key && item.id !== entry.id);
    if (duplicatedKey) {
      window.alert(`字段 key "${entry.key}" 已存在，请修改后再保存。`);
      return;
    }
    if (editingFieldId) {
      updateFieldDictionaryEntry(editingFieldId, entry);
    } else {
      addFieldDictionaryEntry(entry);
    }
    resetFieldForm();
    setFieldEditorOpen(false);
  };

  const importCandidate = (candidate: { key: string; label: string; type: string; category: string }) => {
    addFieldDictionaryEntry({
      id: `field-${candidate.key}-${Date.now()}`,
      key: candidate.key,
      label: candidate.label,
      type: candidate.type as FieldDictionaryEntry['type'],
      required: false,
      category: candidate.category,
      description: `从现有服务输入输出字段提取的高频候选字段`,
      sourceScope: 'input',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const importAllCandidates = () => {
    filteredFieldCandidates.forEach((candidate, index) => {
      addFieldDictionaryEntry({
        id: `field-${candidate.key}-${Date.now()}-${index}`,
        key: candidate.key,
        label: candidate.label,
        type: candidate.type as FieldDictionaryEntry['type'],
        required: false,
        category: candidate.category,
        description: `从现有服务输入输出字段提取的高频候选字段`,
        sourceScope: candidate.sourceScope as FieldDictionaryEntry['sourceScope'],
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
    setFieldCandidatesOpen(false);
  };

  const updateRoleMembers = (roleKey: string, updater: (role: RoleDefinition) => RoleDefinition['members']) => {
    const role = roleDefinitions.find(item => item.key === roleKey);
    if (!role) return;
    updateRoleDefinition(roleKey, { members: updater(role) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => setSearchParams(new URLSearchParams({ tab: 'fields' }), { replace: true })} className="hover:text-foreground hover:underline">返回设置总览</button>
        <span>/</span>
        <span>模块：{TABS.find(tab => tab.key === activeTab)?.label}</span>
      </div>

      <PageHeader
        icon={<Settings2 className="h-5 w-5" />}
        title="设置"
        description="统一维护平台配置与治理项。"
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="grid gap-4 lg:grid-cols-[220px,minmax(0,1fr)]">
        <Card className="h-fit lg:sticky lg:top-24">
          <CardContent className="p-2.5">
            <div className="px-2 pb-2 pt-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">设置模块</div>
            </div>
            <TabsList className="h-auto w-full flex-col items-stretch gap-1 bg-transparent p-0">
              {TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className="w-full justify-start rounded-lg border border-transparent bg-white px-2.5 py-2.5 text-left data-[state=active]:border-primary data-[state=active]:bg-primary/5"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50 text-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{tab.label}</span>
                        <span className="block text-xs text-muted-foreground">
                          {tab.key === 'appearance' && '名称与 Logo 配置'}
                          {tab.key === 'fields' && '标准字段治理'}
                          {tab.key === 'templates' && '表单结构与版本治理'}
                          {tab.key === 'config-profiles' && '套餐管理与价格规则'}
                          {tab.key === 'roles' && '角色与用户分配'}
                          {tab.key === 'approval' && '审批链与节点规则'}
                          {tab.key === 'security' && '密码与认证安全'}
                        </span>
                      </span>
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </CardContent>
        </Card>

        <TabsContent value="appearance">
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">平台外观</h2>
                    <p className="mt-1 text-sm text-muted-foreground">维护品牌标识与入口展示配置。</p>
                  </div>
                  <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                    当前页面：{APPEARANCE_SUB_TABS.find(tab => tab.key === activeAppearanceSubTab)?.label}
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {APPEARANCE_SUB_TABS.map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => handleAppearanceSubTabChange(tab.key)}
                      className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                        activeAppearanceSubTab === tab.key
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border bg-white text-foreground hover:bg-muted/40'
                      }`}
                    >
                      <div className="text-sm font-medium">{tab.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{tab.description}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {activeAppearanceSubTab === 'branding' && (
              <div className="grid gap-4 lg:grid-cols-[1.05fr,0.95fr]">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold text-foreground">平台标识</h2>
                        <p className="mt-1 text-sm text-muted-foreground">用于侧栏品牌区和浏览器页签。</p>
                      </div>
                      <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">即时生效</Badge>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-[220px,1fr]">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-medium text-slate-500">当前预览</div>
                        <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-primary text-sm font-bold text-white">
                            {branding.logoDataUrl ? (
                              <img src={branding.logoDataUrl} alt={branding.platformShortName} className="h-full w-full object-cover" />
                            ) : (
                              branding.platformShortName
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">{branding.platformName}</div>
                            {branding.showSubtitle && <div className="truncate text-xs text-slate-500">{branding.platformSubtitle}</div>}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleLogoUpload} />
                          <Button size="sm" variant="outline" onClick={() => logoInputRef.current?.click()}>
                            <Upload className="mr-1 h-4 w-4" /> 上传 Logo
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleLogoDownload} disabled={!branding.logoDataUrl}>
                            <Download className="mr-1 h-4 w-4" /> 下载 Logo
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => persistBranding({ ...branding, logoDataUrl: null })}>
                            恢复默认
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-3">
                        <label className="grid gap-1.5">
                          <span className="text-sm font-medium text-foreground">平台名称</span>
                          <input
                            value={branding.platformName}
                            onChange={e => persistBranding({ ...branding, platformName: e.target.value })}
                            className="h-10 rounded-md border border-border bg-white px-3 text-sm"
                            placeholder="交付运营中心"
                          />
                        </label>
                        <label className="grid gap-1.5">
                          <span className="text-sm font-medium text-foreground">平台简称</span>
                          <input
                            value={branding.platformShortName}
                            onChange={e => persistBranding({ ...branding, platformShortName: e.target.value.slice(0, 4) })}
                            className="h-10 rounded-md border border-border bg-white px-3 text-sm"
                            placeholder="AI"
                          />
                        </label>
                        <label className="grid gap-1.5">
                          <span className="text-sm font-medium text-foreground">副标题</span>
                          <input
                            value={branding.platformSubtitle}
                            onChange={e => persistBranding({ ...branding, platformSubtitle: e.target.value })}
                            className="h-10 rounded-md border border-border bg-white px-3 text-sm"
                            placeholder="IPE / AIOps"
                          />
                        </label>
                        <label className="grid gap-1.5">
                          <span className="text-sm font-medium text-foreground">浏览器页签标题</span>
                          <input
                            value={branding.browserTitle}
                            onChange={e => persistBranding({ ...branding, browserTitle: e.target.value })}
                            className="h-10 rounded-md border border-border bg-white px-3 text-sm"
                            placeholder="IPE/AIOps 服务运营中心"
                          />
                        </label>
                        <label className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2.5 text-sm">
                          <input
                            type="checkbox"
                            checked={branding.showSubtitle}
                            onChange={e => persistBranding({ ...branding, showSubtitle: e.target.checked })}
                          />
                          左侧导航显示副标题
                        </label>
                        <div className="rounded-lg border border-border bg-white px-3 py-3">
                          <div className="text-sm font-medium text-foreground">favicon</div>
                          <div className="mt-1 text-xs text-muted-foreground">浏览器页签图标。</div>
                          <div className="mt-3 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                              {branding.faviconDataUrl ? (
                                <img src={branding.faviconDataUrl} alt="favicon" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-xs font-semibold text-slate-500">默认</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">
                                <Upload className="h-3.5 w-3.5" />
                                上传 favicon
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon"
                                  className="hidden"
                                  onChange={async e => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const dataUrl = await new Promise<string>((resolve, reject) => {
                                      const reader = new FileReader();
                                      reader.onload = () => resolve(String(reader.result || ''));
                                      reader.onerror = () => reject(reader.error);
                                      reader.readAsDataURL(file);
                                    });
                                    persistBranding({ ...branding, faviconDataUrl: dataUrl });
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                              <Button size="sm" variant="outline" onClick={() => persistBranding({ ...branding, faviconDataUrl: null })}>
                                恢复默认
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold text-foreground">配置规范</h3>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <p>Logo 支持透明背景 PNG 或 SVG。</p>
                      <p>平台简称最多 4 个字符。</p>
                      <p>副标题用于侧栏品牌区展示。</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeAppearanceSubTab === 'support' && (
              <div className="grid gap-4 lg:grid-cols-[1.05fr,0.95fr]">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold text-foreground">咨询入口</h2>
                        <p className="mt-1 text-sm text-muted-foreground">Portal 右下角入口与联系信息。</p>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">Portal 生效</Badge>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <label className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2.5 text-sm">
                        <input
                          type="checkbox"
                          checked={supportWidget.enabled}
                          onChange={e => persistSupportWidget({ ...supportWidget, enabled: e.target.checked })}
                        />
                        启用右下角咨询入口
                      </label>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-1.5">
                          <span className="text-sm font-medium text-foreground">按钮文案</span>
                          <input
                            value={supportWidget.buttonLabel}
                            onChange={e => persistSupportWidget({ ...supportWidget, buttonLabel: e.target.value })}
                            className="h-10 rounded-md border border-border bg-white px-3 text-sm"
                            placeholder="在线咨询"
                          />
                        </label>
                        <label className="grid gap-1.5">
                          <span className="text-sm font-medium text-foreground">主按钮文案</span>
                          <input
                            value={supportWidget.primaryActionLabel}
                            onChange={e => persistSupportWidget({ ...supportWidget, primaryActionLabel: e.target.value })}
                            className="h-10 rounded-md border border-border bg-white px-3 text-sm"
                            placeholder="查看指引"
                          />
                        </label>
                      </div>

                      <label className="grid gap-1.5">
                        <span className="text-sm font-medium text-foreground">面板标题</span>
                        <input
                          value={supportWidget.panelTitle}
                          onChange={e => persistSupportWidget({ ...supportWidget, panelTitle: e.target.value })}
                          className="h-10 rounded-md border border-border bg-white px-3 text-sm"
                          placeholder="在线咨询"
                        />
                      </label>

                      <label className="grid gap-1.5">
                        <span className="text-sm font-medium text-foreground">面板说明</span>
                        <textarea
                          value={supportWidget.panelDescription}
                          onChange={e => persistSupportWidget({ ...supportWidget, panelDescription: e.target.value })}
                          className="min-h-[92px] rounded-md border border-border bg-white px-3 py-2 text-sm"
                          placeholder="填写联系说明"
                        />
                      </label>

                      <label className="grid gap-1.5">
                        <span className="text-sm font-medium text-foreground">主按钮跳转链接</span>
                        <input
                          value={supportWidget.primaryActionHref}
                          onChange={e => persistSupportWidget({ ...supportWidget, primaryActionHref: e.target.value })}
                          className="h-10 rounded-md border border-border bg-white px-3 text-sm"
                          placeholder="/portal/#/help"
                        />
                      </label>

                      <div className="grid gap-3 sm:grid-cols-[180px,1fr]">
                        <label className="grid gap-1.5">
                          <span className="text-sm font-medium text-foreground">联系方式标题</span>
                          <input
                            value={supportWidget.contactLabel}
                            onChange={e => persistSupportWidget({ ...supportWidget, contactLabel: e.target.value })}
                            className="h-10 rounded-md border border-border bg-white px-3 text-sm"
                            placeholder="联系渠道"
                          />
                        </label>
                        <label className="grid gap-1.5">
                          <span className="text-sm font-medium text-foreground">联系方式内容</span>
                          <textarea
                            value={supportWidget.contactValue}
                            onChange={e => persistSupportWidget({ ...supportWidget, contactValue: e.target.value })}
                            className="min-h-[92px] rounded-md border border-border bg-white px-3 py-2 text-sm"
                            placeholder="企业微信 / 平台群 / 服务台电话"
                          />
                        </label>
                      </div>

                      <label className="grid gap-1.5">
                        <span className="text-sm font-medium text-foreground">底部备注</span>
                        <textarea
                          value={supportWidget.footerNote}
                          onChange={e => persistSupportWidget({ ...supportWidget, footerNote: e.target.value })}
                          className="min-h-[82px] rounded-md border border-border bg-white px-3 py-2 text-sm"
                          placeholder="补充说明"
                        />
                      </label>

                      <div className="rounded-lg border border-border bg-white px-3 py-3">
                        <div className="text-sm font-medium text-foreground">联系二维码</div>
                        <div className="mt-1 text-xs text-muted-foreground">用于展示联系入口二维码。</div>
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                            {supportWidget.qrCodeDataUrl ? (
                              <img src={supportWidget.qrCodeDataUrl} alt="support qr" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-xs text-slate-400">未上传</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <input ref={supportQrInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={async e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const dataUrl = await new Promise<string>((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve(String(reader.result || ''));
                                reader.onerror = () => reject(reader.error);
                                reader.readAsDataURL(file);
                              });
                              persistSupportWidget({ ...supportWidget, qrCodeDataUrl: dataUrl });
                              e.target.value = '';
                            }} />
                            <Button size="sm" variant="outline" onClick={() => supportQrInputRef.current?.click()}>
                              <Upload className="mr-1 h-4 w-4" /> 上传二维码
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => persistSupportWidget({ ...supportWidget, qrCodeDataUrl: null })}>
                              清除二维码
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold text-foreground">配置规范</h3>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <p>按钮文案保持简短明确。</p>
                      <p>联系内容统一维护受理渠道与服务时间。</p>
                      <p>主按钮链接指向帮助页或服务台。</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="fields">
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">字段治理</h2>
                    <p className="mt-1 text-sm text-muted-foreground">统一维护标准字段、影响分析与字段总表。</p>
                  </div>
                  <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                    当前页面：{FIELD_SUB_TABS.find(tab => tab.key === activeFieldSubTab)?.label}
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {FIELD_SUB_TABS.map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => handleFieldSubTabChange(tab.key)}
                      className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                        activeFieldSubTab === tab.key
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border bg-white text-foreground hover:bg-muted/40'
                      }`}
                    >
                      <div className="text-sm font-medium">{tab.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{tab.description}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {activeFieldSubTab === 'dictionary' && (
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold text-foreground">字段字典</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        统一维护标准字段，并供服务目录直接引用。
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={openCreateFieldDialog}>
                        <Plus className="mr-1 h-4 w-4" /> 新建字段
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setFieldCandidatesOpen(true)}>
                        <Download className="mr-1 h-4 w-4" /> 候选字段提取
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { resetFieldDictionaryEntries(); resetFieldForm(); }}>
                        <RotateCcw className="mr-1 h-4 w-4" /> 重置种子
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      当前正式字段 {filteredDictionaryEntries.length} 条，待入库候选 {filteredFieldCandidates.length} 条。
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <input
                      value={fieldSearch}
                      onChange={e => { setFieldSearch(e.target.value); setFieldPage(1); }}
                      placeholder="搜索字段标签 / key / 描述"
                      className="h-9 min-w-[220px] flex-1 rounded-md border border-border bg-white px-3 text-sm"
                    />
                    <select
                      value={fieldTypeFilter}
                      onChange={e => { setFieldTypeFilter(e.target.value); setFieldPage(1); }}
                      className="h-9 px-3 text-sm rounded-md border border-border bg-white"
                    >
                      <option value="all">全部类型</option>
                      {FIELD_DICTIONARY_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <select
                      value={fieldCategoryFilter}
                      onChange={e => { setFieldCategoryFilter(e.target.value); setFieldPage(1); }}
                      className="h-9 px-3 text-sm rounded-md border border-border bg-white"
                    >
                      <option value="all">全部分类</option>
                      {dictionaryCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                      <span>共 {filteredDictionaryEntries.length} 条</span>
                      <select
                        value={fieldPageSize}
                        onChange={e => { setFieldPageSize(Number(e.target.value)); setFieldPage(1); }}
                        className="h-9 px-2 text-sm rounded-md border border-border bg-white"
                      >
                        {FIELD_PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg border border-border overflow-x-auto">
                    <Table className="w-max min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">序号</TableHead>
                          <TableHead className="whitespace-nowrap">字段标签</TableHead>
                          <TableHead className="whitespace-nowrap">Key</TableHead>
                          <TableHead className="whitespace-nowrap">类型</TableHead>
                          <TableHead className="whitespace-nowrap">分类</TableHead>
                          <TableHead className="whitespace-nowrap">来源范围</TableHead>
                          <TableHead className="whitespace-nowrap">状态</TableHead>
                          <TableHead className="whitespace-nowrap">说明</TableHead>
                          <TableHead className="whitespace-nowrap text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedDictionaryEntries.map((field, index) => (
                          <TableRow key={field.id}>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground font-mono">
                              {(fieldCurrentPage - 1) * fieldPageSize + index + 1}
                            </TableCell>
                            <TableCell className="whitespace-nowrap font-medium text-sm">{field.label}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground font-mono">{field.key}</TableCell>
                            <TableCell className="whitespace-nowrap"><Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">{field.type}</Badge></TableCell>
                            <TableCell className="whitespace-nowrap text-sm">{field.category}</TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                              {field.sourceScope === 'input' ? '仅输入' : field.sourceScope === 'output' ? '仅输出' : '输入/输出'}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge className={field.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'}>
                                {field.status === 'active' ? '启用' : '草稿'}
                              </Badge>
                            </TableCell>
                            <TableCell className="min-w-[220px] max-w-[360px] text-sm text-muted-foreground">
                              <div className="line-clamp-2">{field.description || '—'}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1 whitespace-nowrap">
                                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => startEditField(field)}>
                                  <Pencil className="mr-1 h-3.5 w-3.5" /> 编辑
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:text-destructive" onClick={() => deleteFieldDictionaryEntry(field.id)}>
                                  <Trash2 className="mr-1 h-3.5 w-3.5" /> 删除
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {pagedDictionaryEntries.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">暂无匹配字段</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {fieldTotalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">第 {fieldCurrentPage} / {fieldTotalPages} 页</span>
                      <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => setFieldPage(p => Math.max(1, p - 1))} disabled={fieldCurrentPage <= 1}>上一页</Button>
                        <input
                          value={fieldJumpPage}
                          onChange={e => setFieldJumpPage(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const next = Number(fieldJumpPage);
                              if (Number.isFinite(next)) setFieldPage(Math.max(1, Math.min(fieldTotalPages, next)));
                              setFieldJumpPage('');
                            }
                          }}
                          placeholder="页码"
                          className="h-8 w-16 rounded-md border border-border bg-white px-2 text-center text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const next = Number(fieldJumpPage);
                            if (Number.isFinite(next)) setFieldPage(Math.max(1, Math.min(fieldTotalPages, next)));
                            setFieldJumpPage('');
                          }}
                        >
                          跳转
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setFieldPage(p => Math.min(fieldTotalPages, p + 1))} disabled={fieldCurrentPage >= fieldTotalPages}>下一页</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeFieldSubTab === 'impact' && (
              <Card className="border-dashed border-slate-200 bg-slate-50/60">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">字段影响分析</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        用于核对字段或模板调整后的工单版本与资产差异。
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        当前展示为只读结果。
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                        待关注 {schemaImpactSummary.impactedOrders.length + schemaImpactSummary.driftAssets.length} 条
                      </Badge>
                      <Button size="sm" variant="outline" onClick={exportSchemaImpactReport}>
                        <Download className="mr-1 h-4 w-4" /> 导出影响清单
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 xl:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs text-muted-foreground">旧表单版本工单</div>
                      <div className="mt-2 text-2xl font-semibold text-foreground">{schemaImpactSummary.impactedOrders.length}</div>
                      <div className="mt-1 text-xs text-muted-foreground">已提交工单仍绑定历史 input 模板</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs text-muted-foreground">资产口径差异</div>
                      <div className="mt-2 text-2xl font-semibold text-foreground">{schemaImpactSummary.driftAssets.length}</div>
                      <div className="mt-1 text-xs text-muted-foreground">归档资产与当前模板/映射存在差异</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs text-muted-foreground">模板版本变更</div>
                      <div className="mt-2 text-2xl font-semibold text-foreground">{schemaImpactSummary.driftReasons['template-version-changed'] || 0}</div>
                      <div className="mt-1 text-xs text-muted-foreground">多为模板升级后遗留记录</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs text-muted-foreground">模板锚点缺失</div>
                      <div className="mt-2 text-2xl font-semibold text-foreground">{schemaImpactSummary.driftReasons['template-missing'] || 0}</div>
                      <div className="mt-1 text-xs text-muted-foreground">这类记录暂时不能自动比对</div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-sm font-medium text-foreground">分析范围</div>
                      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                        <p>1. 识别历史工单与当前输入模板的版本差异。</p>
                        <p>2. 识别归档资产与当前输出模板的字段差异。</p>
                        <p>3. 支持导出后继续评估迁移与修正计划。</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-foreground">优先看这几条</div>
                        {schemaImpactSummary.driftAssets.length > 0 && (
                          <Button size="sm" variant="outline" onClick={() => openAssetPreview(schemaImpactSummary.driftAssets[0].id)}>
                            查看预览
                          </Button>
                        )}
                      </div>
                      <div className="mt-3 space-y-3">
                        {schemaImpactSummary.impactedOrders.slice(0, 3).map(order => (
                          <div key={order.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                            <div className="text-sm font-medium text-foreground">{order.id}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{order.comboName}</div>
                            <div className="mt-1 text-xs text-slate-600">工单表单版本：{order.formSchemaVersion || '-'}</div>
                          </div>
                        ))}
                        {schemaImpactSummary.impactedOrders.length === 0 && schemaImpactSummary.driftAssets.slice(0, 3).map(asset => (
                          <div key={asset.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-medium text-foreground">{asset.orderId}</div>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openAssetPreview(asset.id)}>
                                查看预览
                              </Button>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">{asset.assetName} · {asset.serviceName}</div>
                            <div className="mt-1 text-xs text-slate-600">差异原因：{asset.schemaDrift?.reason}</div>
                          </div>
                        ))}
                        {schemaImpactSummary.impactedOrders.length === 0 && schemaImpactSummary.driftAssets.length === 0 && (
                          <div className="text-sm text-muted-foreground">当前没有识别到需要重点关注的记录。</div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeFieldSubTab === 'catalog' && (
              <Card className="border-dashed border-slate-200 bg-slate-50/60">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">表单字段总表导出</div>
                      <div className="mt-1 text-xs text-muted-foreground">导出当前服务字段总表，包含明细与领域汇总。</div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => exportDomainFieldCatalog()}>
                        <Download className="mr-1 h-4 w-4" /> 导出字段总表
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">共 {domainFieldExports.length} 条服务字段清单记录。</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>每页</span>
                      <select
                        value={catalogPageSize}
                        onChange={e => { setCatalogPageSize(Number(e.target.value)); setCatalogPage(1); }}
                        className="h-9 px-2 text-sm rounded-md border border-border bg-white"
                      >
                        {FIELD_PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg border border-border overflow-x-auto">
                    <Table className="w-max min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">序号</TableHead>
                          <TableHead className="whitespace-nowrap">领域</TableHead>
                          <TableHead className="whitespace-nowrap">服务名称</TableHead>
                          <TableHead className="whitespace-nowrap">模板版本</TableHead>
                          <TableHead className="whitespace-nowrap">字段数</TableHead>
                          <TableHead className="min-w-[220px]">字段示例</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedDomainFieldExports.map((item, index) => (
                          <TableRow key={`${item.domain}-${item.serviceName}`}>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground font-mono">{(catalogCurrentPage - 1) * catalogPageSize + index + 1}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{item.domainLabel}</TableCell>
                            <TableCell className="whitespace-nowrap text-sm font-medium">{item.serviceName}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground font-mono">{item.templateVersion}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">{item.fields.length}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {item.fields.slice(0, 4).map(field => field.label).join('、') || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                        {pagedDomainFieldExports.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">当前没有可导出的领域字段清单。</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {catalogTotalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">第 {catalogCurrentPage} / {catalogTotalPages} 页</span>
                      <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => setCatalogPage(p => Math.max(1, p - 1))} disabled={catalogCurrentPage <= 1}>上一页</Button>
                        <input
                          value={catalogJumpPage}
                          onChange={e => setCatalogJumpPage(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const next = Number(catalogJumpPage);
                              if (Number.isFinite(next)) setCatalogPage(Math.max(1, Math.min(catalogTotalPages, next)));
                              setCatalogJumpPage('');
                            }
                          }}
                          placeholder="页码"
                          className="h-8 w-16 rounded-md border border-border bg-white px-2 text-center text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const next = Number(catalogJumpPage);
                            if (Number.isFinite(next)) setCatalogPage(Math.max(1, Math.min(catalogTotalPages, next)));
                            setCatalogJumpPage('');
                          }}
                        >
                          跳转
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setCatalogPage(p => Math.min(catalogTotalPages, p + 1))} disabled={catalogCurrentPage >= catalogTotalPages}>下一页</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <Dialog open={fieldEditorOpen} onOpenChange={open => {
            setFieldEditorOpen(open);
            if (!open) resetFieldForm();
          }}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{editingFieldId ? '编辑字段' : '新建字段'}</DialogTitle>
                <DialogDescription>
                  在字段字典中维护标准字段，并供服务目录引用。
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">字段 Key</span>
                  <input
                    value={fieldForm.key}
                    onChange={e => setFieldForm(current => ({ ...current, key: e.target.value }))}
                    className="h-9 rounded-md border border-border bg-white px-3 text-sm"
                    placeholder="如 description"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">字段标签</span>
                  <input
                    value={fieldForm.label}
                    onChange={e => setFieldForm(current => ({ ...current, label: e.target.value }))}
                    className="h-9 rounded-md border border-border bg-white px-3 text-sm"
                    placeholder="如 需求描述"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">字段类型</span>
                    <select
                      value={fieldForm.type}
                      onChange={e => setFieldForm(current => ({ ...current, type: e.target.value as FieldDictionaryEntry['type'] }))}
                      className="h-9 rounded-md border border-border bg-white px-3 text-sm"
                    >
                      {FIELD_DICTIONARY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">分类</span>
                    <input
                      value={fieldForm.category}
                      onChange={e => setFieldForm(current => ({ ...current, category: e.target.value }))}
                      className="h-9 rounded-md border border-border bg-white px-3 text-sm"
                      placeholder="基础信息"
                    />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">来源范围</span>
                    <select
                      value={fieldForm.sourceScope}
                      onChange={e => setFieldForm(current => ({ ...current, sourceScope: e.target.value as FieldDictionaryEntry['sourceScope'] }))}
                      className="h-9 rounded-md border border-border bg-white px-3 text-sm"
                    >
                      <option value="input">仅输入</option>
                      <option value="output">仅输出</option>
                      <option value="both">输入/输出</option>
                    </select>
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">状态</span>
                    <select
                      value={fieldForm.status}
                      onChange={e => setFieldForm(current => ({ ...current, status: e.target.value as FieldDictionaryEntry['status'] }))}
                      className="h-9 rounded-md border border-border bg-white px-3 text-sm"
                    >
                      <option value="active">启用</option>
                      <option value="draft">草稿</option>
                    </select>
                  </label>
                </div>
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">说明</span>
                  <textarea
                    value={fieldForm.description}
                    onChange={e => setFieldForm(current => ({ ...current, description: e.target.value }))}
                    className="min-h-[88px] rounded-md border border-border bg-white px-3 py-2 text-sm"
                    placeholder="说明这个字段为什么被标准化、供哪些环节使用"
                  />
                </label>
                {(fieldForm.type === 'text' || fieldForm.type === 'textarea') && (
                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">占位提示</span>
                    <input
                      value={fieldForm.placeholder}
                      onChange={e => setFieldForm(current => ({ ...current, placeholder: e.target.value }))}
                      className="h-9 rounded-md border border-border bg-white px-3 text-sm"
                      placeholder="如：请输入业务背景"
                    />
                  </label>
                )}
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">默认值</span>
                  <input
                    value={fieldForm.defaultValue}
                    onChange={e => setFieldForm(current => ({ ...current, defaultValue: e.target.value }))}
                    className="h-9 rounded-md border border-border bg-white px-3 text-sm"
                    placeholder="可选"
                  />
                </label>
                {fieldForm.type === 'select' && (
                  <label className="grid gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">选项列表</span>
                    <textarea
                      value={fieldForm.optionsText}
                      onChange={e => setFieldForm(current => ({ ...current, optionsText: e.target.value }))}
                      className="min-h-[96px] rounded-md border border-border bg-white px-3 py-2 text-sm font-mono"
                      placeholder={'低:low\n中:medium\n高:high'}
                    />
                  </label>
                )}
                <label className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={fieldForm.required}
                    onChange={e => setFieldForm(current => ({ ...current, required: e.target.checked }))}
                  />
                  设为必填字段
                </label>
                <div className="flex items-center gap-2">
                  <Button onClick={submitFieldForm}>{editingFieldId ? '保存修改' : '创建字段'}</Button>
                  <Button variant="outline" onClick={resetFieldForm}>清空表单</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={fieldCandidatesOpen} onOpenChange={setFieldCandidatesOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>候选字段提取</DialogTitle>
                <DialogDescription>
                  基于现有服务的输入/输出字段全量扫描高频候选，尚未入库的字段会显示在这里。
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  当前候选 {filteredFieldCandidates.length} 条，可逐条入库，也可按当前筛选结果一次性全部导入。
                </div>
                <Button size="sm" onClick={importAllCandidates} disabled={filteredFieldCandidates.length === 0}>
                  全部导入
                </Button>
              </div>
              <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
                {filteredFieldCandidates.map(candidate => (
                  <div key={candidate.key} className="rounded-lg border border-border bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{candidate.label}</span>
                          <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">{candidate.type}</Badge>
                          <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50">{candidate.category}</Badge>
                          <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50">
                            {candidate.sourceScope === 'both' ? '输入/输出' : candidate.sourceScope === 'output' ? '仅输出' : '仅输入'}
                          </Badge>
                          {candidate.conflict && (
                            <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50">类型冲突</Badge>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{candidate.key} · 引用 {candidate.count} 次 · 涉及 {candidate.specs.length} 个服务</div>
                        <div className="mt-2 text-xs text-slate-500">
                          来源服务：{candidate.specs.slice(0, 4).join('、')}{candidate.specs.length > 4 ? ` 等 ${candidate.specs.length} 项` : ''}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => importCandidate(candidate)}>入库</Button>
                    </div>
                  </div>
                ))}
                {filteredFieldCandidates.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-8 text-center text-sm text-muted-foreground">
                    当前筛选条件下没有待入库候选字段。
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={assetPreviewOpen} onOpenChange={setAssetPreviewOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>资产重建预览</DialogTitle>
                <DialogDescription>
                  当前仅展示按现行字段口径生成的预览结果。
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
        </TabsContent>

        <TabsContent value="templates">
          <Suspense fallback={<TabPanelFallback title="表单模板" />}>
            <SchemaTemplatesPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="config-profiles">
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">配置套餐</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      统一维护套餐分类、环境套餐明细与价格规则，模板侧只绑定套餐分类。
                    </p>
                  </div>
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                    已维护 {configProfileGroups.length} 个分类 / {configProfileGroups.reduce((sum, group) => sum + group.profiles.length, 0)} 条套餐
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {PACKAGE_SUB_TABS.map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => handlePackageSubTabChange(tab.key)}
                      className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                        activePackageSubTab === tab.key
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border bg-white text-foreground hover:bg-muted/40'
                      }`}
                    >
                      <div className="text-sm font-medium">{tab.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{tab.description}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    {activePackageSubTab === 'packages'
                      ? '当前按套餐分类分页展示，每个分类下维护 DEV / UAT / PROD 等环境套餐明细。'
                      : '价格规则与套餐管理共用同一页面容器，但保留独立入口。'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => resetConfigProfileGroups()}>
                      重置种子
                    </Button>
                    {activePackageSubTab === 'packages' && (
                      <>
                        <Button variant="outline" size="sm" onClick={openCreateConfigPackageGroupDialog}>
                          <Plus className="mr-1 h-4 w-4" /> 新增分类
                        </Button>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>每页</span>
                          <select
                            value={configProfilePageSize}
                            onChange={event => {
                              setConfigProfilePageSize(Number(event.target.value));
                              setConfigProfilePage(1);
                            }}
                            className="h-9 px-2 text-sm rounded-md border border-border bg-white"
                          >
                            {FIELD_PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {configProfileSaveState === 'saved' && (
                  <div className="mt-3 text-xs text-emerald-600">套餐配置已保存</div>
                )}
              </CardContent>
            </Card>

            {activePackageSubTab === 'packages' && pagedConfigProfileGroups.map(group => (
              <Card key={group.key}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{group.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        分类标识：<span className="font-mono">{group.key}</span>
                        <span className="mx-2">|</span>
                        关联服务：{group.specIds.length > 0
                          ? group.specIds.map(specId => atomicSpecs.find(spec => spec.id === specId)?.name ?? specId).join(' / ')
                          : '暂未关联'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">{group.profiles.length} 条套餐</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditConfigPackageGroupDialog(group.key)}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" /> 编辑分类
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => promptDeleteConfigPackageGroup(group.key, group.title)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> 删除分类
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const next = buildEmptyConfigProfile(group.key);
                          updateConfigProfileGroup(group.key, { profiles: [...group.profiles, next] });
                          beginEditConfigProfile(group.key, next);
                        }}
                      >
                        新增套餐明细
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-border overflow-x-auto">
                    <Table className="w-max min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">序号</TableHead>
                          <TableHead className="whitespace-nowrap">环境</TableHead>
                          <TableHead className="whitespace-nowrap">配置名称</TableHead>
                          <TableHead className="whitespace-nowrap">节点</TableHead>
                          <TableHead className="whitespace-nowrap">CPU</TableHead>
                          <TableHead className="whitespace-nowrap">内存</TableHead>
                          <TableHead className="whitespace-nowrap">磁盘</TableHead>
                          <TableHead className="whitespace-nowrap">安全等级</TableHead>
                          <TableHead className="whitespace-nowrap">监控等级</TableHead>
                          <TableHead className="min-w-[260px]">说明 / 操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.profiles.map((profile, index) => {
                          const isEditing = editingConfigProfileId === profile.id && configProfileDraft?.groupKey === group.key;
                          const draftProfile = isEditing ? configProfileDraft?.profile ?? profile : profile;
                          return (
                          <TableRow key={profile.id}>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground font-mono">
                              {index + 1}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {isEditing ? (
                                <select
                                  value={draftProfile.env}
                                  onChange={event => updateConfigProfileDraft({ env: event.target.value as ServiceConfigProfile['env'] })}
                                  className="h-8 rounded-md border border-border bg-white px-2 text-sm"
                                >
                                  {['DEV', 'UAT', 'PROD', 'PERF', 'DR'].map(option => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                              ) : (
                                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50">{profile.env}</Badge>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap font-medium">
                              {isEditing ? (
                                <input
                                  value={draftProfile.name}
                                  onChange={event => updateConfigProfileDraft({ name: event.target.value })}
                                  className="h-8 min-w-[160px] rounded-md border border-border bg-white px-2 text-sm"
                                />
                              ) : (
                                draftProfile.name || '未命名配置'
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {isEditing ? (
                                <input
                                  value={draftProfile.nodes}
                                  onChange={event => updateConfigProfileDraft({ nodes: event.target.value })}
                                  className="h-8 w-20 rounded-md border border-border bg-white px-2 text-sm"
                                />
                              ) : (
                                <span className="text-sm text-foreground">{profile.nodes || '-'}</span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {isEditing ? (
                                <input
                                  value={draftProfile.cpu}
                                  onChange={event => updateConfigProfileDraft({ cpu: event.target.value })}
                                  className="h-8 w-24 rounded-md border border-border bg-white px-2 text-sm"
                                />
                              ) : (
                                <span className="text-sm text-foreground">{profile.cpu || '-'}</span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {isEditing ? (
                                <input
                                  value={draftProfile.memory}
                                  onChange={event => updateConfigProfileDraft({ memory: event.target.value })}
                                  className="h-8 w-24 rounded-md border border-border bg-white px-2 text-sm"
                                />
                              ) : (
                                <span className="text-sm text-foreground">{profile.memory || '-'}</span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {isEditing ? (
                                <input
                                  value={draftProfile.disk}
                                  onChange={event => updateConfigProfileDraft({ disk: event.target.value })}
                                  className="h-8 w-28 rounded-md border border-border bg-white px-2 text-sm"
                                />
                              ) : (
                                <span className="text-sm text-foreground">{profile.disk || '-'}</span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {isEditing ? (
                                <input
                                  value={draftProfile.details?.['安全等级'] || ''}
                                  onChange={event => updateConfigProfileDraft({
                                    details: { ...(draftProfile.details ?? {}), 安全等级: event.target.value },
                                  })}
                                  className="h-8 w-20 rounded-md border border-border bg-white px-2 text-sm"
                                />
                              ) : (
                                <span className="text-sm text-foreground">{profile.details?.['安全等级'] || '-'}</span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {isEditing ? (
                                <input
                                  value={draftProfile.details?.['监控等级'] || ''}
                                  onChange={event => updateConfigProfileDraft({
                                    details: { ...(draftProfile.details ?? {}), 监控等级: event.target.value },
                                  })}
                                  className="h-8 w-20 rounded-md border border-border bg-white px-2 text-sm"
                                />
                              ) : (
                                <span className="text-sm text-foreground">{profile.details?.['监控等级'] || '-'}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                {isEditing ? (
                                  <>
                                    <input
                                      value={draftProfile.description || ''}
                                      onChange={event => updateConfigProfileDraft({ description: event.target.value })}
                                      className="h-8 min-w-[220px] rounded-md border border-border bg-white px-2 text-sm text-foreground"
                                    />
                                    <Button variant="ghost" size="sm" onClick={saveEditedConfigProfile}>
                                      <Save className="mr-1 h-3.5 w-3.5" /> 保存
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={cancelEditConfigProfile}>
                                      <X className="mr-1 h-3.5 w-3.5" /> 取消
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <span className="min-w-[220px] text-sm text-foreground">{profile.description || '-'}</span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => beginEditConfigProfile(group.key, profile)}
                                    >
                                      <Pencil className="mr-1 h-3.5 w-3.5" /> 编辑
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => updateConfigProfileGroup(group.key, {
                                        profiles: group.profiles.filter(item => item.id !== profile.id),
                                      })}
                                    >
                                      删除
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )})}
                      </TableBody>
                    </Table>
                  </div>

                </CardContent>
              </Card>
            ))}

            {activePackageSubTab === 'packages' && configPackageTotalPages > 1 && (
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">
                      第 {configPackageCurrentPage} / {configPackageTotalPages} 页
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfigProfilePage(page => Math.max(1, page - 1))}
                        disabled={configPackageCurrentPage <= 1}
                      >
                        上一页
                      </Button>
                      <input
                        value={configProfileJumpPage}
                        onChange={event => setConfigProfileJumpPage(event.target.value)}
                        onKeyDown={event => {
                          if (event.key === 'Enter') {
                            const next = Number(configProfileJumpPage);
                            if (Number.isFinite(next)) setConfigProfilePage(Math.max(1, Math.min(configPackageTotalPages, next)));
                            setConfigProfileJumpPage('');
                          }
                        }}
                        placeholder="页码"
                        className="h-8 w-16 rounded-md border border-border bg-white px-2 text-center text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const next = Number(configProfileJumpPage);
                          if (Number.isFinite(next)) setConfigProfilePage(Math.max(1, Math.min(configPackageTotalPages, next)));
                          setConfigProfileJumpPage('');
                        }}
                      >
                        跳转
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfigProfilePage(page => Math.min(configPackageTotalPages, page + 1))}
                        disabled={configPackageCurrentPage >= configPackageTotalPages}
                      >
                        下一页
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {activePackageSubTab === 'pricing' && (
              <div className="grid gap-4 lg:grid-cols-[1fr,1fr]">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">套餐与定价</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      统一维护套餐区间、适用范围与计价口径。
                    </p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">规划中</Badge>
                </div>

                <div className="mt-4 space-y-3">
                  {pricingConfig.packages.map((pkg, index) => (
                    <div key={pkg.key} className="rounded-lg border border-border bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-foreground">{pkg.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{pkg.audience}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-primary">{formatPriceRange(pkg.baseMin, pkg.baseMax)}</div>
                          <div className="text-[10px] text-muted-foreground">{pkg.pricing}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {pkg.modules.map(module => (
                          <Badge key={module} className="bg-slate-100 text-slate-700 hover:bg-slate-100">{module}</Badge>
                        ))}
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground">适用时长：{pkg.duration}</div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <label className="grid gap-1 text-xs text-muted-foreground">
                          最低价
                          <input
                            type="number"
                            value={pkg.baseMin}
                            onChange={e => {
                              const value = Number(e.target.value || '0');
                              persistPricingConfig({
                                ...pricingConfig,
                                packages: pricingConfig.packages.map((item, itemIndex) => itemIndex === index ? { ...item, baseMin: value } : item),
                              });
                            }}
                            className="h-9 rounded-md border border-border bg-white px-3 text-sm text-foreground"
                          />
                        </label>
                        <label className="grid gap-1 text-xs text-muted-foreground">
                          最高价
                          <input
                            type="number"
                            value={pkg.baseMax}
                            onChange={e => {
                              const value = Number(e.target.value || '0');
                              persistPricingConfig({
                                ...pricingConfig,
                                packages: pricingConfig.packages.map((item, itemIndex) => itemIndex === index ? { ...item, baseMax: value } : item),
                              });
                            }}
                            className="h-9 rounded-md border border-border bg-white px-3 text-sm text-foreground"
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground">联动范围</h3>
                <div className="mt-3 space-y-2.5">
                  <div className="rounded-lg border border-border bg-white p-3">
                    <div className="text-sm font-medium text-foreground">Portal 申请流程</div>
                    <div className="mt-1 text-sm text-muted-foreground">按模块、配置规模和使用时长展示套餐建议与价格区间。</div>
                  </div>
                  <div className="rounded-lg border border-border bg-white p-3">
                    <div className="text-sm font-medium text-foreground">审批流程</div>
                    <div className="mt-1 text-sm text-muted-foreground">审批节点可查看预算区间、成本摘要与敏感项。</div>
                  </div>
                  <div className="rounded-lg border border-border bg-white p-3">
                    <div className="text-sm font-medium text-foreground">工单详情</div>
                    <div className="mt-1 text-sm text-muted-foreground">记录申请配置、套餐建议、成本估算与确认结果。</div>
                  </div>
                  <div className="rounded-lg border border-border bg-white p-3">
                    <div className="text-sm font-medium text-foreground">成本控制规则</div>
                    <div className="mt-1 text-sm text-muted-foreground">支持使用时长系数、模块单价、冗余系数和高可用溢价。</div>
                  </div>
                  <div className="rounded-lg border border-border bg-white p-3">
                    <div className="text-sm font-medium text-foreground">已启用系数</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      已配置环境、业务等级和使用时长系数，并用于套餐建议计算。
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="roles">
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">角色与用户分配</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      先按角色维护权限簇和默认成员，后续再接菜单级权限控制与审批节点引用。
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => resetRoleDefinitions()}>
                      <RotateCcw className="mr-1 h-4 w-4" /> 重置种子
                    </Button>
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                      {roleDefinitions.reduce((sum, role) => sum + role.members.length, 0)} 名成员
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr,260px]">
                  <input
                    value={roleSearch}
                    onChange={event => setRoleSearch(event.target.value)}
                    placeholder="搜索角色、权限或成员"
                    className="h-10 rounded-md border border-border bg-white px-3 text-sm"
                  />
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
                    当前角色名称已对齐 PPT 演示口径，后续审批节点和菜单权限都直接引用该角色库。
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
            {filteredRoles.map(role => (
              <Card key={role.key}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-foreground">{role.name}</h2>
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/10">{role.perms.length} 权限簇</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{role.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {role.perms.map(perm => (
                      <Badge key={perm} className="bg-slate-100 text-slate-700 hover:bg-slate-100">{perm}</Badge>
                    ))}
                  </div>

                  <div className="mt-4 rounded-lg border border-border overflow-x-auto">
                    <Table className="w-max min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">成员</TableHead>
                          <TableHead className="whitespace-nowrap">账号</TableHead>
                          <TableHead className="whitespace-nowrap">岗位</TableHead>
                          <TableHead className="whitespace-nowrap">部门</TableHead>
                          <TableHead className="whitespace-nowrap">状态</TableHead>
                          <TableHead className="whitespace-nowrap">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {role.members.map(member => (
                          <TableRow key={member.id}>
                            <TableCell className="whitespace-nowrap">
                              <input
                                value={member.name}
                                onChange={event => updateRoleMembers(role.key, current =>
                                  current.members.map(item => item.id === member.id ? { ...item, name: event.target.value } : item),
                                )}
                                className="h-8 w-24 rounded-md border border-border bg-white px-2 text-sm"
                              />
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <input
                                value={member.account}
                                onChange={event => updateRoleMembers(role.key, current =>
                                  current.members.map(item => item.id === member.id ? { ...item, account: event.target.value } : item),
                                )}
                                className="h-8 w-28 rounded-md border border-border bg-white px-2 text-sm font-mono"
                              />
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <input
                                value={member.title || ''}
                                onChange={event => updateRoleMembers(role.key, current =>
                                  current.members.map(item => item.id === member.id ? { ...item, title: event.target.value } : item),
                                )}
                                className="h-8 w-28 rounded-md border border-border bg-white px-2 text-sm"
                              />
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <input
                                value={member.department || ''}
                                onChange={event => updateRoleMembers(role.key, current =>
                                  current.members.map(item => item.id === member.id ? { ...item, department: event.target.value } : item),
                                )}
                                className="h-8 w-28 rounded-md border border-border bg-white px-2 text-sm"
                              />
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <select
                                value={member.status}
                                onChange={event => updateRoleMembers(role.key, current =>
                                  current.members.map(item => item.id === member.id ? { ...item, status: event.target.value as 'active' | 'inactive' } : item),
                                )}
                                className="h-8 rounded-md border border-border bg-white px-2 text-sm"
                              >
                                <option value="active">启用</option>
                                <option value="inactive">停用</option>
                              </select>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => updateRoleMembers(role.key, current => current.members.filter(item => item.id !== member.id))}
                              >
                                删除
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {role.members.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                              当前角色还没有成员，可直接新增默认责任人。
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                      最近更新：{new Date(role.updatedAt).toLocaleString('zh-CN')}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateRoleMembers(role.key, current => [
                        ...current.members,
                        {
                          id: `${role.key}-member-${Date.now()}`,
                          name: '',
                          account: '',
                          title: '',
                          department: '',
                          status: 'active',
                        },
                      ])}
                    >
                      <Plus className="mr-1 h-4 w-4" /> 新增成员
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="approval">
          <div className="grid gap-4 lg:grid-cols-[1fr,1fr]">
            <Card>
              <CardContent className="p-5">
                <h2 className="text-base font-semibold text-foreground">MVP 审批链骨架</h2>
                <div className="mt-4 space-y-3">
                  {APPROVAL_STAGES.map((stage, index) => (
                    <div key={stage.name} className="rounded-lg border border-border bg-white p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-medium text-foreground">{stage.name}</div>
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{stage.role}</Badge>
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">SLA {stage.sla}</Badge>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">{stage.desc}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground">后续联动关系</h3>
                <div className="mt-3 space-y-3">
                  <div className="rounded-lg border border-border bg-white p-3">
                    <div className="text-sm font-medium text-foreground">工单状态机</div>
                    <div className="mt-1 text-sm text-muted-foreground">在 `pending` 和 `processing` 之间插入 `reviewing`，让评审成为正式阶段。</div>
                  </div>
                  <div className="rounded-lg border border-border bg-white p-3">
                    <div className="text-sm font-medium text-foreground">Portal 工单详情</div>
                    <div className="mt-1 text-sm text-muted-foreground">增加审批链进度区，显示节点、处理人角色、当前状态和反馈。</div>
                  </div>
                  <div className="rounded-lg border border-border bg-white p-3">
                    <div className="text-sm font-medium text-foreground">角色模型</div>
                    <div className="mt-1 text-sm text-muted-foreground">审批节点不直接绑定用户，而是绑定角色，便于组织调整和跨系统担当切换。</div>
                  </div>
                  <div className="rounded-lg border border-border bg-white p-3">
                    <div className="text-sm font-medium text-foreground">节点时间与 SLA 预留</div>
                    <div className="mt-1 text-sm text-muted-foreground">当前已记录每个主流程节点的进入时间和完成时间，后续可据此输出节点耗时、超时率和流程 SLA 报表。</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="grid gap-4 lg:grid-cols-[0.95fr,1.05fr]">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">账号与安全</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      统一维护账号认证、密码策略与会话安全能力。
                    </p>
                  </div>
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10">统一入口</Badge>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-lg border border-border bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-foreground">登录密码</div>
                        <div className="mt-1 text-xs text-muted-foreground">支持密码轮换策略与统一身份认证接入。</div>
                      </div>
                      <Button size="sm">修改密码</Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-foreground">重置密码</div>
                        <div className="mt-1 text-xs text-muted-foreground">支持管理员发起重置，并保留短信、邮件与企业认证通道。</div>
                      </div>
                      <Button size="sm" variant="outline">重置入口</Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-foreground">多因素认证</div>
                        <div className="mt-1 text-xs text-muted-foreground">支持高权限角色启用 MFA 或企业统一认证。</div>
                      </div>
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">规划中</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground">能力布局</h3>
                <div className="mt-3 space-y-3">
                  <div className="rounded-lg border border-border bg-white p-3">
                    <div className="text-sm font-medium text-foreground">当前入口</div>
                    <div className="mt-1 text-sm text-muted-foreground">账号与安全能力统一收口在“设置 &gt; 账号与安全”。</div>
                  </div>
                  <div className="rounded-lg border border-border bg-white p-3">
                    <div className="text-sm font-medium text-foreground">扩展能力</div>
                    <div className="mt-1 text-sm text-muted-foreground">可继续扩展个人访问密钥、审计日志、SSO 绑定、通知偏好与会话管理。</div>
                  </div>
                  <div className="rounded-lg border border-border bg-white p-3">
                    <div className="text-sm font-medium text-foreground">菜单策略</div>
                    <div className="mt-1 text-sm text-muted-foreground">全局菜单保持精简，复杂配置在页面内部继续分层管理。</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <Dialog open={configPackageGroupDialogOpen} onOpenChange={setConfigPackageGroupDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingConfigPackageGroupKey ? '编辑套餐分类' : '新增套餐分类'}</DialogTitle>
              <DialogDescription>
                {editingConfigPackageGroupKey
                  ? '维护分类名称与关联服务；分类标识已被模板绑定使用，当前先保持稳定。'
                  : '新增一条类似“云服务器”的套餐分类，后续再在分类内维护各环境套餐明细。'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">分类名称</span>
                <input
                  value={configPackageGroupForm.title}
                  onChange={event => setConfigPackageGroupForm(current => ({ ...current, title: event.target.value }))}
                  placeholder="例如：对象存储"
                  className="h-10 rounded-md border border-border bg-white px-3 text-sm"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">分类标识</span>
                <input
                  value={configPackageGroupForm.key}
                  onChange={event => setConfigPackageGroupForm(current => ({ ...current, key: event.target.value }))}
                  placeholder="例如：object-storage"
                  className="h-10 rounded-md border border-border bg-white px-3 text-sm font-mono disabled:bg-muted/40"
                  disabled={Boolean(editingConfigPackageGroupKey)}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">关联服务</span>
                <select
                  multiple
                  value={configPackageGroupForm.specIds}
                  onChange={event => {
                    const values = Array.from(event.target.selectedOptions).map(option => option.value);
                    setConfigPackageGroupForm(current => ({ ...current, specIds: values }));
                  }}
                  className="min-h-[160px] rounded-md border border-border bg-white px-3 py-2 text-sm"
                >
                  {atomicSpecs.map(spec => (
                    <option key={spec.id} value={spec.id}>
                      {spec.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                分类标识建议使用英文或中划线，后续模板绑定与套餐推荐都按该分类标识关联。
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setConfigPackageGroupDialogOpen(false);
                setEditingConfigPackageGroupKey(null);
                resetConfigPackageGroupForm();
              }}>
                取消
              </Button>
              <Button onClick={submitConfigPackageGroupForm}>
                <Save className="mr-1 h-4 w-4" /> 保存分类
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={configPackageDialogState.open} onOpenChange={open => {
          if (!open) setConfigPackageDialogState(EMPTY_CONFIG_PACKAGE_DIALOG_STATE);
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{configPackageDialogState.title}</DialogTitle>
              <DialogDescription>{configPackageDialogState.description}</DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfigPackageDialogState(EMPTY_CONFIG_PACKAGE_DIALOG_STATE)}>
                关闭
              </Button>
              {configPackageDialogState.onConfirm && (
                <Button onClick={configPackageDialogState.onConfirm}>
                  {configPackageDialogState.confirmLabel ?? '确认'}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </Tabs>
    </div>
  );
}
