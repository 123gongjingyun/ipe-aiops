import type { RequestRecord } from '../store/request-records';

interface TalkingPointRule {
  key: string;
  message: string;
  condition: (draft: RequestRecord['draft'], product: string) => boolean;
}

const RULES: TalkingPointRule[] = [
  {
    key: 'background-missing',
    message: '建议请申请人补充本次申请的业务背景与目标，便于评审判断资源优先级和紧急程度。',
    condition: draft => !draft.userRequirementBackground?.trim(),
  },
  {
    key: 'users-missing',
    message: '建议请申请人明确用户群体、用户规模、访问时间分布及认证方式，用于评估安全边界与容量规划。',
    condition: draft => !draft.userRequirementUsers?.trim(),
  },
  {
    key: 'cloud-missing',
    message: '建议请申请人明确所需云服务类型、资源使用周期及到期后的回收或续期策略。',
    condition: draft => !draft.userRequirementCloud?.trim() && !draft.userRequirementCloudService?.trim(),
  },
  {
    key: 'ops-missing',
    message: '建议请申请人补充服务时间、备份恢复、监控告警、运维责任分工及安全合规要求。',
    condition: draft => !draft.userRequirementOps?.trim(),
  },
  {
    key: 'network-missing',
    message: '建议请申请人补充网络区域、访问边界、域名、端口、白名单及安全设备需求。',
    condition: draft => !draft.userRequirementNetwork?.trim(),
  },
  {
    key: 'vm-spec-missing',
    message: '虚拟机规格档位尚未确认，建议请申请人明确 CPU、内存、磁盘初步要求或选择推荐规格。',
    condition: (draft, product) => product === 'vm' && !draft.vmSpecProfile?.trim(),
  },
  {
    key: 'vm-quantity-missing',
    message: '虚拟机数量尚未确认，建议请申请人结合部署方式和高可用要求明确实例数量。',
    condition: (draft, product) => product === 'vm' && !draft.vmQuantity?.trim(),
  },
];

const COMMON_TALKING_POINTS: Record<string, string[]> = {
  vm: [
    '评审时可请申请人确认资源使用周期和到期回收策略。',
    '如涉及数据库或中间件组件，建议确认版本兼容性、高可用方案及备份策略。',
    '如涉及公网访问，建议确认域名、WAF、IPS 等安全防护措施是否已纳入计划。',
  ],
  container: [
    '评审时可请申请人确认命名空间配额、实例扩缩容策略及使用周期。',
    '建议确认是否需要接入统一日志、监控、备份等标准运维能力。',
    '如涉及外部访问，建议确认 Ingress、证书及安全组策略。',
  ],
  obs: [
    '评审时可请申请人确认桶容量规划、生命周期策略及 AK/SK 分配方式。',
    '建议明确访问策略（公网/内网/白名单）和数据安全等级。',
  ],
  sfs: [
    '评审时可请申请人确认共享存储容量、协议类型及使用周期。',
    '建议明确挂载点和访问权限范围。',
  ],
  permission: [
    '评审时可请申请人确认权限申请范围、有效期及审批链。',
    '建议明确权限使用场景和到期回收方式。',
  ],
  network: [
    '评审时可请申请人确认源/目标资产、端口范围和协议类型。',
    '建议明确访问策略的有效期和安全审批依据。',
  ],
};

export function buildRequestReviewTalkingPoints(record: RequestRecord): string[] {
  const points = RULES.filter(rule => rule.condition(record.draft, record.product)).map(rule => rule.message);
  const commonPoints = COMMON_TALKING_POINTS[record.product] || COMMON_TALKING_POINTS.vm;

  if (points.length === 0) {
    return [...commonPoints];
  }

  return [...points, ...commonPoints];
}
