const STORAGE_KEY = 'ipe_request_records';
const CUSTOM_EVENT = 'ipe_request_records_updated';

export type RequestRecordMode = 'assistant' | 'direct';
export type RequestRecordStage = '草稿' | '已导出待评审' | '已转工单';

export interface RequestRecordDraftPayload {
  systemCode?: string;
  moduleName?: string;
  owner?: string;
  systemName: string;
  applicationName: string;
  environment: string;
  userType: string;
  appType: string;
  clientType: string;
  businessGoal: string;
  integrationSystems: string;
  accessScope: string;
  resourceNeed: string;
  slaRequirement: string;
  architectureNote: string;
  userRequirementBackground?: string;
  userRequirementUsers?: string;
  userRequirementOps?: string;
  userRequirementCloud?: string;
  userRequirementCloudService?: string;
  userRequirementMiddleware?: string;
  userRequirementServer?: string;
  userRequirementNetwork?: string;
  vmResourceMode?: string;
  vmDeploymentMode?: string;
  vmComponentSelection?: string;
  vmSpecProfile?: string;
  vmQuantity?: string;
  vmDiskType?: string;
  vmSystemDisk?: string;
  vmDataDisk?: string;
  vmConfigReference?: string;
  vmComponentConfigs?: string;
}

export interface RequestRecord {
  id: string;
  title: string;
  product: string;
  channel: string;
  stage: RequestRecordStage;
  environment: string;
  owner: string;
  updatedAt: string;
  summary: string;
  reviewSummaryOverview?: string;
  approvalNote?: string;
  mode: RequestRecordMode;
  draft: RequestRecordDraftPayload;
}

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function notifySync() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CUSTOM_EVENT));
}

function readRecords(): RequestRecord[] | null {
  if (!canUseBrowserStorage()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RequestRecord[];
  } catch {
    return null;
  }
}

