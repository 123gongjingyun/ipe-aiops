import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Monitor, Smartphone, Code, Server, Cloud, Database, Shield, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, Label, Textarea, Switch } from '@aiops/shared/ui';
import { buildInitiationFormSnapshot, buildInitiationStageDetail } from '@aiops/shared';
import { createOrder } from '@aiops/shared/store';
import { derivePackageRecommendation, deriveSimulationAssessment, NetworkChainProgress } from '@aiops/shared/workflow';
import { generateInternetAppDetail } from '@aiops/shared';
import type { InternetAppDeployDetail, NetworkChainNode } from '@aiops/shared';
import { ApplyPageShell } from './apply-page-shell';

const TARGET_ENVS = ['PROD', 'DEV', 'SIT', 'UAT', 'PERM'] as const;

const APP_TYPES = [
  { key: 'PC Web', label: 'PC Web', icon: Monitor },
  { key: '移动端', label: '移动端 H5', icon: Smartphone },
  { key: '小程序', label: '微信小程序', icon: Code },
  { key: 'API服务', label: 'API 服务', icon: Server },
  { key: '其他', label: '其他', icon: Globe },
];

const STEP_COLORS = [
  'bg-red-50 border-red-200',
  'bg-blue-50 border-blue-200',
  'bg-green-50 border-green-200',
  'bg-orange-50 border-orange-200',
  'bg-purple-50 border-purple-200',
];

function EditableField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
}) {
  return (
    <label className="space-y-1.5">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="flex items-center gap-2">
        <Input value={value} onChange={event => onChange(event.target.value)} className="h-9 bg-white" />
        {suffix ? <span className="shrink-0 text-xs text-slate-500">{suffix}</span> : null}
      </div>
    </label>
  );
}

