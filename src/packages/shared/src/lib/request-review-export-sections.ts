import type { RequestRecordDraftPayload } from '../store/request-records';

export type RequestReviewSectionKey =
  | 'userRequirements'
  | 'applicationInfo'
  | 'reviewSummaryOverview'
  | 'approvalNote';

export interface RequestReviewFieldDefinition {
  key: keyof RequestRecordDraftPayload;
  label: string;
  placeholder: string;
  required?: boolean;
  allowExplicitNone?: boolean;
  highlight?: 'pink';
}

export const REQUEST_REVIEW_EMPTY_PLACEHOLDER = '未填写';
export const REQUEST_REVIEW_APPROVAL_PLACEHOLDER = '审批完成后直接填写审批意见可再次导出';

export const USER_REQUIREMENT_SECTION_HINTS = [
  '“背景”必须填写具体内容，不可填写“无”；“网络需求-用户访问方式”必须填写具体内容，不可填写“无”。',
  '其他部分不需要的请填写“无”。如有需要网络侧/服务器侧等团队协助请联络窗口。',
] as const;

export const USER_REQUIREMENT_FIELDS: RequestReviewFieldDefinition[] = [
  {
    key: 'userRequirementBackground',
    label: '背景',
    placeholder: '请填写申请背景、目标、阶段及本次资源申请原因',
    required: true,
    highlight: 'pink',
  },
  {
    key: 'userRequirementUsers',
    label: '用户相关',
    placeholder: '请填写用户群体、用户规模、访问时间分布、角色权限及认证方式',
    required: true,
    allowExplicitNone: true,
    highlight: 'pink',
  },
  {
    key: 'userRequirementOps',
    label: '运维与安全要求',
    placeholder: '请填写服务时间、备份恢复、监控告警、运维分工和安全合规要求',
    required: true,
    allowExplicitNone: true,
    highlight: 'pink',
  },
  {
    key: 'userRequirementCloudService',
    label: '云服务提供',
    placeholder: '请填写所需云服务类型与资源使用周期',
    required: true,
    allowExplicitNone: true,
    highlight: 'pink',
  },
  {
    key: 'userRequirementMiddleware',
    label: '中间件 / 数据库',
    placeholder: '请填写数据库、中间件类型与性能容量预估',
    required: true,
    allowExplicitNone: true,
    highlight: 'pink',
  },
  {
    key: 'userRequirementServer',
    label: '服务器基础侧',
    placeholder: '请填写操作系统、计算规格与部署方式要求',
    required: true,
    allowExplicitNone: true,
    highlight: 'pink',
  },
  {
    key: 'userRequirementNetwork',
    label: '网络需求',
    placeholder: '请填写网络区域、访问边界、域名、端口、白名单、带宽及安全设备要求',
    required: true,
    highlight: 'pink',
  },
];

export const APPLICATION_INFO_FIELDS: RequestReviewFieldDefinition[] = [
  { key: 'systemCode', label: '系统编号', placeholder: '未填写系统编号' },
  { key: 'systemName', label: '系统名称', placeholder: '未填写系统名称', required: true },
  { key: 'moduleName', label: '模块名称', placeholder: '未填写模块名称' },
  { key: 'owner', label: '担当', placeholder: '未填写担当', required: true },
  { key: 'environment', label: '申请环境', placeholder: '未填写申请环境', required: true },
  { key: 'vmResourceMode', label: '申请模式', placeholder: '未填写申请模式' },
  { key: 'vmDeploymentMode', label: '部署方式', placeholder: '未填写部署方式' },
  { key: 'vmSpecProfile', label: '规格档位', placeholder: '未填写规格档位' },
  { key: 'vmQuantity', label: '数量', placeholder: '未填写数量' },
  { key: 'vmDiskType', label: '磁盘类型', placeholder: '未填写磁盘类型' },
  { key: 'vmSystemDisk', label: '系统盘（GB）', placeholder: '未填写系统盘' },
  { key: 'vmDataDisk', label: '数据盘（GB）', placeholder: '未填写数据盘' },
  { key: 'vmComponentSelection', label: '组件能力选择', placeholder: '未填写组件能力选择' },
  { key: 'vmConfigReference', label: '配置参考', placeholder: '未生成配置参考' },
];

export const REQUEST_REVIEW_SECTION_TITLES: Record<RequestReviewSectionKey, string> = {
  userRequirements: '用户需求',
  applicationInfo: '申请信息',
  reviewSummaryOverview: '评审概要概览',
  approvalNote: '审批意见',
};
