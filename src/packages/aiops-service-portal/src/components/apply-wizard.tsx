import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CircleHelp } from 'lucide-react';
import { ApplyPageShell } from './apply-page-shell';
import { type UploadedArtifact } from './artifact-panel';
import { ArchitectureArtifactField, formatArtifactSizeLabel } from './architecture-artifact-field';
import { createOrder, getResolvedSpecSchemaFields, getResolvedSpecSchemaLayout, getSpec } from '@aiops/shared/store';
import { useSpec } from '@aiops/shared/hooks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Textarea, Label, Badge, Input, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@aiops/shared/ui';
import { buildInitiationFormSnapshot, buildInitiationStageDetail, generateOrchestratedPlan, getApplyFieldStrategy, resolveApplyStrategy } from '@aiops/shared';
import type { IntegrationRequest, OrchestratedPlan, ComboServiceSpec, ResourceRequest, OrderAiAnalysisSummary, OrderAttachment } from '@aiops/shared';
import { TemplateFormLayout } from './template-form-layout';

type SubmissionDraft = {
  summary: string;
  estimatedTime: string;
  deliveryScope: string;
  reviewFocus: string;
  resources: ResourceRequest[];
  integrations: IntegrationRequest[];
};

type AnalysisSignal = {
  title: string;
  detail: string;
  tone: 'info' | 'warning' | 'success';
};

type ContainerPackageRecommendation = {
  packageName: string;
  summary: string;
  namespaceQuota: string;
  backend: { cpu: string; memory: string; instances: string };
  frontend?: { cpu: string; memory: string; instances: string };
  reasons: string[];
};

const INTEGRATION_LABELS: Record<IntegrationRequest['type'], string> = {
  monitor: '监控',
  logging: '日志',
  backup: '备份',
  security: '安全',
  pam: 'PAM',
};

function clonePlan(plan: OrchestratedPlan): OrchestratedPlan {
  return {
    summary: plan.summary,
    estimatedTime: plan.estimatedTime,
    resources: plan.resources.map(resource => ({
      ...resource,
      spec: { ...resource.spec },
    })),
    integrations: plan.integrations.map(integration => ({
      ...integration,
      config: { ...integration.config },
    })),
  };
}

function buildSubmissionDraft(plan: OrchestratedPlan): SubmissionDraft {
  return {
    summary: plan.summary,
    estimatedTime: plan.estimatedTime,
    deliveryScope: plan.resources.map(resource => `${resource.name}：${resource.purpose}`).join('\n'),
    reviewFocus: plan.integrations
      .filter(integration => integration.enabled)
      .map(integration => `${INTEGRATION_LABELS[integration.type]} 已纳入标准编排`)
      .join('\n'),
    resources: plan.resources.map(resource => ({
      ...resource,
      spec: { ...resource.spec },
    })),
    integrations: plan.integrations.map(integration => ({
      ...integration,
      config: { ...integration.config },
    })),
  };
}

function buildOrchestratedPlanFromDraft(draft: SubmissionDraft): OrchestratedPlan {
  return {
    summary: draft.summary,
    estimatedTime: draft.estimatedTime,
    resources: draft.resources.map(resource => ({
      ...resource,
      spec: { ...resource.spec },
    })),
    integrations: draft.integrations.map(integration => ({
      ...integration,
      config: { ...integration.config },
    })),
  };
}

function resolveContainerPackageRecommendation(environment: string): ContainerPackageRecommendation {
  switch (environment) {
    case 'PROD':
      return {
        packageName: '生产标准容器版',
        summary: '面向生产应用，默认按双可用区多实例部署规划容器资源。',
        namespaceQuota: '后端 12C / 24G，前端 4C / 8G，建议 Pod 配额 12 个',
        backend: { cpu: '4', memory: '8', instances: '3' },
        frontend: { cpu: '2', memory: '4', instances: '2' },
        reasons: ['生产环境', '多实例部署', '默认纳入日志/监控/备份建议'],
      };
    case 'UAT':
      return {
        packageName: '验收联调容器版',
        summary: '面向联调与验收，默认保留双实例与基础容量冗余。',
        namespaceQuota: '后端 4C / 8G，前端 2C / 4G，建议 Pod 配额 8 个',
        backend: { cpu: '2', memory: '4', instances: '2' },
        frontend: { cpu: '1', memory: '2', instances: '2' },
        reasons: ['UAT 环境', '双实例联调', '默认接入日志与监控'],
      };
    case 'DR':
      return {
        packageName: '容灾预备容器版',
        summary: '面向容灾预备环境，默认保留关键服务最小可运行容量。',
        namespaceQuota: '后端 8C / 16G，前端 2C / 4G，建议 Pod 配额 8 个',
        backend: { cpu: '4', memory: '8', instances: '2' },
        frontend: { cpu: '1', memory: '2', instances: '2' },
        reasons: ['容灾环境', '关键链路保留', '按切换预案预留容量'],
      };
    default:
      return {
        packageName: '开发轻量容器版',
        summary: '面向开发和功能验证，先给出最小可运行资源组合。',
        namespaceQuota: '后端 2C / 4G，前端 1C / 2G，建议 Pod 配额 4 个',
        backend: { cpu: '1', memory: '2', instances: '1' },
        frontend: { cpu: '1', memory: '1', instances: '1' },
        reasons: ['开发环境', '轻量验证', '标准日志与监控可按需开启'],
      };
  }
}