function SummaryCard({
  title,
  index,
  tone,
  children,
}: {
  title: string;
  index: number;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border-2 p-4 ${tone}`}>
      <h3 className="mb-3 flex items-center gap-2 font-semibold">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-white">{index}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function ChainNodeEditor({
  node,
  onChange,
  onToggleEnabled,
}: {
  node: NetworkChainNode;
  onChange: (node: NetworkChainNode) => void;
  onToggleEnabled: () => void;
}) {
  const updateConfigEntry = (key: string, value: string) => {
    onChange({
      ...node,
      config: {
        ...node.config,
        [key]: value,
      },
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px_140px]">
        <EditableField label="链路节点" value={node.name} onChange={value => onChange({ ...node, name: value })} />
        <label className="space-y-1.5">
          <div className="text-xs text-slate-500">交付方式</div>
          <select
            value={node.deliveryMode}
            onChange={event => onChange({ ...node, deliveryMode: event.target.value as NetworkChainNode['deliveryMode'] })}
            className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
          >
            <option value="ai">AI</option>
            <option value="manual">人工</option>
          </select>
        </label>
        <label className="space-y-1.5">
          <div className="text-xs text-slate-500">是否必需</div>
          <select
            value={node.required ? 'true' : 'false'}
            onChange={event => onChange({ ...node, required: event.target.value === 'true' })}
            className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
          >
            <option value="true">必需</option>
            <option value="false">可选</option>
          </select>
        </label>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <EditableField label="交付标签" value={node.label} onChange={value => onChange({ ...node, label: value })} />
        <label className="space-y-1.5">
          <div className="text-xs text-slate-500">当前状态</div>
          <select
            value={node.status}
            onChange={event => onChange({ ...node, status: event.target.value as NetworkChainNode['status'] })}
            className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm"
          >
            <option value="pending">待处理</option>
            <option value="processing">处理中</option>
            <option value="completed">已完成</option>
          </select>
        </label>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {Object.entries(node.config).map(([key, value]) => (
          <EditableField
            key={`${node.id}-${key}`}
            label={key}
            value={value}
            onChange={nextValue => updateConfigEntry(key, nextValue)}
          />
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button type="button" variant="outline" onClick={onToggleEnabled}>
          {node.required ? '设为本次跳过' : '恢复本次启用'}
        </Button>
      </div>
    </div>
  );
}

export function InternetAppWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Step 0: 应用信息
  const [appName, setAppName] = useState('');
  const [system, setSystem] = useState('');
  const [targetEnv, setTargetEnv] = useState<string>('PROD');
  const [appType, setAppType] = useState<string>('PC Web');
  const [businessDomain, setBusinessDomain] = useState('');
  const [scale, setScale] = useState<string>('medium');
  const [useDuration, setUseDuration] = useState<string>('6-12个月');
  const [businessCriticality, setBusinessCriticality] = useState<string>('standard');

  // Step 3: 网络发布
  const [domain, setDomain] = useState('');
  const [ports, setPorts] = useState('80,443');
  const [cdnEnabled, setCdnEnabled] = useState(false);
  const [cloudPlatform, setCloudPlatform] = useState('');
  const [cloudVpc, setCloudVpc] = useState('');
  const [cloudSubnet, setCloudSubnet] = useState('');
  const [backendCpu, setBackendCpu] = useState('');
  const [backendMemory, setBackendMemory] = useState('');
  const [backendInstances, setBackendInstances] = useState('');
  const [frontendCpu, setFrontendCpu] = useState('');
  const [frontendMemory, setFrontendMemory] = useState('');
  const [frontendInstances, setFrontendInstances] = useState('');
  const [mysqlSpec, setMysqlSpec] = useState('');
  const [mysqlStorage, setMysqlStorage] = useState('');
  const [mysqlVersion, setMysqlVersion] = useState('');
  const [mysqlHa, setMysqlHa] = useState('');
  const [redisSpec, setRedisSpec] = useState('');
  const [redisMemory, setRedisMemory] = useState('');
  const [redisVersion, setRedisVersion] = useState('');
  const [redisHa, setRedisHa] = useState('');
  const [editableNetworkChain, setEditableNetworkChain] = useState<NetworkChainNode[]>([]);
  const [selectedChainNodeId, setSelectedChainNodeId] = useState<string | null>(null);
  const [chainEditorOpen, setChainEditorOpen] = useState(false);

  const canNextStep0 = appName && system && targetEnv && appType && businessDomain;
  const canNextStep3 = domain && ports;

  const previewData = generateInternetAppDetail(
    appName || '示例应用',
    system || '示例系统',
    targetEnv,
    appType,
    businessDomain || '示例域',
    domain || 'app.example.com',
    ports,
    cdnEnabled,
  );

  const syncEditableRecommendations = () => {
    setCloudPlatform(previewData.cloudInfra.platform);
    setCloudVpc(previewData.cloudInfra.vpc);
    setCloudSubnet(previewData.cloudInfra.subnet);
    setBackendCpu(String(previewData.backendContainer.cpu));
    setBackendMemory(String(previewData.backendContainer.memory));
    setBackendInstances(String(previewData.backendContainer.instances));
    setFrontendCpu(String(previewData.frontendContainer?.cpu ?? ''));
    setFrontendMemory(String(previewData.frontendContainer?.memory ?? ''));
    setFrontendInstances(String(previewData.frontendContainer?.instances ?? ''));
    setMysqlSpec(previewData.mysql.spec);
    setMysqlStorage(previewData.mysql.storage);
    setMysqlVersion(previewData.mysql.version);
    setMysqlHa(previewData.mysql.ha);
    setRedisSpec(previewData.redis.spec);
    setRedisMemory(previewData.redis.memory);
    setRedisVersion(previewData.redis.version);
    setRedisHa(previewData.redis.ha);
    setEditableNetworkChain(previewData.networkChain.map(node => ({
      ...node,
      config: { ...node.config },
      deliveryDetail: node.deliveryDetail ? { ...node.deliveryDetail } : undefined,
    })));
    setSelectedChainNodeId(previewData.networkChain[0]?.id ?? null);
    setChainEditorOpen(false);
  };

  const currentDetail = useMemo<InternetAppDeployDetail>(() => ({
    ...previewData,
    cloudInfra: {
      platform: cloudPlatform || previewData.cloudInfra.platform,
      vpc: cloudVpc || previewData.cloudInfra.vpc,
      subnet: cloudSubnet || previewData.cloudInfra.subnet,
    },
    backendContainer: {
      cpu: Number(backendCpu) || previewData.backendContainer.cpu,
      memory: Number(backendMemory) || previewData.backendContainer.memory,
      instances: Number(backendInstances) || previewData.backendContainer.instances,
    },
    frontendContainer: previewData.frontendContainer
      ? {
          cpu: Number(frontendCpu) || previewData.frontendContainer.cpu,
          memory: Number(frontendMemory) || previewData.frontendContainer.memory,
          instances: Number(frontendInstances) || previewData.frontendContainer.instances,
        }
      : undefined,
    mysql: {
      ...previewData.mysql,
      spec: mysqlSpec || previewData.mysql.spec,
      storage: mysqlStorage || previewData.mysql.storage,
      version: mysqlVersion || previewData.mysql.version,
      ha: mysqlHa || previewData.mysql.ha,
    },
    redis: {
      ...previewData.redis,
      spec: redisSpec || previewData.redis.spec,
      memory: redisMemory || previewData.redis.memory,
      version: redisVersion || previewData.redis.version,
      ha: redisHa || previewData.redis.ha,
    },
    networkChain: editableNetworkChain.length > 0
      ? editableNetworkChain.map(node => ({
          ...node,
          config: { ...node.config },
          deliveryDetail: node.deliveryDetail ? { ...node.deliveryDetail } : undefined,
        }))
      : previewData.networkChain,
  }), [
    previewData,
    cloudPlatform,
    cloudVpc,
    cloudSubnet,
    backendCpu,
    backendMemory,
    backendInstances,
    frontendCpu,
    frontendMemory,
    frontendInstances,
    mysqlSpec,
    mysqlStorage,
    mysqlVersion,
    mysqlHa,
    redisSpec,
    redisMemory,
    redisVersion,
    redisHa,
    editableNetworkChain,
  ]);

  const handleSubmit = () => {
    const detail = currentDetail;
    const submittedAt = new Date().toLocaleString('zh-CN');
    const initiationValues: Record<string, string | boolean | undefined> = {
      applicationName: appName,
      systemName: system,
      environment: targetEnv,
      appType,
      businessDomain,
      domainName: domain,
      listenerPort: ports,
      scale,
      usageDuration: useDuration,
      businessCriticality,
      publicAccess: true,
      cdnEnabled,
    };
    const initiationForm = buildInitiationFormSnapshot({
      workflowMode: 'internet_app',
      submittedAt,
      values: initiationValues,
      schemaVersion: '1.0.0',
    });
    const initiationStageDetail = buildInitiationStageDetail({
      workflowMode: 'internet_app',
      submittedAt,
      values: initiationValues,
      reviewFocus: [
        `网络发布域名=${domain || '未填写'}`,
        `链路节点数=${currentDetail.networkChain.length}`,
        `MySQL=${currentDetail.mysql.spec}`,
        `Redis=${currentDetail.redis.spec}`,
      ],
      steps: [
        {
          stepCode: 'app-info',
          stepName: '应用信息确认',
          status: 'completed',
          summary: `已确认 ${appType} 应用的基础信息与业务域`,
          enteredAt: submittedAt,
          completedAt: submittedAt,
        },
        {
          stepCode: 'topology-plan',
          stepName: '拓扑与资源建议',
          status: 'completed',
          summary: `已生成 ${currentDetail.networkChain.length} 个链路节点的部署建议`,
          enteredAt: submittedAt,
          completedAt: submittedAt,
        },
      ],
      schemaVersion: '1.0.0',
    });

    const order = createOrder({
      comboId: 'combo-internet-app',
      comboName: '互联网应用部署',
      services: ['云基础设施', '容器计算', 'MySQL数据库', 'Redis缓存', '网络发布', 'CDN加速', 'WAF防护'],
      aiConfig: '互联网应用全栈自动化交付',
      answers: {
        appName,
        system,
        targetEnv,
        appType,
        businessDomain,
        domain,
        ports,
        scale,
        useDuration,
        businessCriticality,
      },
      extras: { cdnEnabled },
      initiationForm,
      initiationStageDetail,
      internetAppDetail: detail,
      sourceSpecId: 'combo-internet-app',
      formSchemaVersion: '1.0.0',
      outputSchemaVersion: '1.0.0',
    });

    setOrderId(order.id);
    setStep(4);
  };

  const STEPS = ['应用信息', '计算资源', '数据库', '网络发布', '确认提交'];

  const packageRecommendation = derivePackageRecommendation({
    comboId: 'combo-internet-app',
    comboName: '互联网应用部署',
    answers: {
      targetEnv,
      scale,
      useDuration,
      businessCriticality,
    },
    extras: { cdnEnabled },
    internetAppDetail: currentDetail,
  });
  const simulationAssessment = deriveSimulationAssessment({
    answers: {
      targetEnv,
      scale,
      useDuration,
      businessCriticality,
      domain,
      ports,
    },
    extras: { cdnEnabled },
    internetAppDetail: currentDetail,
  });
  const selectedChainNode = currentDetail.networkChain.find(node => node.id === selectedChainNodeId) ?? currentDetail.networkChain[0] ?? null;

  const updateChainNode = (nodeId: string, nextNode: NetworkChainNode) => {
    setEditableNetworkChain(chain => {
      const base = chain.length > 0 ? chain : currentDetail.networkChain;
      return base.map(node => node.id === nodeId ? nextNode : node);
    });
  };

  const toggleChainNodeEnabled = (nodeId: string) => {
    setEditableNetworkChain(chain => {
      const base = chain.length > 0 ? chain : currentDetail.networkChain;
      return base.map(node => (
        node.id === nodeId
          ? {
              ...node,
              required: !node.required,
              status: !node.required ? 'pending' : node.status,
            }
          : node
      ));
    });
  };

  const addChainNode = () => {
    const nextNode: NetworkChainNode = {
      id: `custom-${Date.now()}`,
      name: '补充链路节点',
      type: 'cloud-access',
      required: true,
      deliveryMode: 'manual',
      status: 'pending',
      label: '本次附加',
      config: { key: 'value' },
    };
    setEditableNetworkChain(chain => {
      const base = chain.length > 0 ? chain : currentDetail.networkChain;
      return [...base, nextNode];
    });
    setSelectedChainNodeId(nextNode.id);
    setChainEditorOpen(true);
  };

  return (
    <ApplyPageShell>
      {/* Progress Steps */}
      <div className="flex items-center gap-0">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                i < step
                  ? 'bg-primary text-primary-foreground'
                  : i === step
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {i < step ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`text-sm whitespace-nowrap ${
                i <= step ? 'text-foreground font-medium' : 'text-muted-foreground'
              }`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-4 transition-colors ${
                i < step ? 'bg-primary' : 'bg-border'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: 应用信息 */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📋 应用信息</CardTitle>
            <CardDescription>请填写应用基本信息，系统将为您规划资源方案</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_320px]">
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="appName">应用名称 *</Label>
                    <Input id="appName" value={appName} onChange={e => setAppName(e.target.value)} placeholder="如：电商订单中心" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="system">所属系统 *</Label>
                    <Input id="system" value={system} onChange={e => setSystem(e.target.value)} placeholder="如：营销平台" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>目标环境 *</Label>
                  <div className="flex flex-wrap gap-2">
                    {TARGET_ENVS.map(env => (
                      <button
                        key={env}
                        onClick={() => setTargetEnv(env)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          targetEnv === env
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {env}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>应用类型 *</Label>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                    {APP_TYPES.map(type => {
                      const Icon = type.icon;
                      const isSelected = appType === type.key;
                      return (
                        <button
                          key={type.key}
                          onClick={() => setAppType(type.key)}
                          className={`p-3 rounded-lg border-2 text-center transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <Icon className={`h-6 w-6 mx-auto mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          <div className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                            {type.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessDomain">业务域 *</Label>
                  <Input id="businessDomain" value={businessDomain} onChange={e => setBusinessDomain(e.target.value)} placeholder="如：营销域 / 交易域 / 履约域" />
                </div>

                <div className="space-y-3">
                  <Label>预期访问量 *</Label>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                      { value: 'low', label: '日活 < 1,000' },
                      { value: 'medium', label: '日活 1K-1W' },
                      { value: 'high', label: '日活 1W-10W' },
                      { value: 'ultra', label: '日活 > 10万' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setScale(opt.value)}
                        className={`p-3 rounded-lg border-2 text-center text-sm transition-all ${
                          scale === opt.value
                            ? 'border-primary bg-primary/5 text-primary font-medium'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label>计划使用时长</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {['1-3个月', '3-6个月', '6-12个月', '长期'].map(option => (
                        <button
                          key={option}
                          onClick={() => setUseDuration(option)}
                          className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                            useDuration === option
                              ? 'border-primary bg-primary/5 text-primary font-medium'
                              : 'border-border text-muted-foreground hover:border-primary/40'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>业务等级</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'standard', label: '一般业务' },
                        { value: 'important', label: '重要业务' },
                        { value: 'core', label: '核心业务' },
                        { value: 'mission', label: '关键交易' },
                      ].map(option => (
                        <button
                          key={option.value}
                          onClick={() => setBusinessCriticality(option.value)}
                          className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                            businessCriticality === option.value
                              ? 'border-primary bg-primary/5 text-primary font-medium'
                              : 'border-border text-muted-foreground hover:border-primary/40'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-sm font-semibold text-slate-900">当前录入摘要</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                      <span className="text-slate-500">目标环境</span>
                      <span className="font-medium text-slate-900">{targetEnv}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                      <span className="text-slate-500">应用类型</span>
                      <span className="font-medium text-slate-900">{APP_TYPES.find(item => item.key === appType)?.label ?? appType}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                      <span className="text-slate-500">访问规模</span>
                      <span className="font-medium text-slate-900">{scale}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                      <span className="text-slate-500">业务等级</span>
                      <span className="font-medium text-slate-900">{businessCriticality}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-amber-950">套餐建议</div>
                      <div className="mt-1 text-sm text-amber-900">{packageRecommendation.summary}</div>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-amber-700 border border-amber-200">
                      评审前预估
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-amber-800">
                    {packageRecommendation.reasons.map(reason => (
                      <span key={reason} className="rounded-full bg-white/90 px-2 py-1 border border-amber-100">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                className="min-w-[220px]"
                disabled={!canNextStep0}
                onClick={() => {
                  syncEditableRecommendations();
                  setStep(1);
                }}
              >
                下一步：查看计算资源配置
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: 计算资源 */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">☁️ 计算资源配置</CardTitle>
            <CardDescription>AI 根据您的应用特征自动规划云基础设施和容器规格</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Cloud className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-900">云基础设施</span>
                <span className="ml-auto text-xs bg-blue-600 text-white px-2 py-0.5 rounded">AI 推荐</span>
              </div>
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <EditableField label="平台" value={cloudPlatform} onChange={setCloudPlatform} />
                <EditableField label="VPC" value={cloudVpc} onChange={setCloudVpc} />
                <EditableField label="子网" value={cloudSubnet} onChange={setCloudSubnet} />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Server className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-900">后端容器</span>
                <span className="ml-auto text-xs bg-blue-600 text-white px-2 py-0.5 rounded">AI 推荐</span>
              </div>
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <EditableField label="CPU" value={backendCpu} onChange={setBackendCpu} suffix="核" />
                <EditableField label="内存" value={backendMemory} onChange={setBackendMemory} suffix="GB" />
                <EditableField label="实例数" value={backendInstances} onChange={setBackendInstances} suffix="个" />
              </div>
            </div>

            {previewData.frontendContainer && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Monitor className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">前端容器</span>
                  <span className="ml-auto text-xs bg-blue-600 text-white px-2 py-0.5 rounded">AI 推荐</span>
                </div>
                <div className="grid gap-3 text-sm md:grid-cols-3">
                  <EditableField label="CPU" value={frontendCpu} onChange={setFrontendCpu} suffix="核" />
                  <EditableField label="内存" value={frontendMemory} onChange={setFrontendMemory} suffix="GB" />
                  <EditableField label="实例数" value={frontendInstances} onChange={setFrontendInstances} suffix="个" />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStep(0)}>上一步</Button>
              <Button className="min-w-[220px]" onClick={() => setStep(2)}>下一步：查看数据库配置</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: 数据库 */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🗄️ 数据库配置</CardTitle>
            <CardDescription>AI 根据环境类型自动推荐 MySQL 和 Redis 规格</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Database className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-900">MySQL 数据库</span>
                <span className="ml-auto text-xs bg-blue-600 text-white px-2 py-0.5 rounded">AI 推荐</span>
              </div>
              <div className="grid gap-3 text-sm mb-2 md:grid-cols-3">
                <EditableField label="规格" value={mysqlSpec} onChange={setMysqlSpec} />
                <EditableField label="存储" value={mysqlStorage} onChange={setMysqlStorage} />
                <EditableField label="版本" value={mysqlVersion} onChange={setMysqlVersion} />
              </div>
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <EditableField label="高可用" value={mysqlHa} onChange={setMysqlHa} />
                <div className="rounded-lg border border-blue-100 bg-white px-3 py-2.5 text-sm"><span className="text-muted-foreground">VPC：</span>{currentDetail.mysql.vpc}</div>
                <div className="rounded-lg border border-blue-100 bg-white px-3 py-2.5 text-sm"><span className="text-muted-foreground">子网：</span>{currentDetail.mysql.subnet}</div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Database className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-900">Redis 缓存</span>
                <span className="ml-auto text-xs bg-blue-600 text-white px-2 py-0.5 rounded">AI 推荐</span>
              </div>
              <div className="grid gap-3 text-sm mb-2 md:grid-cols-3">
                <EditableField label="规格" value={redisSpec} onChange={setRedisSpec} />
                <EditableField label="内存" value={redisMemory} onChange={setRedisMemory} />
                <EditableField label="版本" value={redisVersion} onChange={setRedisVersion} />
              </div>
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <EditableField label="高可用" value={redisHa} onChange={setRedisHa} />
                <div className="rounded-lg border border-blue-100 bg-white px-3 py-2.5 text-sm"><span className="text-muted-foreground">VPC：</span>{currentDetail.redis.vpc}</div>
                <div className="rounded-lg border border-blue-100 bg-white px-3 py-2.5 text-sm"><span className="text-muted-foreground">子网：</span>{currentDetail.redis.subnet}</div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>上一步</Button>
              <Button className="min-w-[220px]" onClick={() => setStep(3)}>下一步：配置网络发布</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: 网络发布 */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🌐 网络发布配置</CardTitle>
            <CardDescription>配置域名、端口和 CDN 加速，查看完整的交付链路</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="domain">访问域名 *</Label>
              <Input id="domain" value={domain} onChange={e => setDomain(e.target.value)} placeholder="如：app.gtmc.com" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ports">监听端口 *</Label>
              <Input id="ports" value={ports} onChange={e => setPorts(e.target.value)} placeholder="如：80,443" />
              <p className="text-xs text-muted-foreground">多个端口用逗号分隔，默认 HTTP(80) 和 HTTPS(443)</p>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="cdn" className="font-medium">启用 CDN 加速</Label>
                <p className="text-xs text-muted-foreground">为静态资源提供全球加速分发</p>
              </div>
              <Switch id="cdn" checked={cdnEnabled} onCheckedChange={setCdnEnabled} />
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs leading-5 text-amber-900">
              当前展示的是本次申请的交付链路方案预览。节点圆点状态表示默认执行起点，提交申请后才会进入真实交付状态流转。
            </div>

            {/* Network Chain Visualization */}
            <NetworkChainProgress nodes={currentDetail.networkChain} domain={domain || 'app.example.com'} />

            <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">交付链路编辑</div>
                    <div className="mt-1 text-xs text-slate-500">点击一个节点查看并编辑单个节点信息，默认链路不会被直接删除。</div>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addChainNode}>添加补充节点</Button>
                </div>
                <div className="space-y-2">
                  {currentDetail.networkChain.map(node => {
                    const isActive = selectedChainNode?.id === node.id;
                    const isExtraNode = node.label === '本次附加' || node.id.startsWith('custom-');
                    return (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => {
                          setSelectedChainNodeId(node.id);
                          setChainEditorOpen(true);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                          isActive
                            ? 'border-primary bg-primary/5'
                            : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className={`truncate text-sm font-medium ${isActive ? 'text-primary' : 'text-slate-900'}`}>{node.name}</div>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span>{node.label}</span>
                            <span>{node.deliveryMode === 'ai' ? 'AI' : '人工'}</span>
                            <span>{node.required ? '本次启用' : '本次跳过'}</span>
                            {isExtraNode ? <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">附加</span> : null}
                          </div>
                        </div>
                        <span className="shrink-0 text-xs text-slate-500">{node.status}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">节点详情编辑</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {selectedChainNode ? `当前节点：${selectedChainNode.name}` : '请先选择链路节点'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChainEditorOpen(value => !value)}
                    className="text-xs text-slate-500 hover:text-slate-900"
                  >
                    {chainEditorOpen ? '收起编辑' : '展开编辑'}
                  </button>
                </div>

                {chainEditorOpen && selectedChainNode ? (
                  <div className="mt-4">
                    <ChainNodeEditor
                      node={selectedChainNode}
                      onChange={nextNode => updateChainNode(selectedChainNode.id, nextNode)}
                      onToggleEnabled={() => toggleChainNodeEnabled(selectedChainNode.id)}
                    />
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs leading-5 text-slate-500">
                      当前操作仅作用于本次申请，不会修改系统默认交付链路。
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-sm text-slate-500">
                    选择链路节点后，可在这里展开编辑；未展开时页面保持紧凑。
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>上一步</Button>
              <Button className="min-w-[220px]" disabled={!canNextStep3} onClick={() => setStep(4)}>
                下一步：确认并提交
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: 确认/成功 */}
      {step === 4 && (
        <>
          {orderId === null ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">✅ 确认提交</CardTitle>
                <CardDescription>请核对以下配置信息，确认后即可提交申请</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <SummaryCard title="应用信息" index={1} tone={STEP_COLORS[0]}>
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <div><span className="text-muted-foreground">应用名称：</span>{appName}</div>
                      <div><span className="text-muted-foreground">所属系统：</span>{system}</div>
                      <div><span className="text-muted-foreground">目标环境：</span>{targetEnv}</div>
                      <div><span className="text-muted-foreground">应用类型：</span>{appType}</div>
                      <div className="sm:col-span-2"><span className="text-muted-foreground">业务域：</span>{businessDomain}</div>
                    </div>
                  </SummaryCard>

                  <SummaryCard title="计算资源" index={2} tone={STEP_COLORS[1]}>
                    <div className="space-y-1 text-sm">
                      <div><span className="text-muted-foreground">云平台：</span>{currentDetail.cloudInfra.platform} | {currentDetail.cloudInfra.vpc}</div>
                      <div><span className="text-muted-foreground">后端容器：</span>{currentDetail.backendContainer.cpu}核 / {currentDetail.backendContainer.memory}GB × {currentDetail.backendContainer.instances}</div>
                      {currentDetail.frontendContainer && (
                        <div><span className="text-muted-foreground">前端容器：</span>{currentDetail.frontendContainer.cpu}核 / {currentDetail.frontendContainer.memory}GB × {currentDetail.frontendContainer.instances}</div>
                      )}
                    </div>
                  </SummaryCard>

                  <SummaryCard title="数据库" index={3} tone={STEP_COLORS[2]}>
                    <div className="space-y-1 text-sm">
                      <div><span className="text-muted-foreground">MySQL：</span>{currentDetail.mysql.spec} / {currentDetail.mysql.storage} / {currentDetail.mysql.ha}</div>
                      <div><span className="text-muted-foreground">Redis：</span>{currentDetail.redis.spec} / {currentDetail.redis.memory} / {currentDetail.redis.ha}</div>
                    </div>
                  </SummaryCard>

                  <SummaryCard title="网络发布" index={4} tone={STEP_COLORS[3]}>
                    <div className="space-y-1 text-sm">
                      <div><span className="text-muted-foreground">访问域名：</span>{domain}</div>
                      <div><span className="text-muted-foreground">监听端口：</span>{ports}</div>
                      <div><span className="text-muted-foreground">CDN加速：</span>{cdnEnabled ? '✅ 已启用' : '❌ 未启用'}</div>
                      <div><span className="text-muted-foreground">链路节点：</span>{currentDetail.networkChain.map(node => node.name).join(' / ')}</div>
                    </div>
                  </SummaryCard>
                </div>

                <SummaryCard title="仿真预检" index={5} tone={STEP_COLORS[4]}>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white/80 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-foreground">{simulationAssessment.environmentLabel}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{simulationAssessment.summary}</div>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                      simulationAssessment.gateStatus === 'ready'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                    }`}>
                      {simulationAssessment.gateStatus === 'ready' ? '可放行' : '需关注'}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {simulationAssessment.items.map(item => (
                      <div key={item.key} className="rounded-md border border-slate-200 bg-white/80 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium text-foreground">{item.label}</div>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            item.status === 'pass' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {item.status === 'pass' ? '通过' : '关注'}
                          </span>
                        </div>
                        <div className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</div>
                      </div>
                    ))}
                  </div>
                </SummaryCard>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setStep(3)}>返回修改</Button>
                  <Button className="min-w-[220px]" onClick={handleSubmit}>确认提交申请</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-10">
                <div className="mx-auto max-w-xl rounded-[28px] border border-emerald-200 bg-[linear-gradient(180deg,#F4FFF7_0%,#FFFFFF_100%)] px-6 py-8 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-light">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">已提交</div>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">申请已进入流转</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    工单号：<span className="font-mono text-primary font-medium">{orderId}</span>
                  </p>
                  <div className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-3 text-left">
                    <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
                      <div className="text-[11px] text-slate-500">下一步</div>
                      <div className="mt-1 text-sm font-medium text-slate-900">查看审批与方案确认</div>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
                      <div className="text-[11px] text-slate-500">交付结果</div>
                      <div className="mt-1 text-sm font-medium text-slate-900">交付后进入待验收</div>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3 justify-center">
                    <Button variant="outline" onClick={() => navigate('/orders')}>查看我的工单</Button>
                    <Button onClick={() => navigate(`/order/${orderId}`)}>查看工单详情</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </ApplyPageShell>
  );
}
