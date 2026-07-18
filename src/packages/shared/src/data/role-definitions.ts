import type { RoleDefinition } from '../types';

export const ROLE_DEFINITION_SEED: RoleDefinition[] = [
  {
    key: 'platform-admin',
    name: '系统管理员',
    summary: '负责系统配置、字段标准、角色权限和审批模板维护',
    perms: ['全局配置', '角色分配', '审批模板'],
    members: [
      { id: 'user-platform-admin-1', name: '陈思远', account: 'chen.sy', title: '平台负责人', department: '平台治理组', status: 'active' },
    ],
    updatedAt: '2026-06-26T08:00:00.000Z',
  },
  {
    key: 'delivery-engineer',
    name: '交付担当',
    summary: '负责维护服务规格、表单模板并推进交付实施',
    perms: ['服务目录', '表单模板', '工单处理'],
    members: [
      { id: 'user-delivery-1', name: '王启航', account: 'wang.qh', title: '高级交付工程师', department: '交付实施组', status: 'active' },
      { id: 'user-delivery-2', name: '李沐晨', account: 'li.mc', title: '交付担当', department: '交付实施组', status: 'active' },
    ],
    updatedAt: '2026-06-26T08:00:00.000Z',
  },
  {
    key: 'applicant',
    name: '申请人',
    summary: '提交申请、查看进度、确认方案和验收',
    perms: ['提交申请', '查看工单', '方案确认'],
    members: [
      { id: 'user-applicant-1', name: '周宁', account: 'zhou.ning', title: '业务系统经理', department: '业务研发部', status: 'active' },
    ],
    updatedAt: '2026-06-26T08:00:00.000Z',
  },
  {
    key: 'reviewer',
    name: '审批人',
    summary: '参与评审与审批节点处理，控制交付流转准入',
    perms: ['审批节点', '驳回建议'],
    members: [
      { id: 'user-reviewer-1', name: '赵思齐', account: 'zhao.sq', title: '部门负责人', department: '架构治理组', status: 'active' },
    ],
    updatedAt: '2026-06-26T08:00:00.000Z',
  },
  {
    key: 'ops',
    name: '运维人员',
    summary: '承担交付执行、运行保障和资产沉淀',
    perms: ['交付执行', '资产查看', '运行接管'],
    members: [
      { id: 'user-ops-1', name: '孙海涛', account: 'sun.ht', title: '值班运维', department: '运行保障组', status: 'active' },
    ],
    updatedAt: '2026-06-26T08:00:00.000Z',
  },
  {
    key: 'security-admin',
    name: '安全管理员',
    summary: '参与安全审批、风险校验和合规把关',
    perms: ['安全审批', '风险校验', '合规策略'],
    members: [
      { id: 'user-security-1', name: '高岚', account: 'gao.lan', title: '安全平台主管', department: '安全合规组', status: 'active' },
    ],
    updatedAt: '2026-06-26T08:00:00.000Z',
  },
];
