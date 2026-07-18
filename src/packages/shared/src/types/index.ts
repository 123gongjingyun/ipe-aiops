// ===== Field Schema =====
export interface FieldSchema {
  key: string;
  label: string;
  type: "text" | "select" | "integer" | "boolean" | "textarea";
  required: boolean;
  options?: { label: string; value: string }[];
  defaultValue?: string | number | boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
}

export interface FieldDictionaryEntry extends FieldSchema {
  id: string;
  category: string;
  description?: string;
  sourceScope: 'input' | 'output' | 'both';
  status: 'active' | 'draft';
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductionFieldOption {
  label: string;
  value: string;
}

export interface ProductionFieldDefinition {
  key: string;
  label: string;
  type: FieldSchema['type'];
  required?: boolean;
  conditionalRequired?: boolean;
  placeholder?: string;
  options?: ProductionFieldOption[];
  description?: string;
  category?: string;
}

export interface ServiceFieldBinding {
  fieldKey: string;
  dictionaryEntryId?: string;
  source: 'dictionary' | 'custom';
  aliasLabel?: string;
  required?: boolean;
}

export interface FormLayoutCondition {
  fieldKey: string;
  operator: 'eq' | 'neq' | 'in';
  value: string | number | boolean | Array<string | number | boolean>;
}

export interface FormLayoutColumn {
  fieldKey: string;
  span: 1 | 2 | 3 | 4;
  visibleWhen?: FormLayoutCondition;
}

export interface FormLayoutRow {
  id: string;
  columns: FormLayoutColumn[];
}

export interface FormLayoutSection {
  id: string;
  title: string;
  description?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  rows: FormLayoutRow[];
}

export interface FormLayoutConfig {
  sections: FormLayoutSection[];
}

export interface SchemaTemplateFieldBinding extends ServiceFieldBinding {
  id: string;
  dictionaryEntryId?: string;
  order: number;
  helpText?: string;
  defaultValueOverride?: string | number | boolean;
  fieldSnapshot: FieldSchema;
}

export interface SchemaTemplate {
  id: string;
  code: string;
  name: string;
  kind: 'input' | 'output';
  scope: 'atomic' | 'combo';
  domain?: string;
  serviceId?: string;
  serviceName?: string;
  description?: string;
  status: 'draft' | 'active' | 'deprecated';
  currentVersionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchemaTemplateVersion {
  id: string;
  templateId: string;
  version: string;
  status: 'draft' | 'active' | 'archived';
  basedOnVersionId?: string;
  changeSummary?: string;
  bindings: SchemaTemplateFieldBinding[];
  layout: FormLayoutConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceConfigProfile {
  id: string;
  env: 'DEV' | 'UAT' | 'PROD' | 'PERF' | 'DR';
  name: string;
  nodes: string;
  cpu: string;
  memory: string;
  disk: string;
  details?: Record<string, string>;
  description?: string;
  updatedAt: string;
}

export interface ConfigProfileGroup {
  key: string;
  title: string;
  specIds: string[];
  profiles: ServiceConfigProfile[];
}

export type EnvironmentRecommendedFieldKey = 'nodes' | 'cpu' | 'memory' | 'disk' | 'securityLevel';

export interface TemplateEnvironmentFieldConfig {
  key: EnvironmentRecommendedFieldKey;
  enabled: boolean;
  allowOverride: boolean;
}

export interface TemplateEnvironmentConfig {
  profileGroupKey?: string;
  environmentFieldKey?: string;
  preserveOverrides?: boolean;
  hintText?: string;
  fields: TemplateEnvironmentFieldConfig[];
}

export interface SchemaTemplateConfigProfileBinding {
  templateId: string;
  groupKeys: string[];
  environmentConfig?: TemplateEnvironmentConfig;
  updatedAt: string;
}

export interface RoleMember {
  id: string;
  name: string;
  account: string;
  title?: string;
  department?: string;
  status: 'active' | 'inactive';
}

export interface RoleDefinition {
  key: string;
  name: string;
  summary: string;
  perms: string[];
  members: RoleMember[];
  updatedAt: string;
}

// ===== SLA =====
export interface ServiceSLASpec {
  level: "gold" | "silver" | "bronze";
  availability: string;
  rto: string;
  rpo: string;
  responseTime: string;
  maintenanceWindow: string;
  escalationPolicy: string;
}

// ===== Flow =====
export interface ServiceFlowSpec {
  id: string;
  name: string;
  nodes: ServiceFlowNode[];
}

export interface ServiceFlowNode {
  status: string;
  label: string;
  next: string[];
  actions: string[];
}

// ===== Delivery =====
export interface DeliveryConfig {
  handler: string;
  autoDays: number;
  manualDays: number;
  dependencies: string[];
}

export interface ApprovalStageDefinition {
  stageCode: string;
  stageName: string;
  role: string;
  required: boolean;
  sla?: string;
}

export interface ApprovalTriggerRule {
  fieldKey: string;
  operator: 'eq' | 'neq' | 'gt' | 'contains';
  value: string | number | boolean;
  appendStages: string[];
}

export interface ApprovalPolicy {
  id: string;
  name: string;
  defaultStages: ApprovalStageDefinition[];
  environmentOverrides?: {
    environment: 'DEV' | 'UAT' | 'PROD';
    stages: ApprovalStageDefinition[];
  }[];
  triggerRules?: ApprovalTriggerRule[];
}

export interface DeliveryStepDefinition {
  stepCode: string;
  stepName: string;
  order: number;
  mode: 'auto' | 'manual';
  description?: string;
  outputKeys?: string[];
}

export interface DeliveryStepSet {
  id: string;
  serviceCode: string;
  steps: DeliveryStepDefinition[];
}

export interface OrderDeliveryStepSnapshot {
  stepCode: string;
  stepName: string;
  order: number;
  mode: 'auto' | 'manual';
  outputKeys?: string[];
  status?: 'pending' | 'processing' | 'completed';
  updatedAt?: string;
}

export interface DeliveryOutputDefinition {
  key: string;
  label: string;
  description?: string;
}

export type ApplyWorkflowMode = 'combo_general' | 'internet_app' | 'atomic_service';
export type ApplyAiMode = 'orchestration' | 'validation' | 'topology_guided';
export type ApplyFieldBehavior = 'hidden' | 'readonly' | 'defaulted' | 'required' | 'optional';

export interface ApplyFieldStrategy {
  fieldKey: string;
  behavior: ApplyFieldBehavior;
  defaultValue?: string | number | boolean;
  reason?: string;
}

export interface ApplyUiHints {
  preferArchitectureUpload?: boolean;
  preferConfigUpload?: boolean;
  businessGoalHelpMode?: 'inline' | 'dialog';
}

export interface ApplyStrategy {
  workflowMode: ApplyWorkflowMode;
  aiMode: ApplyAiMode;
  fieldStrategies?: ApplyFieldStrategy[];
  uiHints?: ApplyUiHints;
}

export interface AssetFieldMappingEntry {
  outputKey: string;
  assetFieldKey: string;
  required: boolean;
}

export interface AssetFieldMapping {
  serviceCode: string;
  assetCategory: AssetCategory;
  mappings: AssetFieldMappingEntry[];
}

export interface AtomicServiceProductionMeta {
  serviceCode: string;
  serviceName: string;
  domain: string;
  category: string;
  supportedEnvironments: ('DEV' | 'UAT' | 'PROD')[];
  automationLevel: 'manual' | 'semi-auto' | 'full-auto';
  slaTarget?: string;
  prerequisites?: string[];
  approvalPolicyId?: string;
  inputTemplateCode?: string;
  outputTemplateCode?: string;
  deliveryStepSetId?: string;
  assetCategory?: AssetCategory;
  serviceSummary?: string;
  deliveryOutputs?: DeliveryOutputDefinition[];
  inputFields?: ProductionFieldDefinition[];
}

// ===== Assembly =====
export interface AssemblySpecRef {
  specId: string;
  required: boolean;
  overrides?: Record<string, any>;
}

export interface FlowServiceRef {
  specId: string;
  required: boolean;
  overrides?: Record<string, any>;
}

export interface DeliveryFlowNode {
  id: string;
  label: string;
  description: string;
  order: number;
  dependencies: string[];
  services: FlowServiceRef[];
}

export interface ServiceAssemblySpec {
  formConfig: {
    questions: ComboQuestion[];
    extras: ComboExtra[];
    aiConfig: string;
  };
  deliveryFlow: DeliveryFlowNode[];
  networkChain?: NetworkChainNode[];
}

// ===== Service Status =====
export type ServiceStatus = 'online' | 'offline' | 'draft';
export type ServiceType = 'cloud' | 'deploy' | 'ops' | 'policy' | 'audit' | 'infra';
export type AutomationLevel = 'manual' | 'semi' | 'full';

// ===== Base Spec =====
export interface BaseSpec {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: string[];
  version: string;
  status: ServiceStatus;
}

// ===== Atomic Service Spec =====
export interface AtomicServiceSpec extends BaseSpec {
  type: "atomic";
  domain: string;
  category: string;
  serviceType?: ServiceType;
  automationLevel?: AutomationLevel;
  ownerTeam?: string;
  serviceCode?: string;
  supportedEnvironments?: ('DEV' | 'UAT' | 'PROD')[];
  prerequisites?: string[];
  approvalPolicyId?: string;
  deliveryStepSetId?: string;
  assetCategory?: AssetCategory;
  deliveryOutputs?: DeliveryOutputDefinition[];
  productionInputFields?: ProductionFieldDefinition[];
  serviceSummary?: string;
  inputTemplateId?: string;
  inputTemplateVersionId?: string;
  outputTemplateId?: string;
  outputTemplateVersionId?: string;
  configProfiles?: ServiceConfigProfile[];
  inputSchema: FieldSchema[];
  outputSchema: FieldSchema[];
  applyStrategy?: ApplyStrategy;
  sla: ServiceSLASpec;
  flow: ServiceFlowSpec;
  delivery: DeliveryConfig;
  deliveryMode: "ai" | "manual";
}

// ===== Combo Service Spec =====
export interface ComboServiceSpec extends BaseSpec {
  type: "combo";
  inputTemplateId?: string;
  inputTemplateVersionId?: string;
  outputTemplateId?: string;
  outputTemplateVersionId?: string;
  inputSchema: FieldSchema[];
  outputSchema: FieldSchema[];
  applyStrategy?: ApplyStrategy;
  assembly: ServiceAssemblySpec;
  sla: ServiceSLASpec;
  targetAudience: "business" | "infra";
  display: {
    highlight: boolean;
    category: string;
  };
}

// ===== Unified Entry =====
export type ServiceSpec = AtomicServiceSpec | ComboServiceSpec;

// ===== Spec Filter =====
export interface SpecFilter {
  type?: "atomic" | "combo";
  domain?: string;
  category?: string;
  status?: ServiceStatus;
}

// ===== 工单状态 =====
export type OrderStatus = 'pending' | 'reviewing' | 'processing' | 'plan_confirming' | 'delivering' | 'completed' | 'confirmed' | 'archived';

export type ItsmStatus = 'not_created' | 'submitted' | 'processing' | 'approved' | 'rejected' | 'closed';

// ===== 资产维度分类 =====
export type AssetCategory = 'paas' | 'database' | 'middleware' | 'vm' | 'network' | 'monitor' | 'security' | 'backup' | 'logging';

export interface AssetFieldDefinition {
  key: string;
  label: string;
  searchable?: boolean;
  defaultVisible?: boolean;
  defaultExportable?: boolean;
  sourceFieldKeys?: string[];
}

export interface DeliveredAsset {
  id: string;
  orderId: string;
  orderName: string;
  serviceName: string;
  category: AssetCategory;
  categoryLabel: string;
  assetName: string;
  assetMeta: Record<string, string>;
  assetDetail?: string;
  deliveredAt: string;
  status: 'pending_acceptance' | 'accepted' | 'archived';
  acceptedAt?: string;
  archivedAt?: string;
  assetSchemaVersion: string;
  formSchemaVersion?: string;
  sourceSpecId?: string;
  sourceTemplateVersionId?: string;
  schemaDrift?: {
    hasDrift: boolean;
    reason: 'template-version-changed' | 'field-schema-changed' | 'template-missing';
    currentTemplateVersionId?: string;
  };
}

// ===== AI 编排输出 =====
export interface OrchestratedPlan {
  summary: string;
  estimatedTime: string;
  resources: ResourceRequest[];
  integrations: IntegrationRequest[];
}

export interface ResourceRequest {
  type: 'vm' | 'db' | 'network' | 'paas' | 'middleware';
  name: string;
  spec: Record<string, string>;
  purpose: string;
}

export interface IntegrationRequest {
  type: 'monitor' | 'logging' | 'backup' | 'security' | 'pam';
  enabled: boolean;
  config: Record<string, string>;
}

export type OrderAttachmentKind = 'architecture' | 'config';
export type OrderAttachmentParseStatus = 'pending' | 'parsed' | 'skipped';

export interface OrderAttachment {
  id: string;
  name: string;
  kind: OrderAttachmentKind;
  fileType: string;
  sizeLabel: string;
  uploadedAt: string;
  source: 'user-upload' | 'template-download' | 'ai-generated';
  parseStatus: OrderAttachmentParseStatus;
}

export interface OrderAiAnalysisSummary {
  mode: 'business_only' | 'architecture_first' | 'config_validation';
  summary: string;
  highlights: string[];
  missingItems: string[];
  riskHints: string[];
}

export type InitiationFieldGroup =
  | 'base_info'
  | 'request_goal'
  | 'network_access'
  | 'resource_spec'
  | 'security_policy'
  | 'attachments'
  | 'ai_summary';

export type InitiationFieldSource =
  | 'user_input'
  | 'derived'
  | 'ai_generated'
  | 'attachment_parsed'
  | 'defaulted';

export interface InitiationFieldSnapshot {
  key: string;
  label: string;
  value: string;
  displayValue: string;
  group: InitiationFieldGroup;
  required: boolean;
  source: InitiationFieldSource;
}

export interface InitiationSectionSnapshot {
  id: string;
  title: string;
  fields: InitiationFieldSnapshot[];
}

export interface InitiationFormSnapshot {
  schemaVersion: string;
  submittedAt: string;
  workflowMode: ApplyWorkflowMode;
  sections: InitiationSectionSnapshot[];
}

export interface InitiationStageStepSnapshot {
  stepCode: string;
  stepName: string;
  status: 'pending' | 'processing' | 'completed';
  summary: string;
  enteredAt?: string;
  completedAt?: string;
}

export type InitiationInputMode = 'business_only' | 'architecture_first' | 'config_guided' | 'hybrid';

export interface InitiationStageDetail {
  inputMode: InitiationInputMode;
  attachments: OrderAttachment[];
  aiAnalysisSummary?: OrderAiAnalysisSummary;
  missingItems: string[];
  riskHints: string[];
  reviewFocus: string[];
  steps: InitiationStageStepSnapshot[];
  exportSummary: string;
}

export type DeliveryAcceptanceStatus = 'not_started' | 'accepted' | 'plan_ready';
export type DeliveryAcceptancePath = 'standard' | 'non_standard';
export type DeliveryAcceptanceStepMode = 'manual' | 'ai' | 'hybrid';

export interface DeliveryImplementationStep {
  name: string;
  owner: string;
  mode: DeliveryAcceptanceStepMode;
  output: string;
}

export interface DeliveryImplementationPlan {
  summary: string;
  steps: DeliveryImplementationStep[];
  prerequisites: string[];
  risks: string[];
  estimatedSchedule: string;
  deliverables: string[];
}

export interface DeliveryAcceptanceSnapshot {
  status: DeliveryAcceptanceStatus;
  acceptedBy?: string;
  acceptedAt?: string;
  deliveryPath?: DeliveryAcceptancePath;
  domains?: string[];
  nonStandardReason?: string;
  nonStandardDiffItems?: string[];
  nonStandardRisks?: string[];
  collaborationDomains?: string[];
  implementationPlan?: DeliveryImplementationPlan;
}

// ===== 工单 =====
export interface Order {
  id: string;
  comboId: string;
  comboName: string;
  services: string[];
  aiConfig: string;
  orchestratedPlan: OrchestratedPlan;
  answers: Record<string, string>;
  extras: Record<string, boolean>;
  attachments?: OrderAttachment[];
  aiAnalysisSummary?: OrderAiAnalysisSummary;
  initiationForm?: InitiationFormSnapshot;
  initiationStageDetail?: InitiationStageDetail;
  serviceProgress: ServiceProgress[];
  internetAppDetail?: InternetAppDeployDetail;
  status: OrderStatus;
  createdAt: string;
  archivedAt?: string;
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  reviewComment?: string;
  reviewedAt?: string;
  workflowTimeline?: WorkflowTimelineNode[];
  planFeedback?: string;
  planFeedbackAt?: string;
  deliveryAcceptance?: DeliveryAcceptanceSnapshot;
  itsm?: ItsmTicketInfo;
  approvalStages?: OrderApprovalStageSnapshot[];
  approvalTriggers?: OrderApprovalTriggerSnapshot[];
  deliverySteps?: OrderDeliveryStepSnapshot[];
  sourceSpecId?: string;
  formSchemaVersion?: string;
  outputSchemaVersion?: string;
}

export interface ItsmTicketInfo {
  ticketNo?: string;
  ticketUrl?: string;
  status: ItsmStatus;
  submittedAt?: string;
  lastSyncedAt?: string;
  resultComment?: string;
  formSnapshot?: Record<string, string>;
  sourceOrderId?: string;
  syncLogs?: ItsmSyncLog[];
}

export interface ItsmSyncLog {
  id: string;
  action: 'submit' | 'status_change' | 'comment_update' | 'ticket_update';
  actor: string;
  fromStatus?: ItsmStatus;
  status: ItsmStatus;
  ticketNo?: string;
  ticketUrl?: string;
  comment?: string;
  createdAt: string;
}

export interface WorkflowTimelineNode {
  status: OrderStatus;
  label: string;
  enteredAt?: string;
  completedAt?: string;
  slaTarget?: string;
}

export interface OrderApprovalStageSnapshot {
  stageCode: string;
  stageName: string;
  role: string;
  required: boolean;
  sla?: string;
  source: 'base' | 'trigger';
  status?: 'pending' | 'processing' | 'approved' | 'rejected';
  updatedAt?: string;
}

export interface OrderApprovalTriggerSnapshot {
  fieldKey: string;
  fieldLabel: string;
  operator: 'eq' | 'neq' | 'gt' | 'contains';
  expectedValue: string;
  appendedStageCodes: string[];
  appendedStageNames: string[];
}

// ===== 子服务进度 =====
export interface ServiceProgress {
  name: string;
  status: OrderStatus;
  deliveryDetail?: DeliveryDetail;
}

// ===== 集成服务状态 =====
export interface IntegrationStatus {
  status: 'active' | 'pending' | 'disabled';
  url?: string;
  detail?: string;
}

export type IntegrationStatusMap = {
  pam: IntegrationStatus;
  monitor: IntegrationStatus;
  logging: IntegrationStatus;
  backup: IntegrationStatus;
  security: IntegrationStatus;
};

// ===== 交付详情 (9种 discriminated union) =====
export interface VMDeliveryDetail {
  type: 'vm';
  asset: { assetId: string; location: string; rackUnit: string };
  network: { hostname: string; ip: string; subnet: string; gateway: string; vlan: string };
  spec: { cpu: string; memory: string; systemDisk: string; dataDisk: string; os: string };
  integrations: IntegrationStatusMap;
}

export interface DBDeliveryDetail {
  type: 'db';
  asset: { assetId: string; instance: string };
  connection: { host: string; port: number; schema: string; charset: string };
  ha: { mode: string; primary: string; secondary: string };
  accounts: { name: string; privilege: string }[];
  integrations: IntegrationStatusMap;
}

export interface NetworkDeliveryDetail {
  type: 'network';
  connection: { vip: string; domain: string; protocol: string; port: number };
  firewall: { rules: { source: string; target: string; action: string }[] };
  integrations: IntegrationStatusMap;
}

export interface PaaSDeliveryDetail {
  type: 'paas';
  cluster: { name: string; apiServer: string; version: string };
  namespace: { name: string; nodeCount: number; resourceQuota: string };
  integrations: IntegrationStatusMap;
}

export interface MiddlewareDeliveryDetail {
  type: 'middleware';
  connection: { url: string; port: number; protocol: string };
  management: { console: string; username: string };
  topology: { exchanges: string[]; queues: string[]; topics: string[] };
  integrations: IntegrationStatusMap;
}

export interface MonitorDeliveryDetail {
  type: 'monitor';
  grafana: { url: string; dashboard: string };
  prometheus: { url: string; targets: number };
  alerts: { name: string; condition: string; channel: string }[];
}

export interface SecurityDeliveryDetail {
  type: 'security';
  waf: { status: string; rules: number };
  scan: { reportUrl: string; riskLevel: string; lastScan: string };
  ssl: { domain: string; issuer: string; expiry: string };
}

export interface BackupDeliveryDetail {
  type: 'backup';
  policy: { schedule: string; retention: string; storage: string };
  lastBackup: { time: string; size: string; status: string };
}

export interface LoggingDeliveryDetail {
  type: 'logging';
  agent: { name: string; version: string; status: string };
  cluster: { esNodes: number; kibanaUrl: string; indexPattern: string };
}

export type DeliveryDetail =
  | VMDeliveryDetail
  | DBDeliveryDetail
  | NetworkDeliveryDetail
  | PaaSDeliveryDetail
  | MiddlewareDeliveryDetail
  | MonitorDeliveryDetail
  | SecurityDeliveryDetail
  | BackupDeliveryDetail
  | LoggingDeliveryDetail;

// ===== 服务组合辅助 =====
export interface ComboQuestion {
  key: string;
  label: string;
  type: 'select' | 'text';
  options?: string[];
}

export interface ComboExtra {
  key: string;
  label: string;
  default: boolean;
}

// ===== 互联网应用部署 =====

export type AppType = 'PC Web' | '移动端' | '小程序' | 'API服务' | string;
export type TargetEnv = 'PROD' | 'DEV' | 'SIT' | 'UAT' | 'PERM' | string;

export interface InternetAppDeployDetail {
  // Step 1 - 应用信息
  appName: string;
  system: string;
  targetEnv: TargetEnv;
  appType: AppType;
  businessDomain: string;

  // Step 2 - 计算资源
  cloudInfra: { platform: string; vpc: string; subnet: string };
  backendContainer: { cpu: number; memory: number; instances: number };
  frontendContainer?: { cpu: number; memory: number; instances: number };

  // Step 3 - 数据库
  mysql: { spec: string; storage: string; version: string; ha: string; vpc: string; subnet: string };
  redis: { spec: string; memory: string; version: string; ha: string; vpc: string; subnet: string };

  // Step 4 - 网络发布
  domain: string;
  ports: string;
  cdnEnabled: boolean;
  networkChain: NetworkChainNode[];
}

export type NetworkChainNodeType = 'cdn' | 'f5' | 'waf' | 'internal-router' | 'internal-fw' | 'cloud-access' | 'container' | 'vm';

export interface NetworkChainNode {
  id: string;
  name: string;
  type: NetworkChainNodeType;
  required: boolean;
  deliveryMode: 'ai' | 'manual';
  status: 'pending' | 'processing' | 'completed';
  label: string;
  config: Record<string, string>;
  deliveryDetail?: {
    assignee?: string;
    estimatedTime?: string;
    completedAt?: string;
  };
}

// ===== 培训流程 =====
export interface ProcessStep {
  id: string;
  label: string;
  description: string;
  aiAssisted?: boolean;
  deliveryMode?: "ai" | "manual" | "both";
}

export interface ProcessPhase {
  id: string;
  title: string;
  orderStatus: string;
  transitionCondition: string;
  trainingTip: string;
  userSteps: ProcessStep[];
  deliverySteps: ProcessStep[];
  aiAssists: ProcessStep[];
}