export function ApplyWizard() {
  const navigate = useNavigate();
  const { comboId } = useParams<{ comboId: string }>();

  const spec = useSpec(comboId ?? '') as ComboServiceSpec | undefined;
  const inputFields = spec ? getResolvedSpecSchemaFields(spec, 'input') : [];
  const inputLayout = spec ? getResolvedSpecSchemaLayout(spec, 'input') : { sections: [] };
  const aiConfig = spec?.assembly?.formConfig?.aiConfig ?? '';
  const services = spec?.assembly?.deliveryFlow?.flatMap(node =>
    node.services.map(serviceRef => getSpec(serviceRef.specId)?.name || serviceRef.specId),
  ) ?? [];

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [extrasValues, setExtrasValues] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    inputFields.filter(f => f.type === 'boolean').forEach(f => {
      defaults[f.key] = (f.defaultValue as boolean) ?? false;
    });
    return defaults;
  });
  const [businessGoal, setBusinessGoal] = useState('');
  const [targetEnvironment, setTargetEnvironment] = useState('PROD');
  const [priority, setPriority] = useState('high');
  const [timeRequirement, setTimeRequirement] = useState('standard');
  const [architectureArtifacts, setArchitectureArtifacts] = useState<UploadedArtifact[]>([]);
  const [plan, setPlan] = useState<OrchestratedPlan | null>(null);
  const [submissionDraft, setSubmissionDraft] = useState<SubmissionDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [goalHelpOpen, setGoalHelpOpen] = useState(false);
  const [expandedResourceIndex, setExpandedResourceIndex] = useState<number>(0);
  const [expandedDraftSection, setExpandedDraftSection] = useState<'summary' | 'scope' | 'review' | null>('summary');
  const steps = ['需求输入 + AI 分析', 'AI 建议确认', '提交申请'];
  const hasGeneratedPlan = !!plan && !!submissionDraft;
  const enabledIntegrationNames = useMemo(
    () => submissionDraft?.integrations.filter(item => item.enabled).map(item => INTEGRATION_LABELS[item.type]).join('、') ?? '',
    [submissionDraft],
  );
  const resourceCount = submissionDraft?.resources.length ?? 0;
  const enabledIntegrationCount = submissionDraft?.integrations.filter(item => item.enabled).length ?? 0;
  const hasArchitectureInput = architectureArtifacts.length > 0;
  const suggestedModeLabel = hasArchitectureInput
    ? '架构图优先'
    : '业务描述直填';
  const comboTags = spec?.tags || [];
  const hasContainerRecommendation = comboTags.some(tag => ['容器', 'PaaS'].includes(tag))
    || /容器|K8S|PaaS|集群/.test(spec?.name || '')
    || services.some(service => /容器|K8S|PaaS|集群/.test(service));
  const targetEnvironmentStrategy = spec ? getApplyFieldStrategy(spec, 'targetEnvironment') : undefined;
  const priorityStrategy = spec ? getApplyFieldStrategy(spec, 'priority') : undefined;
  const timeRequirementStrategy = spec ? getApplyFieldStrategy(spec, 'timeRequirement') : undefined;
  const architectureUploadStrategy = spec ? getApplyFieldStrategy(spec, 'architectureUpload') : undefined;
  const showTargetEnvironmentField = targetEnvironmentStrategy?.behavior !== 'hidden';
  const isTargetEnvironmentReadonly = targetEnvironmentStrategy?.behavior === 'readonly';
  const isPriorityReadonly = priorityStrategy?.behavior === 'readonly';
  const isTimeRequirementReadonly = timeRequirementStrategy?.behavior === 'readonly';
  const architectureUploadRequired = architectureUploadStrategy?.behavior === 'required';
  const timeRequirementLabelMap: Record<string, string> = {
    urgent: '紧急（24小时内）',
    high: '高优先（3个工作日内）',
    standard: '标准（1周内）',
    planned: '计划性需求（排期处理）',
  };
  const timeRequirementLabel = timeRequirementLabelMap[timeRequirement] ?? timeRequirementLabelMap.standard;
  const containerPackageRecommendation = useMemo(
    () => (hasContainerRecommendation ? resolveContainerPackageRecommendation(targetEnvironment) : null),
    [hasContainerRecommendation, targetEnvironment],
  );
  const previewText = (value: string, fallback: string) => {
    const compact = value.replace(/\s+/g, ' ').trim();
    if (!compact) return fallback;
    return compact.length > 72 ? `${compact.slice(0, 72)}...` : compact;
  };
  const analysisSignals = useMemo<AnalysisSignal[]>(() => {
    const signals: AnalysisSignal[] = [];
    const businessText = businessGoal.trim();

    if (hasArchitectureInput) {
      signals.push({
        title: '已检测到架构材料',
        detail: `已上传 ${architectureArtifacts.length} 份架构图，可作为环境拓扑和组件识别的主要依据。`,
        tone: 'success',
      });
    }

    if (businessText && /高可用|双活|容灾|生产|核心/.test(businessText)) {
      signals.push({
        title: '识别到高可靠性诉求',
        detail: '需求描述中包含生产、高可用或容灾关键词，后续推荐会优先检查节点数、备份和监控策略。',
        tone: 'success',
      });
    }

    if (!businessText) {
      signals.push({
        title: '业务目标尚未补充',
        detail: '建议先写清应用场景、期望效果和上线目标，再生成 AI 初稿。',
        tone: 'warning',
      });
    }

    return signals;
  }, [architectureArtifacts.length, businessGoal, hasArchitectureInput]);
  const confirmationRisks = useMemo(() => {
    const items: Array<{ title: string; detail: string; tone: 'warning' | 'info' | 'success' }> = [];

    if (targetEnvironment === 'PROD' && !hasArchitectureInput) {
      items.push({
        title: '生产环境缺少架构图',
        detail: '建议补充生产拓扑材料，避免遗漏高可用、网络边界和安全接入要求。',
        tone: 'warning',
      });
    }

    if (businessGoal.trim() && /高可用|容灾|双活/.test(businessGoal.trim())) {
      items.push({
        title: '识别到高可靠性诉求',
        detail: '请重点确认推荐资源的节点数、备份策略和监控能力是否满足高可用或容灾目标。',
        tone: 'success',
      });
    }

    if (items.length === 0) {
      items.push({
        title: '当前未识别高风险项',
        detail: '建议重点核对资源名称、用途说明和预计交付时长是否与本次申请一致。',
        tone: 'success',
      });
    }

    return items;
  }, [businessGoal, hasArchitectureInput, targetEnvironment]);

  const handleArchitectureFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setArchitectureArtifacts(current => ([
      ...current,
      {
        name: file.name,
        type: 'architecture',
        sizeLabel: formatArtifactSizeLabel(file, '已作为 AI 推荐增强输入引用'),
      },
    ]));
    event.target.value = '';
  };

  const removeArtifact = (type: 'architecture', index: number) => {
    setArchitectureArtifacts(current => current.filter((_, currentIndex) => currentIndex !== index));
  };

  useEffect(() => {
    if (!targetEnvironmentStrategy?.defaultValue) return;
    const nextValue = String(targetEnvironmentStrategy.defaultValue);
    setTargetEnvironment(current => current === nextValue ? current : nextValue);
  }, [targetEnvironmentStrategy?.defaultValue]);

  useEffect(() => {
    if (!priorityStrategy?.defaultValue) return;
    const nextValue = String(priorityStrategy.defaultValue);
    setPriority(current => current === nextValue ? current : nextValue);
  }, [priorityStrategy?.defaultValue]);

  useEffect(() => {
    if (!timeRequirementStrategy?.defaultValue) return;
    const nextValue = String(timeRequirementStrategy.defaultValue);
    setTimeRequirement(current => current === nextValue ? current : nextValue);
  }, [timeRequirementStrategy?.defaultValue]);

  if (!spec) return <div className="text-muted-foreground">组合不存在</div>;

  const handleGenerateAI = () => {
    if (!hasArchitectureInput) {
      setValidationMessage('请先上传架构图，当前环节已按必填处理。');
      return;
    }

    setValidationMessage(null);
    setLoading(true);
    setTimeout(() => {
      const generatedPlan = clonePlan(generateOrchestratedPlan(spec.id));
      const nextPlan = buildOrchestratedPlanFromDraft(
        submissionDraft
          ? {
              ...submissionDraft,
              summary: businessGoal.trim() ? `${generatedPlan.summary} · ${businessGoal.trim()}` : generatedPlan.summary,
              estimatedTime: timeRequirement === 'urgent'
                ? '1 个工作日内启动，2 个工作日内交付初版'
                : timeRequirement === 'high'
                  ? '3 个工作日内启动并输出初版方案'
                  : generatedPlan.estimatedTime,
              resources: generatedPlan.resources,
              integrations: generatedPlan.integrations,
            }
          : buildSubmissionDraft(generatedPlan),
      );
      const reviewPrefix = hasArchitectureInput
        ? '已依据架构图进入自动补全模式'
        : '已依据业务描述进入标准推荐模式';
      const containerScopeSuffix = containerPackageRecommendation
        ? `容器推荐：${containerPackageRecommendation.packageName}；后端 ${containerPackageRecommendation.backend.cpu}C/${containerPackageRecommendation.backend.memory}G × ${containerPackageRecommendation.backend.instances}${containerPackageRecommendation.frontend ? `；前端 ${containerPackageRecommendation.frontend.cpu}C/${containerPackageRecommendation.frontend.memory}G × ${containerPackageRecommendation.frontend.instances}` : ''}；命名空间配额 ${containerPackageRecommendation.namespaceQuota}`
        : '';
      const scopeSuffix = [
        businessGoal.trim() ? `业务目标：${businessGoal.trim()}` : '',
        `时效要求：${timeRequirementLabel}`,
        hasArchitectureInput ? `已上传 ${architectureArtifacts.length} 份架构图` : '',
        containerScopeSuffix,
      ].filter(Boolean).join('；');
      const containerReviewSuffix = containerPackageRecommendation
        ? `；容器套餐=${containerPackageRecommendation.packageName}`
        : '';
      setPlan(nextPlan);
      setSubmissionDraft(currentDraft => currentDraft
        ? {
            ...currentDraft,
            summary: nextPlan.summary,
            estimatedTime: nextPlan.estimatedTime,
            deliveryScope: scopeSuffix ? `${currentDraft.deliveryScope}\n${scopeSuffix}` : currentDraft.deliveryScope,
            reviewFocus: `${reviewPrefix}，请重点确认环境=${targetEnvironment}、优先级=${priority}、时效=${timeRequirementLabel}${containerReviewSuffix}`,
            resources: nextPlan.resources.map(resource => ({ ...resource, spec: { ...resource.spec } })),
            integrations: nextPlan.integrations.map(integration => ({ ...integration, config: { ...integration.config } })),
          }
        : {
            ...buildSubmissionDraft(nextPlan),
            deliveryScope: scopeSuffix ? `${buildSubmissionDraft(nextPlan).deliveryScope}\n${scopeSuffix}` : buildSubmissionDraft(nextPlan).deliveryScope,
            reviewFocus: `${reviewPrefix}，请重点确认环境=${targetEnvironment}、优先级=${priority}、时效=${timeRequirementLabel}${containerReviewSuffix}`,
          });
      setExpandedResourceIndex(0);
      setExpandedDraftSection('summary');
      setLoading(false);
      setStep(1);
    }, 1500);
  };

  const handleSubmit = () => {
    const finalPlan = submissionDraft ? buildOrchestratedPlanFromDraft(submissionDraft) : undefined;
    const submittedAt = new Date().toLocaleString('zh-CN');
    const attachments: OrderAttachment[] = [
      ...architectureArtifacts.map((artifact, index) => ({
        id: `arch-${index + 1}`,
        name: artifact.name,
        kind: 'architecture' as const,
        fileType: 'image/png',
        sizeLabel: artifact.sizeLabel,
        uploadedAt: new Date().toLocaleString('zh-CN'),
        source: 'user-upload' as const,
        parseStatus: 'parsed' as const,
      })),
    ];
    const aiAnalysisSummary: OrderAiAnalysisSummary = {
      mode: hasArchitectureInput ? 'architecture_first' : 'business_only',
      summary: submissionDraft?.summary || plan?.summary || '已生成申请初稿',
      highlights: [
        `目标环境：${targetEnvironment}`,
        `优先级：${priority}`,
        `时效要求：${timeRequirementLabel}`,
      ],
      missingItems: confirmationRisks
        .filter(item => item.tone !== 'success')
        .map(item => item.title),
      riskHints: confirmationRisks.map(item => item.detail),
    };
    const initiationValues: Record<string, string | boolean | undefined> = {
      ...answers,
      ...extrasValues,
      businessGoal,
      environment: targetEnvironment,
      priority,
      timeRequirement,
      applicationName: answers.applicationName || answers.systemName || spec.name,
      systemName: answers.systemName || answers.applicationName || spec.name,
      moduleName: answers.moduleName,
      owner: answers.owner,
      assignee: answers.assignee,
    };
    const initiationForm = buildInitiationFormSnapshot({
      workflowMode: 'combo_general',
      submittedAt,
      values: initiationValues,
      schemaVersion: spec.inputTemplateVersionId || spec.version,
    });
    const initiationStageDetail = buildInitiationStageDetail({
      workflowMode: 'combo_general',
      submittedAt,
      values: initiationValues,
      attachments,
      aiAnalysisSummary,
      reviewFocus: confirmationRisks.map(item => item.title),
      steps: [
        {
          stepCode: 'input',
          stepName: '需求输入',
          status: 'completed',
          summary: hasArchitectureInput ? `已上传 ${architectureArtifacts.length} 份架构图并完成需求补充` : '已完成业务描述录入',
          enteredAt: submittedAt,
          completedAt: submittedAt,
        },
        {
          stepCode: 'ai-analysis',
          stepName: 'AI分析',
          status: 'completed',
          summary: aiAnalysisSummary.summary,
          enteredAt: submittedAt,
          completedAt: submittedAt,
        },
      ],
      schemaVersion: spec.inputTemplateVersionId || spec.version,
    });
    const order = createOrder({
      comboId: spec.id,
      comboName: spec.name,
      services,
      aiConfig,
      answers,
      extras: extrasValues,
      attachments,
      aiAnalysisSummary,
      initiationForm,
      initiationStageDetail,
      orchestratedPlan: finalPlan,
      sourceSpecId: spec.id,
      formSchemaVersion: spec.inputTemplateVersionId || spec.version,
      outputSchemaVersion: spec.outputTemplateVersionId || spec.version,
    });
    setOrderId(order.id);
    setStep(2);
  };

  const updateSubmissionField = (field: keyof Omit<SubmissionDraft, 'resources' | 'integrations'>, value: string) => {
    setSubmissionDraft(current => current ? { ...current, [field]: value } : current);
  };

  const updateResource = (index: number, key: keyof ResourceRequest, value: string) => {
    setSubmissionDraft(current => {
      if (!current) return current;
      const nextResources = current.resources.map((resource, resourceIndex) => {
        if (resourceIndex !== index) return resource;
        if (key === 'name' || key === 'purpose') {
          return { ...resource, [key]: value };
        }
        return resource;
      });
      return { ...current, resources: nextResources };
    });
  };

  const updateResourceSpec = (resourceIndex: number, specKey: string, value: string) => {
    setSubmissionDraft(current => {
      if (!current) return current;
      const nextResources = current.resources.map((resource, index) => {
        if (index !== resourceIndex) return resource;
        return {
          ...resource,
          spec: {
            ...resource.spec,
            [specKey]: value,
          },
        };
      });
      return { ...current, resources: nextResources };
    });
  };

  const updateIntegrationEnabled = (integrationIndex: number, enabled: boolean) => {
    setSubmissionDraft(current => {
      if (!current) return current;
      const nextIntegrations = current.integrations.map((integration, index) => (
        index === integrationIndex ? { ...integration, enabled } : integration
      ));
      return { ...current, integrations: nextIntegrations };
    });
  };

  const updateIntegrationConfig = (integrationIndex: number, configKey: string, value: string) => {
    setSubmissionDraft(current => {
      if (!current) return current;
      const nextIntegrations = current.integrations.map((integration, index) => {
        if (index !== integrationIndex) return integration;
        return {
          ...integration,
          config: {
            ...integration.config,
            [configKey]: value,
          },
        };
      });
      return { ...current, integrations: nextIntegrations };
    });
  };

  return (
    <ApplyPageShell className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">组合服务申请工作台</div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-2.5 py-1">需求输入 + AI 分析</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">AI 建议确认</span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">提交申请</span>
          </div>
        </div>
        <div className="flex items-center gap-0">
        {steps.map((label, i) => (
          <div key={i} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
                i < step
                  ? 'bg-primary text-primary-foreground'
                  : i === step
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {i < step ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`whitespace-nowrap text-sm ${
                i <= step ? 'font-medium text-foreground' : 'text-muted-foreground'
              }`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-4 h-px flex-1 transition-colors ${
                i < step ? 'bg-primary' : 'bg-border'
              }`} />
            )}
          </div>
        ))}
        </div>
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">{spec.icon} {spec.name}</CardTitle>
                  <CardDescription className="mt-1">补充需求后生成建议并确认提交。</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">资源 {services.length} 项服务组合</Badge>
                  {hasGeneratedPlan ? <Badge className="bg-cyan-100 text-cyan-700 hover:bg-cyan-100">AI建议已生成</Badge> : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">1. 需求输入</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">补充目标、环境、时效和架构材料。</div>
                  </div>
                  <Badge variant="outline">{suggestedModeLabel}</Badge>
                </div>
                <div className="space-y-4">
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="business-goal">业务目标 / 场景说明</Label>
                        <button
                          type="button"
                          aria-label="查看填写说明"
                          onClick={() => setGoalHelpOpen(true)}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-700"
                        >
                          <CircleHelp className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <Textarea
                        id="business-goal"
                        rows={4}
                        className="min-h-[110px]"
                        value={businessGoal}
                        onChange={event => setBusinessGoal(event.target.value)}
                        placeholder="例如：为核心订单系统建设生产环境中间件与数据库资源，支持双机房高可用和日志监控接入。"
                      />
                      {!businessGoal.trim() ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-xs leading-5 text-slate-700">
                          请先补充业务目标，便于生成更准确的建议。
                        </div>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                      {showTargetEnvironmentField ? (
                        <div className="space-y-2">
                          <Label htmlFor="target-environment">目标环境</Label>
                          {isTargetEnvironmentReadonly ? (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium text-slate-900">{targetEnvironment}</span>
                                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600">场景锁定</span>
                              </div>
                            </div>
                          ) : (
                            <select
                              id="target-environment"
                              value={targetEnvironment}
                              onChange={event => setTargetEnvironment(event.target.value)}
                              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm"
                            >
                              <option value="DEV">DEV 开发</option>
                              <option value="UAT">UAT 验收</option>
                              <option value="PROD">PROD 生产</option>
                              <option value="DR">DR 容灾</option>
                            </select>
                      )}
                        </div>
                      ) : null}
                      <div className="space-y-2">
                        <Label htmlFor="priority">优先级</Label>
                        {isPriorityReadonly ? (
                          <div className="flex h-10 items-center rounded-lg border border-border bg-slate-50 px-3 text-sm text-slate-700">
                            {priority}
                          </div>
                        ) : (
                          <select
                            id="priority"
                            value={priority}
                            onChange={event => setPriority(event.target.value)}
                            className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm"
                          >
                            <option value="urgent">紧急</option>
                            <option value="high">高</option>
                            <option value="normal">中</option>
                            <option value="low">低</option>
                          </select>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="time-requirement">时效要求</Label>
                        {isTimeRequirementReadonly ? (
                          <div className="flex h-10 items-center rounded-lg border border-border bg-slate-50 px-3 text-sm text-slate-700">
                            {timeRequirementLabel}
                          </div>
                        ) : (
                          <select
                            id="time-requirement"
                            value={timeRequirement}
                            onChange={event => setTimeRequirement(event.target.value)}
                            className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm"
                          >
                            <option value="urgent">紧急（24小时内）</option>
                            <option value="high">高优先（3个工作日内）</option>
                            <option value="standard">标准（1周内）</option>
                            <option value="planned">计划性需求（排期处理）</option>
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  <TemplateFormLayout
                    fields={inputFields}
                    layout={inputLayout}
                    textValues={answers}
                    setTextValues={setAnswers}
                    booleanValues={extrasValues}
                    setBooleanValues={setExtrasValues}
                    columns={1}
                    flat
                  />

                  {containerPackageRecommendation ? (
                    <div className="rounded-2xl border border-sky-200 bg-[linear-gradient(180deg,rgba(240,249,255,0.95)_0%,rgba(255,255,255,0.98)_100%)] p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-600">容器资源推荐</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-slate-900">{containerPackageRecommendation.packageName}</div>
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                              已按环境带出
                            </span>
                          </div>
                          <div className="mt-1 text-xs leading-5 text-slate-600">
                            {containerPackageRecommendation.summary}
                          </div>
                        </div>
                        <div className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs text-slate-700">
                          <span className="font-medium text-slate-900">命名空间配额：</span>
                          {containerPackageRecommendation.namespaceQuota}
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-sky-100 bg-white px-3 py-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">后端容器</div>
                          <div className="mt-2 text-sm text-slate-900">
                            {containerPackageRecommendation.backend.cpu}C / {containerPackageRecommendation.backend.memory}G / {containerPackageRecommendation.backend.instances} 实例
                          </div>
                        </div>
                        {containerPackageRecommendation.frontend ? (
                          <div className="rounded-xl border border-sky-100 bg-white px-3 py-3">
                            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">前端容器</div>
                            <div className="mt-2 text-sm text-slate-900">
                              {containerPackageRecommendation.frontend.cpu}C / {containerPackageRecommendation.frontend.memory}G / {containerPackageRecommendation.frontend.instances} 实例
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {containerPackageRecommendation.reasons.map(reason => (
                          <span key={reason} className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-xs text-slate-700">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-3">
                    <ArchitectureArtifactField
                      required
                      description={hasArchitectureInput ? '已上传架构图，系统会优先按拓扑材料生成建议。' : '请上传架构图，用于识别组件关系、网络边界和高可用拓扑。'}
                      artifacts={architectureArtifacts}
                      emptyHint="请上传按模板补充完成的架构图后再进入完整分析。"
                      hintText="请直接基于平台提供的架构图模版补充内容，保留模板里的参考元素，避免用户不知道如何填写。"
                      inputId="combo-architecture-file-upload"
                      onFileChange={handleArchitectureFileChange}
                      extraActions={(
                        <button
                          type="button"
                          onClick={() => setGoalHelpOpen(true)}
                          className="inline-flex h-8 items-center rounded-full px-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
                        >
                          查看示例
                        </button>
                      )}
                      onRemove={index => removeArtifact('architecture', index)}
                    />
                  </div>
                  <div className="space-y-2">
                    {analysisSignals
                      .filter(signal => signal.title === '已检测到架构材料')
                      .map(signal => (
                        <div key={signal.title} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">
                          <span className="font-medium text-slate-900">{signal.title}</span>
                          <span className="ml-2">{signal.detail}</span>
                        </div>
                      ))}
                  </div>
                  {validationMessage ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      {validationMessage}
                    </div>
                  ) : null}
                  <div className="flex justify-end pt-1">
                    <Button onClick={handleGenerateAI} disabled={loading} size="sm" className="min-w-[180px] px-5">
                      {hasGeneratedPlan ? '重新生成并查看 AI 建议' : '生成并查看 AI 建议'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">AI 建议确认</CardTitle>
                  <CardDescription className="mt-1">确认建议结果后提交，必要时可返回上一步修改。</CardDescription>
                  </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-cyan-100 text-cyan-700 hover:bg-cyan-100">AI 建议阶段</Badge>
                  {submissionDraft ? <Badge variant="outline">{resourceCount} 个资源 / {enabledIntegrationCount} 个集成</Badge> : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {loading ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-10 text-center">
                  <div className="mb-3 text-4xl animate-pulse">🤖</div>
                  <p className="text-sm text-muted-foreground">AI 正在分析需求并生成建议内容...</p>
                </div>
              ) : submissionDraft && plan ? (
                <div className="space-y-3.5">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1.25fr)_repeat(3,minmax(0,0.28fr))]">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                      <div className="text-sm font-semibold text-slate-900">系统建议概览</div>
                      <div className="mt-2 text-sm leading-6 text-slate-600">{plan.summary}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">环境</div>
                      <div className="mt-1 text-base font-semibold text-slate-900">{targetEnvironment}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">资源项</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">{plan.resources.length}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">预计交付</div>
                      <div className="mt-1 text-base font-semibold text-slate-900">{plan.estimatedTime}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5">
                    <div className="text-sm font-semibold text-slate-900">重点确认</div>
                    <div className="mt-2.5 space-y-2">
                      {confirmationRisks.map(item => (
                        <div
                          key={item.title}
                          className={`rounded-xl border px-3 py-2.5 ${
                            item.tone === 'warning'
                              ? 'border-amber-200 bg-white'
                              : item.tone === 'success'
                                ? 'border-emerald-200 bg-white'
                                : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="text-sm font-medium text-slate-900">{item.title}</div>
                          <div className="mt-1 text-xs leading-5 text-slate-600">{item.detail}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3.5 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Label htmlFor="submission-summary">提交摘要</Label>
                          <div className="mt-1 text-sm leading-6 text-slate-600">
                            {previewText(submissionDraft.summary, '尚未补充提交摘要')}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0 rounded-full px-2.5 text-xs text-slate-500"
                          onClick={() => setExpandedDraftSection(current => current === 'summary' ? null : 'summary')}
                        >
                          {expandedDraftSection === 'summary' ? '收起编辑' : '编辑'}
                        </Button>
                      </div>
                      {expandedDraftSection === 'summary' ? (
                        <Textarea
                          id="submission-summary"
                          rows={4}
                          className="mt-3 min-h-[110px] border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                          value={submissionDraft.summary}
                          onChange={event => updateSubmissionField('summary', event.target.value)}
                          placeholder="编辑最终提交摘要"
                        />
                      ) : null}
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Label htmlFor="submission-scope">交付范围说明</Label>
                          <div className="mt-1 text-sm leading-6 text-slate-600">
                            {previewText(submissionDraft.deliveryScope, '尚未补充交付范围说明')}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0 rounded-full px-2.5 text-xs text-slate-500"
                          onClick={() => setExpandedDraftSection(current => current === 'scope' ? null : 'scope')}
                        >
                          {expandedDraftSection === 'scope' ? '收起编辑' : '编辑'}
                        </Button>
                      </div>
                      {expandedDraftSection === 'scope' ? (
                        <Textarea
                          id="submission-scope"
                          rows={5}
                          className="mt-3 min-h-[132px] border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                          value={submissionDraft.deliveryScope}
                          onChange={event => updateSubmissionField('deliveryScope', event.target.value)}
                          placeholder="说明本次申请需要交付的能力、资源与范围"
                        />
                      ) : null}
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Label htmlFor="submission-review-focus">评审关注点</Label>
                          <div className="mt-1 text-sm leading-6 text-slate-600">
                            {previewText(submissionDraft.reviewFocus, '尚未补充评审关注点')}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0 rounded-full px-2.5 text-xs text-slate-500"
                          onClick={() => setExpandedDraftSection(current => current === 'review' ? null : 'review')}
                        >
                          {expandedDraftSection === 'review' ? '收起编辑' : '编辑'}
                        </Button>
                      </div>
                      {expandedDraftSection === 'review' ? (
                        <Textarea
                          id="submission-review-focus"
                          rows={4}
                          className="mt-3 min-h-[110px] border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                          value={submissionDraft.reviewFocus}
                          onChange={event => updateSubmissionField('reviewFocus', event.target.value)}
                          placeholder="补充风险、依赖、审批需要重点关注的事项"
                        />
                      ) : null}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="submission-estimated-time">预计交付时长</Label>
                        <Input
                          id="submission-estimated-time"
                          value={submissionDraft.estimatedTime}
                          onChange={event => updateSubmissionField('estimatedTime', event.target.value)}
                          placeholder="例如 2 个工作日"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>默认交付能力</Label>
                        <div className="flex min-h-10 items-center rounded-lg border border-border bg-white px-3 text-sm text-slate-600">
                          {enabledIntegrationNames || '监控、日志、备份等能力将按平台默认策略处理'}
                        </div>
                      </div>
                    </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">推荐资源清单</div>
                          <div className="mt-1 text-xs leading-5 text-slate-500">按申请视角核对并调整推荐结果。</div>
                        </div>
                        <Badge variant="outline">主编辑区</Badge>
                      </div>
                      <div className="space-y-3">
                        {submissionDraft.resources.map((resource, index) => (
                          <div key={`${resource.name}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="text-sm font-semibold text-slate-900">{resource.name}</div>
                                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] text-slate-500">{resource.type}</span>
                                </div>
                                <div className="mt-1 text-xs leading-5 text-slate-500">{resource.purpose}</div>
                                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-slate-500">
                                  {Object.entries(resource.spec).map(([key, value]) => (
                                    <span key={key}>
                                      <span className="text-slate-400">{key}</span>
                                      <span className="ml-1 font-medium text-slate-700">{value}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="shrink-0 rounded-full px-2.5 text-xs text-slate-500"
                                onClick={() => setExpandedResourceIndex(current => current === index ? -1 : index)}
                              >
                                {expandedResourceIndex === index ? '收起编辑' : '展开编辑'}
                              </Button>
                            </div>

                            {expandedResourceIndex === index ? (
                              <div className="mt-4 border-t border-slate-200 pt-4">
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label htmlFor={`resource-name-${index}`}>资源名称</Label>
                                    <Input
                                      id={`resource-name-${index}`}
                                      value={resource.name}
                                      onChange={event => updateResource(index, 'name', event.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`resource-purpose-${index}`}>用途说明</Label>
                                    <Textarea
                                      id={`resource-purpose-${index}`}
                                      rows={3}
                                      className="min-h-[92px]"
                                      value={resource.purpose}
                                      onChange={event => updateResource(index, 'purpose', event.target.value)}
                                      placeholder="补充这项资源的业务用途"
                                    />
                                  </div>
                                </div>
                                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                  {Object.entries(resource.spec).map(([key, value]) => (
                                    <div key={key} className="space-y-2">
                                      <Label htmlFor={`resource-spec-${index}-${key}`}>{key}</Label>
                                      <Input
                                        id={`resource-spec-${index}-${key}`}
                                        value={value}
                                        onChange={event => updateResourceSpec(index, key, event.target.value)}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col justify-end gap-2 sm:flex-row">
                    <Button variant="outline" size="sm" className="sm:w-auto sm:min-w-[148px]" onClick={() => setStep(0)}>返回上一步</Button>
                    <Button size="sm" className="sm:w-auto sm:min-w-[128px]" onClick={handleSubmit}>提交申请</Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6">
                  <div className="text-sm font-semibold text-slate-900">建议结果尚未生成</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">请先生成 AI 建议，再进入确认阶段。</div>
                  <div className="mt-4">
                    <Button variant="outline" onClick={() => setStep(0)}>返回填写需求</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {step === 2 && orderId && (
        <Card>
          <CardContent className="py-10">
            <div className="mx-auto max-w-xl rounded-[28px] border border-emerald-200 bg-[linear-gradient(180deg,#F4FFF7_0%,#FFFFFF_100%)] px-6 py-8 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-light">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">已提交</div>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">需求已进入流转</h2>
              <p className="mt-2 text-sm text-slate-600">
                工单号：<span className="font-mono font-medium text-primary">{orderId}</span>
              </p>
              <div className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-3 text-left">
                <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
                  <div className="text-[11px] text-slate-500">下一步</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">查看审批与方案确认</div>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
                  <div className="text-[11px] text-slate-500">资产状态</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">交付后进入待验收</div>
                </div>
              </div>
              <div className="mt-6 flex justify-center gap-3">
                <Button variant="outline" onClick={() => navigate('/orders')}>查看我的工单</Button>
                <Button onClick={() => navigate(`/order/${orderId}`)}>查看工单详情</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={goalHelpOpen} onOpenChange={setGoalHelpOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>业务目标填写说明</DialogTitle>
            <DialogDescription>
              这里建议写清业务背景和期望结果，AI 会据此结合架构图、配置材料生成建议。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm leading-6 text-slate-700">
            <div>1. 说明本次要支撑的业务或系统，例如订单、支付、数据分析、测试环境搭建。</div>
            <div>2. 说明目标环境和上线目标，例如开发验证、UAT联调、生产扩容、容灾建设。</div>
            <div>3. 写清期望效果，例如高可用、双机房、日志监控接入、备份恢复、安全接入。</div>
            <div>4. 如果已有现状架构图、目标部署图或客户配置模板，建议一并上传，系统会据此补全和校验。</div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
              示例：为核心订单系统新增生产环境缓存与数据库资源，要求双可用区部署，并纳入监控、日志和备份体系。
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ApplyPageShell>
  );
}