function writeRecords(records: RequestRecord[]) {
  if (!canUseBrowserStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function buildTitleFromDraft(draft: RequestRecordDraftPayload) {
  const name = draft.systemName.trim() || draft.applicationName.trim() || '未命名申请';
  return `${name} ${draft.environment} 环境申请`;
}

function buildSummaryFromDraft(draft: RequestRecordDraftPayload) {
  return [
    draft.businessGoal.trim() || '待补充业务目标',
    draft.accessScope.trim() || '待补充访问与网络范围',
    draft.resourceNeed.trim() || '待补充资源诉求',
  ].join('；');
}

function buildSeedRecords(): RequestRecord[] {
  return [
    {
      id: 'REQ-2026-001',
      title: '经销商门户 UAT 环境申请',
      product: 'vm',
      channel: '引导填写',
      stage: '草稿',
      environment: 'UAT',
      owner: '张三',
      updatedAt: '2026-07-15 09:20',
      summary: '已补齐业务目标、访问范围和资源诉求，待补架构材料说明。',
      reviewSummaryOverview: '1. 本次申请系统为经销商门户，模块为门户前台，担当为张三。\n2. 当前申请环境为 UAT。\n3. 已补齐业务目标、访问范围和资源诉求，待补架构材料说明。',
      mode: 'assistant',
      draft: {
        systemCode: 'DLP-UAT-001',
        moduleName: '门户前台',
        owner: '张三',
        systemName: '经销商门户',
        applicationName: '门户前台',
        environment: 'UAT',
        userType: '经销商/合作伙伴系统',
        appType: '门户 / Web 应用',
        clientType: 'PC Web',
        businessGoal: '为经销商门户准备一套 UAT 联调环境，验证登录、订单查询和报表链路。',
        integrationSystems: '需要对接统一认证、订单中心和报表平台。',
        accessScope: '可能需要公网访问',
        resourceNeed: '数据库 / 缓存 / 中间件',
        slaRequirement: '当前以 UAT 联调为主，先按基础备份和日志要求准备。',
        architectureNote: '待补充架构图说明。',
        userRequirementCloudService: '',
        userRequirementMiddleware: '',
        userRequirementServer: '',
        vmResourceMode: '',
        vmDeploymentMode: '',
        vmComponentSelection: '',
        vmSpecProfile: '',
        vmQuantity: '',
        vmDiskType: '',
        vmSystemDisk: '',
        vmDataDisk: '',
        vmConfigReference: '',
        vmComponentConfigs: '',
      },
    },
    {
      id: 'REQ-2026-002',
      title: '订单中心接口联调资源申请',
      product: 'vm',
      channel: '直接填写',
      stage: '已导出待评审',
      environment: 'SIT',
      owner: '李四',
      updatedAt: '2026-07-14 18:40',
      summary: '已完成结构化填写并导出评审稿，待线下评审结论。',
      reviewSummaryOverview: '1. 本次申请系统为订单中心，模块为接口服务，担当为李四。\n2. 当前申请环境为 SIT。\n3. 已完成结构化填写并导出评审稿，待线下评审结论。',
      mode: 'direct',
      draft: {
        systemCode: 'OMS-SIT-API-001',
        moduleName: '接口服务',
        owner: '李四',
        systemName: '订单中心',
        applicationName: '接口服务',
        environment: 'SIT',
        userType: '内部办公系统',
        appType: 'API 服务',
        clientType: 'API 调用',
        businessGoal: '为订单中心接口联调准备 SIT 环境，验证上下游接口链路。',
        integrationSystems: '对接统一认证、订单中心、短信网关。',
        accessScope: '需要系统互访 / 上下游联调',
        resourceNeed: '云主机 / 计算资源',
        slaRequirement: '非生产，按基础安全与日志要求处理。',
        architectureNote: '接口拓扑与链路图已整理。',
        userRequirementCloudService: '',
        userRequirementMiddleware: '',
        userRequirementServer: '',
        vmResourceMode: '',
        vmDeploymentMode: '',
        vmComponentSelection: '',
        vmSpecProfile: '',
        vmQuantity: '',
        vmDiskType: '',
        vmSystemDisk: '',
        vmDataDisk: '',
        vmConfigReference: '',
        vmComponentConfigs: '',
      },
    },
    {
      id: 'REQ-2026-003',
      title: '营销报表服务资源扩容',
      product: 'vm',
      channel: '服务目录',
      stage: '已转工单',
      environment: 'PROD',
      owner: '王五',
      updatedAt: '2026-07-13 16:05',
      summary: '申请材料已确认，当前记录仅保留归档摘要，供后续回溯查看。',
      reviewSummaryOverview: '1. 本次申请系统为营销报表服务，模块为 BI 看板，担当为王五。\n2. 当前申请环境为 PROD。\n3. 申请材料已确认，当前记录仅保留归档摘要，供后续回溯查看。',
      mode: 'direct',
      draft: {
        systemCode: 'MKT-PROD-BI-001',
        moduleName: 'BI 看板',
        owner: '王五',
        systemName: '营销报表服务',
        applicationName: 'BI 看板',
        environment: 'PROD',
        userType: '内部办公系统',
        appType: '数据服务 / 报表',
        clientType: 'PC Web',
        businessGoal: '扩容营销报表服务以支撑日常经营分析。',
        integrationSystems: '依赖数据平台和统一认证。',
        accessScope: '仅内网访问',
        resourceNeed: '数据库 / 缓存 / 中间件',
        slaRequirement: '生产环境，需补齐高可用与备份要求。',
        architectureNote: '归档记录。',
        userRequirementCloudService: '',
        userRequirementMiddleware: '',
        userRequirementServer: '',
        vmResourceMode: '',
        vmDeploymentMode: '',
        vmComponentSelection: '',
        vmSpecProfile: '',
        vmQuantity: '',
        vmDiskType: '',
        vmSystemDisk: '',
        vmDataDisk: '',
        vmConfigReference: '',
        vmComponentConfigs: '',
      },
    },
  ];
}

export function getRequestRecords(): RequestRecord[] {
  const stored = readRecords();
  if (stored && stored.length > 0) return stored;
  const seed = buildSeedRecords();
  writeRecords(seed);
  return seed;
}

export function getRequestRecord(id: string): RequestRecord | undefined {
  return getRequestRecords().find(record => record.id === id);
}

export function saveRequestRecord(input: {
  id?: string;
  product: string;
  mode: RequestRecordMode;
  reviewSummaryOverview?: string;
  draft: RequestRecordDraftPayload;
}): RequestRecord {
  const records = getRequestRecords();
  const now = new Date().toLocaleString('zh-CN');
  const title = buildTitleFromDraft(input.draft);
  const summary = buildSummaryFromDraft(input.draft);
  const channel = input.mode === 'assistant' ? '引导填写' : '直接填写';

  if (input.id) {
    const index = records.findIndex(record => record.id === input.id);
    if (index >= 0) {
      const current = records[index];
      const nextRecord: RequestRecord = {
        ...current,
        title,
        product: input.product,
        summary,
        reviewSummaryOverview: input.reviewSummaryOverview,
        environment: input.draft.environment,
        updatedAt: now,
        mode: input.mode,
        channel,
        draft: { ...input.draft },
      };
      records[index] = nextRecord;
      writeRecords(records);
      notifySync();
      return nextRecord;
    }
  }

  const nextRecord: RequestRecord = {
    id: `REQ-${Date.now().toString().slice(-8)}`,
    title,
    product: input.product,
    channel,
    stage: '草稿',
    environment: input.draft.environment,
    owner: '张三',
    updatedAt: now,
    summary,
    reviewSummaryOverview: input.reviewSummaryOverview,
    mode: input.mode,
    draft: { ...input.draft },
  };
  records.unshift(nextRecord);
  writeRecords(records);
  notifySync();
  return nextRecord;
}

export function updateRequestRecordApprovalNote(id: string, approvalNote: string): RequestRecord {
  const records = getRequestRecords();
  const index = records.findIndex(record => record.id === id);
  if (index < 0) {
    throw new Error(`Request record ${id} not found`);
  }
  const nextRecord: RequestRecord = {
    ...records[index],
    approvalNote,
    updatedAt: new Date().toLocaleString('zh-CN'),
  };
  records[index] = nextRecord;
  writeRecords(records);
  notifySync();
  return nextRecord;
}

export function markRequestRecordsExported(ids: string[]) {
  const targetIds = new Set(ids);
  const records = getRequestRecords().map(record => {
    if (!targetIds.has(record.id) || record.stage === '已转工单') return record;
    return {
      ...record,
      stage: '已导出待评审' as const,
      updatedAt: new Date().toLocaleString('zh-CN'),
    };
  });
  writeRecords(records);
  notifySync();
}

export function deleteRequestRecord(id: string) {
  const records = getRequestRecords();
  const nextRecords = records.filter(record => record.id !== id);
  if (nextRecords.length === records.length) {
    throw new Error(`Request record ${id} not found`);
  }
  writeRecords(nextRecords);
  notifySync();
}

export function onRequestRecordsSync(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CUSTOM_EVENT, callback);
  return () => {
    window.removeEventListener(CUSTOM_EVENT, callback);
  };
}
