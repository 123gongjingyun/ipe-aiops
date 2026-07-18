import { useState, Fragment } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useSpec,
  useAtomicSpecs,
  useSchemaTemplates,
  useSchemaTemplateVersions,
  getSpec,
  getApprovalPolicy,
  getDeliveryStepSet,
  getSchemaTemplate,
  getSchemaTemplateVersions,
  getSchemaTemplateVersion,
  getResolvedSpecSchemaFields,
  getResolvedTemplateFields,
  addSpec,
  updateSpec,
  bootstrapSchemaTemplatesFromSpecs,
  SLA_PRESETS,
  STANDARD_FLOW,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
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
  ApplyFieldBehavior,
  ApplyFieldStrategy,
  ApplyStrategy,
  ServiceSpec,
  AtomicServiceSpec,
  ComboServiceSpec,
  ServiceStatus,
  FieldSchema,
  FlowServiceRef,
  DeliveryFlowNode,
} from '@aiops/shared';
import { DOMAIN_META } from '@aiops/shared';

// ===== Status helpers (duplicated to avoid circular dep) =====

const STATUS_META: Record<ServiceStatus, { label: string; dot: string; badge: string }> = {
  online: { label: '已上线', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  offline: { label: '已下线', dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600' },
  draft: { label: '草稿', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700' },
};

function StatusBadge({ status }: { status: ServiceStatus }) {
  const m = STATUS_META[status];
  return <Badge className={m.badge}><span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${m.dot}`} />{m.label}</Badge>;
}

function slaLabel(level: string) {
  return { gold: '金牌', silver: '银牌', bronze: '铜牌' }[level] ?? level;
}

// ===== SpecSheet =====

export function SpecSheet({ spec, mode, open, onClose, onSwitchToEdit }: {
  spec: ServiceSpec;
  mode: 'view' | 'edit';
  open: boolean;
  onClose: () => void;
  onSwitchToEdit?: () => void;
}) {
  const latestSpec = useSpec(spec.id) ?? spec;
  const isAtomic = latestSpec.type === 'atomic';
  const isCombo = latestSpec.type === 'combo';

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="text-xl">{latestSpec.icon}</span>
            {mode === 'view' ? latestSpec.name : `编辑：${latestSpec.name}`}
          </SheetTitle>
          <SheetDescription>
            {latestSpec.type === 'atomic' ? '原子服务' : '组合服务'} · {latestSpec.id} · v{latestSpec.version}
          </SheetDescription>
        </SheetHeader>

        {mode === 'view' ? (
          <>
            <BasicInfoView spec={latestSpec} />
            {isAtomic && <SchemaView spec={latestSpec} />}
            {isCombo && <ComboView spec={latestSpec as ComboServiceSpec} />}
            {onSwitchToEdit && (
              <SheetFooter>
                <Button onClick={onSwitchToEdit}><Pencil className="w-4 h-4 mr-1" />编辑</Button>
              </SheetFooter>
            )}
          </>
        ) : (
          <>
            {isAtomic && <AtomicEditForm spec={latestSpec as AtomicServiceSpec} onClose={onClose} />}
            {isCombo && <ComboEditForm spec={latestSpec as ComboServiceSpec} onClose={onClose} />}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ===== View: Basic Info =====

function BasicInfoView({ spec }: { spec: ServiceSpec }) {
  const atomic = spec.type === 'atomic' ? (spec as AtomicServiceSpec) : null;
  const combo = spec.type === 'combo' ? (spec as ComboServiceSpec) : null;

  return (
    <>
      <Section title="基本信息">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Field label="ID">{spec.id}</Field>
          <Field label="版本">v{spec.version}</Field>
          <Field label="状态"><StatusBadge status={spec.status} /></Field>
          <Field label="SLA">{slaLabel(spec.sla.level)}</Field>
          {atomic && <Field label="领域">{DOMAIN_META[atomic.domain]?.name ?? atomic.domain} / {atomic.category}</Field>}
          {atomic && <Field label="支持环境">{atomic.supportedEnvironments?.join(' / ') || '未定义'}</Field>}
          {combo && <Field label="目标受众">{combo.targetAudience === 'business' ? '应用担当' : '基础担当'}</Field>}
          <div className="col-span-2"><Field label="描述">{spec.description}</Field></div>
          {atomic && <div className="col-span-2"><Field label="服务摘要">{atomic.serviceSummary || '—'}</Field></div>}
        </div>
      </Section>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div><span className="text-muted-foreground">{label}：</span>{children}</div>
  );
}

// ===== View: Schema (Atomic) =====

function SchemaView({ spec }: { spec: Pick<ServiceSpec, 'type' | 'inputSchema' | 'outputSchema' | 'inputTemplateId' | 'outputTemplateId' | 'inputTemplateVersionId' | 'outputTemplateVersionId'> }) {
  const inputFields = getResolvedSpecSchemaFields(spec, 'input');
  const outputFields = getResolvedSpecSchemaFields(spec, 'output');

  return (
    <Section title="输入/输出字段">
      <div className="space-y-4">
        <SchemaTable
          title="输入字段"
          fields={inputFields}
          action={(
            <TemplateBindingPanel
              templateId={'inputTemplateId' in spec ? spec.inputTemplateId : undefined}
              templateVersionId={spec.inputTemplateVersionId}
              legacyFields={spec.inputSchema}
              kind="input"
              mode="view"
              compact
            />
          )}
        />
        <SchemaTable
          title="输出字段"
          fields={outputFields}
          action={(
            <TemplateBindingPanel
              templateId={'outputTemplateId' in spec ? spec.outputTemplateId : undefined}
              templateVersionId={spec.outputTemplateVersionId}
              legacyFields={spec.outputSchema}
              kind="output"
              mode="view"
              compact
            />
          )}
        />
      </div>
    </Section>
  );
}

function SchemaTable({ title, fields, action }: { title: string; fields: FieldSchema[]; action?: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <div className="text-sm font-medium">{title}（{fields.length}）</div>
        {action}
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-2.5 py-1.5 text-left font-medium">字段</th>
              <th className="px-2.5 py-1.5 text-left font-medium">标签</th>
              <th className="px-2.5 py-1.5 text-left font-medium">类型</th>
              <th className="px-2.5 py-1.5 text-left font-medium">必填</th>
              <th className="px-2.5 py-1.5 text-left font-medium">详情</th>
            </tr>
          </thead>
          <tbody>
            {fields.map(f => (
              <tr key={f.key} className="border-t">
                <td className="px-2.5 py-1 font-mono">{f.key}</td>
                <td className="px-2.5 py-1">{f.label}</td>
                <td className="px-2.5 py-1">{f.type}</td>
                <td className="px-2.5 py-1">{f.required ? '✓' : '-'}</td>
                <td className="px-2.5 py-1 text-muted-foreground">
                  {f.type === 'select' && f.options ? `${f.options.length} 选项` :
                   f.placeholder ? `placeholder: ${f.placeholder}` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TemplateBindingPanel({
  templateId,
  templateVersionId,
  legacyFields,
  kind,
  mode = 'edit',
  allowTemplateSwitch = false,
  allowVersionSwitch = false,
  onTemplateChange,
  onVersionChange,
  compact = false,
}: {
  templateId?: string;
  templateVersionId?: string;
  legacyFields: FieldSchema[];
  kind: 'input' | 'output';
  mode?: 'view' | 'edit';
  allowTemplateSwitch?: boolean;
  allowVersionSwitch?: boolean;
  onTemplateChange?: (templateId: string, versionId: string) => void;
  onVersionChange?: (versionId: string) => void;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const [previewOpen, setPreviewOpen] = useState(false);
  const templates = useSchemaTemplates();
  const template = templateId ? getSchemaTemplate(templateId) : undefined;
  const version = templateVersionId ? getSchemaTemplateVersion(templateVersionId) : undefined;
  const templateVersions = useSchemaTemplateVersions(templateId);
  const activeVersions = templateVersions.filter(item => item.status === 'active');
  const candidateTemplates = templates.filter(item => item.kind === kind && item.scope === 'atomic');
  const resolvedFields = getResolvedTemplateFields(templateVersionId);
  const fieldCount = resolvedFields.length || legacyFields.length;
  const previewFields = resolvedFields.length > 0 ? resolvedFields : legacyFields;
  const versionLabel = version?.version ? `v${version.version}` : '未发布版本';
  const title = kind === 'input' ? '输入模板绑定' : '输出模板绑定';
  const statusLabel = version?.status === 'active' ? '正式版' : version?.status === 'draft' ? '草稿版' : version?.status === 'archived' ? '归档版' : '';
  const summaryText = template
    ? `${template.name} · ${versionLabel} · ${fieldCount} 个字段`
    : `当前未绑定模板，仍使用历史字段快照兼容展示（${fieldCount} 个字段）`;

  if (compact) {
    return (
      <>
        <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
          查看模板绑定
        </Button>
        <TemplatePreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          kind={kind}
          templateName={template?.name}
          templateCode={template?.code}
          versionLabel={versionLabel}
          statusLabel={statusLabel}
          fields={previewFields}
        />
      </>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-muted/20 px-3 py-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium text-foreground">{title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{summaryText}</div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <span className="rounded-full bg-white px-2 py-1">模板编码：{template?.code ?? '历史快照'}</span>
              <span className="rounded-full bg-white px-2 py-1">版本：{versionLabel}</span>
              <span className="rounded-full bg-white px-2 py-1">字段数：{fieldCount}</span>
            </div>
          </div>
          {statusLabel && (
            <Badge variant="outline" className="text-[10px]">
              {statusLabel}
            </Badge>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {mode === 'edit' && allowTemplateSwitch && candidateTemplates.length > 0 && onTemplateChange && (
            <select
              value={templateId ?? ''}
              onChange={event => {
                const nextTemplateId = event.target.value;
                const nextTemplate = getSchemaTemplate(nextTemplateId);
                const nextVersionId = nextTemplate?.currentVersionId
                  || getSchemaTemplateVersions(nextTemplateId)[0]?.id
                  || '';
                onTemplateChange(nextTemplateId, nextVersionId);
              }}
              className="h-8 min-w-[240px] rounded-md border border-border bg-white px-2 text-xs text-foreground"
            >
              {candidateTemplates.map(item => (
                <option key={item.id} value={item.id}>
                  绑定模板：{item.name}
                </option>
              ))}
            </select>
          )}
          {mode === 'edit' && allowVersionSwitch && template && activeVersions.length > 0 && onVersionChange && (
            <select
              value={templateVersionId ?? ''}
              onChange={event => onVersionChange(event.target.value)}
              className="h-8 min-w-[220px] rounded-md border border-border bg-white px-2 text-xs text-foreground"
            >
              {activeVersions.map(item => (
                <option key={item.id} value={item.id}>
                  绑定正式版 v{item.version}
                </option>
              ))}
            </select>
          )}
          <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
            查看预览
          </Button>
          {mode === 'edit' && (
            <Button size="sm" variant="ghost" onClick={() => navigate('/settings?tab=templates')}>
              前往表单模板
            </Button>
          )}
        </div>
        <div className="mt-2 text-xs leading-5 text-muted-foreground">
          {mode === 'edit'
            ? `服务编辑页只维护绑定关系，不再直接改字段定义。${allowVersionSwitch ? '当前仅允许在同一表单模板下切换已发布正式版。' : ''} 字段新增、版本复制和正式发布请到 设置 > 表单模板。`
            : '当前查看页展示的是该服务实际生效的模板版本与字段快照，便于从服务视角确认申请与交付结构。'}
        </div>
      </div>
      <TemplatePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        kind={kind}
        templateName={template?.name}
        templateCode={template?.code}
        versionLabel={versionLabel}
        statusLabel={statusLabel}
        fields={previewFields}
      />
    </>
  );
}

function TemplatePreviewDialog({
  open,
  onOpenChange,
  kind,
  templateName,
  templateCode,
  versionLabel,
  statusLabel,
  fields,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: 'input' | 'output';
  templateName?: string;
  templateCode?: string;
  versionLabel: string;
  statusLabel?: string;
  fields: FieldSchema[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{kind === 'input' ? '输入模板预览' : '输出模板预览'}</DialogTitle>
          <DialogDescription>
            {templateName ? `${templateName} · ${versionLabel}` : `历史字段快照 · ${versionLabel}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2.5 py-1">模板编码：{templateCode ?? '历史快照'}</span>
            <span className="rounded-full bg-muted px-2.5 py-1">版本：{versionLabel}</span>
            <span className="rounded-full bg-muted px-2.5 py-1">字段数：{fields.length}</span>
            {statusLabel && <span className="rounded-full bg-muted px-2.5 py-1">状态：{statusLabel}</span>}
          </div>
          <SchemaTable title={kind === 'input' ? '输入字段明细' : '输出字段明细'} fields={fields} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== View: Combo =====

function ComboView({ spec }: { spec: ComboServiceSpec }) {
  return (
    <>
      <SchemaView spec={spec} />
      <Section title="组合详情">
        <ComboFlowView flow={spec.assembly.deliveryFlow} />
      </Section>
    </>
  );
}

function ComboFlowView({ flow }: { flow: DeliveryFlowNode[] }) {
  // Collect unique specIds from all nodes
  const allSpecIds = Array.from(new Set(flow.flatMap(n => (n.services ?? []).map(s => s.specId))));
  return (
    <>
      <div className="mb-4">
        <div className="text-sm font-medium mb-1.5">包含原子服务（{allSpecIds.length}）</div>
        <div className="flex flex-wrap gap-1.5">
          {allSpecIds.map(id => <SpecBadge key={id} specId={id} />)}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium mb-1.5">交付流程（{flow.length} 步）</div>
        <div className="space-y-2">
          {flow.map((node, i) => (
            <div key={node.id} className="border rounded-md p-2.5 bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">{i + 1}.</span>
                <span className="text-sm font-medium">{node.label}</span>
                <ServiceModeBadges services={node.services ?? []} />
              </div>
              {node.description && <div className="text-xs text-muted-foreground mt-1 ml-5">{node.description}</div>}
              <div className="mt-1.5 ml-5 space-y-1">
                {(node.services ?? []).map(s => (
                  <div key={s.specId} className="flex items-center gap-1.5 flex-wrap">
                    <SpecBadge specId={s.specId} />
                    {!s.required && <Badge variant="outline" className="text-[10px] h-4 text-amber-600">可选</Badge>}
                    {s.overrides && Object.keys(s.overrides).length > 0 && (
                      <OverridesPreview overrides={s.overrides} />
                    )}
                  </div>
                ))}
              </div>
              {i < flow.length - 1 && <div className="text-center text-muted-foreground text-xs mt-2">↓</div>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/** Show AI/Manual badges based on each service's spec-level deliveryMode */
function ServiceModeBadges({ services }: { services: FlowServiceRef[] }) {
  return (
    <>
      {services.map(s => {
        const spec = getSpec(s.specId);
        if (!spec || spec.type !== 'atomic') return null;
        return (
          <span key={s.specId} className="ml-1">
            {spec.deliveryMode === 'ai' && <span className="text-primary">AI</span>}
          </span>
        );
      })}
    </>
  );
}

function SpecBadge({ specId }: { specId: string }) {
  const spec = useSpec(specId);
  return <Badge variant="secondary" className="text-xs">{spec ? spec.name : specId}</Badge>;
}

function OverridesPreview({ overrides }: { overrides: Record<string, any> }) {
  const integrations = overrides.integrations as Record<string, string> | undefined;
  const inputOverrides = Object.entries(overrides).filter(([k]) => k !== 'integrations');

  return (
    <div className="flex items-center gap-1.5">
      {inputOverrides.map(([key, value]) => (
        <span key={key} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {key}={String(value)}
        </span>
      ))}
      {integrations && (
        <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
          集成: {Object.entries(integrations).filter(([,v]) => v === 'active').map(([k]) => k).join(', ')}
        </span>
      )}
    </div>
  );
}

// ===== Edit: Atomic =====

function AtomicEditForm({ spec, onClose }: { spec: AtomicServiceSpec; onClose: () => void }) {
  const [basicInfo, setBasicInfo] = useState({ name: spec.name, description: spec.description, slaLevel: spec.sla.level });
  const [bindingState, setBindingState] = useState({
    inputTemplateId: spec.inputTemplateId ?? '',
    inputTemplateVersionId: spec.inputTemplateVersionId ?? '',
    outputTemplateId: spec.outputTemplateId ?? '',
    outputTemplateVersionId: spec.outputTemplateVersionId ?? '',
  });

  const handleSave = () => {
    updateSpec(spec.id, {
      name: basicInfo.name,
      description: basicInfo.description,
      sla: SLA_PRESETS[basicInfo.slaLevel],
      inputTemplateId: bindingState.inputTemplateId || spec.inputTemplateId,
      inputTemplateVersionId: bindingState.inputTemplateVersionId || spec.inputTemplateVersionId,
      outputTemplateId: bindingState.outputTemplateId || spec.outputTemplateId,
      outputTemplateVersionId: bindingState.outputTemplateVersionId || spec.outputTemplateVersionId,
    } as Partial<AtomicServiceSpec>);
    onClose();
  };

  return (
    <>
      <BasicInfoEdit spec={spec} onChange={setBasicInfo} />
      <Section title="模板绑定">
        <div className="space-y-3">
          <TemplateBindingPanel
            templateId={bindingState.inputTemplateId || spec.inputTemplateId}
            templateVersionId={bindingState.inputTemplateVersionId || spec.inputTemplateVersionId}
            legacyFields={spec.inputSchema}
            kind="input"
            mode="edit"
            allowTemplateSwitch
            allowVersionSwitch
            onTemplateChange={(templateId, versionId) => setBindingState(state => ({
              ...state,
              inputTemplateId: templateId,
              inputTemplateVersionId: versionId,
            }))}
            onVersionChange={versionId => setBindingState(state => ({ ...state, inputTemplateVersionId: versionId }))}
          />
          <TemplateBindingPanel
            templateId={bindingState.outputTemplateId || spec.outputTemplateId}
            templateVersionId={bindingState.outputTemplateVersionId || spec.outputTemplateVersionId}
            legacyFields={spec.outputSchema}
            kind="output"
            mode="edit"
            allowTemplateSwitch
            allowVersionSwitch
            onTemplateChange={(templateId, versionId) => setBindingState(state => ({
              ...state,
              outputTemplateId: templateId,
              outputTemplateVersionId: versionId,
            }))}
            onVersionChange={versionId => setBindingState(state => ({ ...state, outputTemplateVersionId: versionId }))}
          />
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          原子服务页现在只维护模板绑定关系，可切换共享模板与正式版版本；字段字典和模板排版仍统一在“表单模板”里维护。
        </div>
      </Section>
      <SheetFooter>
        <Button variant="outline" onClick={onClose}>取消</Button>
        <Button onClick={handleSave}>保存</Button>
      </SheetFooter>
    </>
  );
}

// ===== Edit: Combo =====

function ComboEditForm({ spec, onClose }: { spec: ComboServiceSpec; onClose: () => void }) {
  const [flow, setFlow] = useState<DeliveryFlowNode[]>(
    (spec.assembly?.deliveryFlow ?? []).map(n => ({ ...n, services: n.services ?? [], description: n.description ?? '' }))
  );
  const [basicInfo, setBasicInfo] = useState({ name: spec.name, description: spec.description, slaLevel: spec.sla.level });
  const [applyStrategy, setApplyStrategy] = useState<ApplyStrategy>(() => ({
    workflowMode: spec.applyStrategy?.workflowMode ?? 'combo_general',
    aiMode: spec.applyStrategy?.aiMode ?? 'orchestration',
    fieldStrategies: spec.applyStrategy?.fieldStrategies ?? [],
    uiHints: spec.applyStrategy?.uiHints,
  }));
  const allAtomic = useAtomicSpecs();

  const handleSave = () => {
    updateSpec(spec.id, {
      name: basicInfo.name,
      description: basicInfo.description,
      sla: SLA_PRESETS[basicInfo.slaLevel],
      assembly: { ...spec.assembly, deliveryFlow: flow },
      applyStrategy,
    } as Partial<ComboServiceSpec>);
    onClose();
  };

  const addService = (nodeIdx: number) => {
    setFlow(f => f.map((n, j) => j === nodeIdx ? { ...n, services: [...n.services, { specId: '', required: true }] } : n));
  };

  const removeService = (nodeIdx: number, svcIdx: number) => {
    setFlow(f => f.map((n, j) => j === nodeIdx ? { ...n, services: n.services.filter((_, si) => si !== svcIdx) } : n));
  };

  const updateService = (nodeIdx: number, svcIdx: number, patch: Partial<FlowServiceRef>) => {
    setFlow(f => f.map((n, j) => j === nodeIdx ? { ...n, services: n.services.map((s, si) => si === svcIdx ? { ...s, ...patch } : s) } : n));
  };

  return (
    <>
      <BasicInfoEdit spec={spec} onChange={setBasicInfo} />
      <Section title="模板绑定">
        <div className="space-y-3">
          <TemplateBindingPanel
            templateId={spec.inputTemplateId}
            templateVersionId={spec.inputTemplateVersionId}
            legacyFields={spec.inputSchema ?? []}
            kind="input"
            mode="edit"
          />
          <TemplateBindingPanel
            templateId={spec.outputTemplateId}
            templateVersionId={spec.outputTemplateVersionId}
            legacyFields={spec.outputSchema ?? []}
            kind="output"
            mode="edit"
          />
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          组合服务同样只绑定模板版本；字段定义与版本治理统一在设置里的表单模板中维护。
        </div>
      </Section>
      <ApplyStrategySection specType="combo" strategy={applyStrategy} onChange={setApplyStrategy} />
      <Section title="交付流程">
        <div className="space-y-3">
          {flow.map((node, i) => (
            <div key={node.id} className="p-2 border rounded-md bg-muted/30 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                <input value={node.label} onChange={e => setFlow(f => f.map((n, j) => j === i ? { ...n, label: e.target.value } : n))} className="h-7 px-2 text-xs border rounded w-28" placeholder="步骤名称" />
                <input value={node.description} onChange={e => setFlow(f => f.map((n, j) => j === i ? { ...n, description: e.target.value } : n))} className="h-7 px-2 text-xs border rounded flex-1" placeholder="步骤描述" />
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setFlow(f => f.filter((_, j) => j !== i))}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
              {node.services.map((svc, si) => {
                const specData = getSpec(svc.specId);
                const deliveryMode = specData && specData.type === 'atomic' ? specData.deliveryMode : null;
                return (
                  <div key={si} className="flex items-center gap-2 ml-6">
                    <select value={svc.specId} onChange={e => updateService(i, si, { specId: e.target.value })} className="h-7 px-1 text-xs border rounded flex-1">
                      <option value="">关联服务...</option>
                      {allAtomic.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                      <input type="checkbox" checked={svc.required} onChange={e => updateService(i, si, { required: e.target.checked })} className="h-3.5 w-3.5" />
                      必需
                    </label>
                    {deliveryMode && (
                      <Badge variant="outline" className="text-[10px] h-5">{deliveryMode === 'ai' ? 'AI' : '人工'}</Badge>
                    )}
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => removeService(i, si)} disabled={node.services.length <= 1}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                );
              })}
              {node.services.length < 3 && (
                <Button variant="outline" size="sm" className="h-5 text-[10px] ml-6" onClick={() => addService(i)}>+ 添加服务</Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setFlow(f => [...f, { id: `step-${Date.now()}`, label: '', description: '', order: f.length, dependencies: [], services: [{ specId: '', required: true }] }])}>+ 添加步骤</Button>
        </div>
      </Section>
      <SheetFooter>
        <Button variant="outline" onClick={onClose}>取消</Button>
        <Button onClick={handleSave}>保存</Button>
      </SheetFooter>
    </>
  );
}

const APPLY_FIELD_BEHAVIOR_OPTIONS: Array<{ value: ApplyFieldBehavior; label: string }> = [
  { value: 'hidden', label: '隐藏' },
  { value: 'readonly', label: '只读' },
  { value: 'defaulted', label: '默认可改' },
  { value: 'required', label: '必填/必传' },
  { value: 'optional', label: '选填' },
];

const APPLY_STRATEGY_FIELDS: Record<'combo' | 'atomic', Array<{ key: string; label: string; defaultValue?: string }>> = {
  combo: [
    { key: 'targetEnvironment', label: '目标环境', defaultValue: 'PROD' },
    { key: 'priority', label: '优先级', defaultValue: 'high' },
    { key: 'timeRequirement', label: '时效要求', defaultValue: 'standard' },
    { key: 'architectureUpload', label: '架构图材料' },
    { key: 'configUpload', label: '配置文档导入' },
  ],
  atomic: [
    { key: 'environment', label: '环境选择', defaultValue: 'DEV' },
  ],
};

function ApplyStrategySection({
  specType,
  strategy,
  onChange,
}: {
  specType: 'combo' | 'atomic';
  strategy: ApplyStrategy;
  onChange: (strategy: ApplyStrategy) => void;
}) {
  const strategyFields = APPLY_STRATEGY_FIELDS[specType];

  const updateFieldStrategy = (fieldKey: string, patch: Partial<ApplyFieldStrategy>) => {
    const current = strategy.fieldStrategies ?? [];
    const index = current.findIndex(item => item.fieldKey === fieldKey);
    const base = current[index] ?? { fieldKey, behavior: 'optional' as ApplyFieldBehavior };
    const nextItem = { ...base, ...patch };
    const next = index >= 0
      ? current.map((item, itemIndex) => itemIndex === index ? nextItem : item)
      : [...current, nextItem];
    onChange({ ...strategy, fieldStrategies: next });
  };

  const getFieldStrategy = (fieldKey: string) =>
    strategy.fieldStrategies?.find(item => item.fieldKey === fieldKey) ?? { fieldKey, behavior: 'optional' as ApplyFieldBehavior };

  const previewItems = strategyFields.map(field => {
    const item = getFieldStrategy(field.key);
    const behaviorLabel = APPLY_FIELD_BEHAVIOR_OPTIONS.find(option => option.value === item.behavior)?.label ?? item.behavior;
    const detail = item.defaultValue ? `，默认值 ${item.defaultValue}` : '';
    return `${field.label}：${behaviorLabel}${detail}`;
  });

  const workflowModeLabel = strategy.workflowMode === 'internet_app'
    ? '互联网应用专用向导'
    : strategy.workflowMode === 'atomic_service'
      ? '原子服务申请页'
      : '组合通用工作台';
  const aiModeLabel = strategy.aiMode === 'topology_guided'
    ? '拓扑引导'
    : strategy.aiMode === 'validation'
      ? '配置校验'
      : '编排推荐';
  const workflowModeOptions = specType === 'atomic'
    ? [{ value: 'atomic_service', label: '原子服务申请页' }]
    : [
        { value: 'combo_general', label: '组合通用工作台' },
        { value: 'internet_app', label: '互联网应用专用向导' },
      ];
  const helperText = specType === 'atomic'
    ? '当前先开放原子服务的环境控制项，用于驱动 Portal 原子服务申请页的环境选择展示与默认值。'
    : '当前先开放组合服务的 5 个核心控制项，用于驱动 Portal 发起页的环境、优先级、时效和材料上传行为。';

  return (
    <Section title="发起策略">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">申请模式</Label>
            <Select
              value={strategy.workflowMode}
              onValueChange={value => onChange({ ...strategy, workflowMode: value as ApplyStrategy['workflowMode'] })}
            >
              <SelectTrigger className="h-8 text-sm mt-0.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {workflowModeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">AI 参与模式</Label>
            <Select
              value={strategy.aiMode}
              onValueChange={value => onChange({ ...strategy, aiMode: value as ApplyStrategy['aiMode'] })}
            >
              <SelectTrigger className="h-8 text-sm mt-0.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="orchestration">编排推荐</SelectItem>
                <SelectItem value="topology_guided">拓扑引导</SelectItem>
                <SelectItem value="validation">配置校验</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-2.5 py-2 text-left font-medium">控制项</th>
                <th className="px-2.5 py-2 text-left font-medium">行为</th>
                <th className="px-2.5 py-2 text-left font-medium">默认值</th>
                <th className="px-2.5 py-2 text-left font-medium">说明</th>
              </tr>
            </thead>
            <tbody>
              {strategyFields.map(field => {
                const item = getFieldStrategy(field.key);
                return (
                  <tr key={field.key} className="border-t">
                    <td className="px-2.5 py-2 text-slate-900">{field.label}</td>
                    <td className="px-2.5 py-2">
                      <Select
                        value={item.behavior}
                        onValueChange={value => updateFieldStrategy(field.key, { behavior: value as ApplyFieldBehavior })}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {APPLY_FIELD_BEHAVIOR_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2.5 py-2">
                      <Input
                        value={String(item.defaultValue ?? field.defaultValue ?? '')}
                        onChange={event => updateFieldStrategy(field.key, { defaultValue: event.target.value })}
                        className="h-8 text-xs"
                        placeholder="可选"
                      />
                    </td>
                    <td className="px-2.5 py-2">
                      <Input
                        value={item.reason ?? ''}
                        onChange={event => updateFieldStrategy(field.key, { reason: event.target.value })}
                        className="h-8 text-xs"
                        placeholder="说明该策略的用途"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
          <div className="text-xs font-medium text-slate-500">前台预览</div>
          <div className="mt-2 space-y-1.5 text-sm text-slate-700">
            <div>申请模式：{workflowModeLabel}</div>
            <div>AI 参与方式：{aiModeLabel}</div>
            {previewItems.map(item => (
              <div key={item}>{item}</div>
            ))}
          </div>
        </div>
        <div className="text-xs leading-5 text-muted-foreground">
          {helperText}
        </div>
      </div>
    </Section>
  );
}

// ===== Shared: Basic Info Edit =====

function BasicInfoEdit({ spec, onChange }: { spec: ServiceSpec; onChange: (v: { name: string; description: string; slaLevel: 'gold' | 'silver' | 'bronze' }) => void }) {
  const [form, setForm] = useState({
    name: spec.name,
    description: spec.description,
    slaLevel: spec.sla.level,
  });

  const update = (patch: Partial<typeof form>) => {
    const next = { ...form, ...patch };
    setForm(next);
    onChange(next);
  };

  return (
    <Section title="基本信息">
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">名称</Label>
            <Input value={form.name} onChange={e => update({ name: e.target.value })} className="h-8 text-sm mt-0.5" />
          </div>
          <div>
            <Label className="text-xs">SLA 等级</Label>
            <Select value={form.slaLevel} onValueChange={v => update({ slaLevel: v as 'gold' | 'silver' | 'bronze' })}>
              <SelectTrigger className="h-8 text-sm mt-0.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gold">金牌</SelectItem>
                <SelectItem value="silver">银牌</SelectItem>
                <SelectItem value="bronze">铜牌</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs">描述</Label>
          <Textarea value={form.description} onChange={e => update({ description: e.target.value })} className="text-sm mt-0.5" rows={2} />
        </div>
      </div>
    </Section>
  );
}

// ===== Layout helpers =====

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-sm font-semibold text-foreground mb-2 pb-1 border-b">{title}</h3>
      {children}
    </div>
  );
}

// ===== Create Spec Sheet =====

export function CreateSpecSheet({ open, onOpenChange }: {
  open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const [form, setForm] = useState({
    id: '', name: '', description: '', icon: '📦',
    type: 'atomic' as 'atomic' | 'combo',
    domain: 'compute', category: '', slaLevel: 'silver' as 'gold' | 'silver' | 'bronze',
  });
  const [inputRows, setInputRows] = useState<FieldSchema[]>([]);
  const [outputRows, setOutputRows] = useState<FieldSchema[]>([]);
  const [comboFlow, setComboFlow] = useState<DeliveryFlowNode[]>([]);
  const allAtomic = useAtomicSpecs();

  const reset = () => {
    setForm({ id: '', name: '', description: '', icon: '📦', type: 'atomic', domain: 'compute', category: '', slaLevel: 'silver' });
    setInputRows([]); setOutputRows([]); setComboFlow([]);
  };

  const handleCreate = () => {
    const base = { id: form.id, name: form.name, description: form.description, icon: form.icon, tags: [] as string[], version: '1.0.0', status: 'draft' as ServiceStatus, sla: SLA_PRESETS[form.slaLevel] };
    if (form.type === 'atomic') {
      addSpec({
        ...base,
        type: 'atomic',
        domain: form.domain,
        category: form.category || '未分类',
        inputSchema: inputRows,
        outputSchema: outputRows,
        flow: STANDARD_FLOW,
        delivery: { handler: 'default', autoDays: 1, manualDays: 2, dependencies: [] },
        deliveryMode: 'manual',
      } as AtomicServiceSpec);
    } else {
      addSpec({ ...base, type: 'combo', inputSchema: inputRows, outputSchema: outputRows, assembly: { formConfig: { questions: [], extras: [], aiConfig: '' }, deliveryFlow: comboFlow }, targetAudience: 'business', display: { highlight: false, category: '自定义' } } as ComboServiceSpec);
    }
    // Keep new services on the same path as existing ones by backfilling template refs immediately.
    bootstrapSchemaTemplatesFromSpecs();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={v => { if (v) reset(); onOpenChange(v); }}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>新建服务</SheetTitle>
          <SheetDescription>填写服务信息并配置详细内容</SheetDescription>
        </SheetHeader>

        <Section title="基本信息">
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">服务类型</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as 'atomic' | 'combo' }))}>
                  <SelectTrigger className="h-8 mt-0.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="atomic">原子服务</SelectItem>
                    <SelectItem value="combo">组合服务</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">服务 ID</Label>
                <Input value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} placeholder="如: my-service" className="h-8 mt-0.5" />
              </div>
            </div>
            <div>
              <Label className="text-xs">名称</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="服务名称" className="h-8 mt-0.5" />
            </div>
            <div>
              <Label className="text-xs">描述</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="服务描述" rows={2} className="mt-0.5" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">图标</Label>
                <Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className="h-8 mt-0.5" />
              </div>
              <div>
                <Label className="text-xs">SLA 等级</Label>
                <Select value={form.slaLevel} onValueChange={v => setForm(f => ({ ...f, slaLevel: v as 'gold' | 'silver' | 'bronze' }))}>
                  <SelectTrigger className="h-8 mt-0.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gold">金牌</SelectItem>
                    <SelectItem value="silver">银牌</SelectItem>
                    <SelectItem value="bronze">铜牌</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.type === 'atomic' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">领域</Label>
                  <Select value={form.domain} onValueChange={v => setForm(f => ({ ...f, domain: v }))}>
                    <SelectTrigger className="h-8 mt-0.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(DOMAIN_META).map(([k, m]) => (
                        <SelectItem key={k} value={k}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">类别</Label>
                  <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="类别名称" className="h-8 mt-0.5" />
                </div>
              </div>
            )}
          </div>
        </Section>

        {form.type === 'atomic' && (
          <>
            <Section title="输入/输出模板">
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
              新建原子服务后，系统会先按当前空白结构生成一套专属输入/输出模板首版。字段不再在这里手工录入，后续请到设置里的表单模板维护并绑定正式版本。
              </div>
            </Section>
          </>
        )}

        {form.type === 'combo' && (
          <>
            <Section title="输入/输出模板">
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                组合服务的输入/输出字段也将逐步迁移到模板治理。当前创建页不再直接手工录字段，后续请通过设置里的表单模板统一维护。
              </div>
            </Section>
            <Section title="交付流程">
              <div className="space-y-3">
                {comboFlow.map((node, i) => (
                  <div key={node.id} className="p-2 border rounded-md bg-muted/30 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                      <input value={node.label} onChange={e => setComboFlow(f => f.map((n, j) => j === i ? { ...n, label: e.target.value } : n))} className="h-7 px-2 text-xs border rounded w-28" placeholder="步骤名称" />
                      <input value={node.description} onChange={e => setComboFlow(f => f.map((n, j) => j === i ? { ...n, description: e.target.value } : n))} className="h-7 px-2 text-xs border rounded flex-1" placeholder="步骤描述" />
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setComboFlow(f => f.filter((_, j) => j !== i))}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                    {node.services.map((svc, si) => (
                      <div key={si} className="flex items-center gap-2 ml-6">
                        <select value={svc.specId} onChange={e => {
                          const newFlow = comboFlow.map((n, j) => j === i ? { ...n, services: n.services.map((s, sj) => sj === si ? { ...s, specId: e.target.value } : s) } : n);
                          setComboFlow(newFlow);
                        }} className="h-7 px-1 text-xs border rounded flex-1">
                          <option value="">关联服务...</option>
                          {allAtomic.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                          <input type="checkbox" checked={svc.required} onChange={e => {
                            const newFlow = comboFlow.map((n, j) => j === i ? { ...n, services: n.services.map((s, sj) => sj === si ? { ...s, required: e.target.checked } : s) } : n);
                            setComboFlow(newFlow);
                          }} className="h-3.5 w-3.5" />
                          必需
                        </label>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => {
                          const newFlow = comboFlow.map((n, j) => j === i ? { ...n, services: n.services.filter((_, sj) => sj !== si) } : n);
                          setComboFlow(newFlow);
                        }} disabled={node.services.length <= 1}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {node.services.length < 3 && (
                      <Button variant="outline" size="sm" className="h-5 text-[10px] ml-6" onClick={() => {
                        const newFlow = comboFlow.map((n, j) => j === i ? { ...n, services: [...n.services, { specId: '', required: true }] } : n);
                        setComboFlow(newFlow);
                      }}>+ 添加服务</Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setComboFlow(f => [...f, { id: `step-${Date.now()}`, label: '', description: '', order: f.length, dependencies: [], services: [{ specId: '', required: true }] }])}>+ 添加步骤</Button>
              </div>
            </Section>
          </>
        )}

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleCreate} disabled={!form.id || !form.name}>创建服务</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
