import { beforeEach, describe, expect, it } from 'vitest';

import {
  approveCurrentApprovalStage,
  approveReview,
  completeServiceDelivery,
  archiveOrder,
  completeAllChainNodes,
  confirmOrder,
  confirmPlan,
  createOrder,
  deleteOrder,
  getOrder,
  getArchivedOrders,
  getDeliveredAssets,
  getDeliveredAssetsByOrderId,
  getOrders,
  rejectCurrentApprovalStage,
  rejectReview,
  rejectPlan,
  submitOrderForReview,
  submitPlanForConfirmation,
  updateOrderStatus,
  updateDeliveryAcceptance,
  updateItsmTicketInfo,
} from './orders';
import { generateInternetAppDetail } from '../data/mock-delivery';
import type { DeliveryImplementationPlan, Order } from '../types';

class LocalStorageMock {
  private store = new Map<string, string>();

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }
}

class BroadcastChannelMock {
  addEventListener() {}
  removeEventListener() {}
  postMessage() {}
}

function seedOrders(rawOrders: unknown[]) {
  localStorage.setItem('ipe_orders', JSON.stringify(rawOrders));
}

function makeImplementationPlan(summary = '交付中心正式实施方案'): DeliveryImplementationPlan {
  return {
    summary,
    steps: [
      { name: '资源准备', owner: 'IPE交付中心', mode: 'hybrid', output: '资源与权限准备完成' },
      { name: '服务部署', owner: '能力域交付工程师', mode: 'hybrid', output: '服务交付结果' },
    ],
    prerequisites: ['架构评审已通过', 'ITSM / 资源审批已通过'],
    risks: ['实施窗口需提前确认'],
    estimatedSchedule: '1-3 个工作日',
    deliverables: ['交付资产记录', '配置明细'],
  };
}

describe('orders store', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: new LocalStorageMock(),
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'BroadcastChannel', {
      value: BroadcastChannelMock,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'window', {
      value: {
        dispatchEvent: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        setInterval: () => 1,
        clearInterval: () => {},
      },
      configurable: true,
      writable: true,
    });
  });

  it('archives confirmed orders and rejects non-confirmed states', () => {
    const order = createOrder({
      comboId: 'combo-test',
      comboName: '测试环境交付',
      services: ['MySQL数据库'],
      aiConfig: '标准',
      answers: {},
      extras: {},
    });

    seedOrders([
      {
        ...order,
        status: 'confirmed',
        serviceProgress: [
          {
            name: 'MySQL数据库',
            status: 'completed',
          },
        ],
      },
    ]);

    const archived = archiveOrder(order.id);
    expect(archived.status).toBe('archived');
    expect(archived.archivedAt).toBeTruthy();
    expect(getArchivedOrders()).toEqual(getOrders().filter(item => item.status === 'archived'));

    seedOrders([
      {
        ...order,
        id: 'ORD-PENDING-ARCHIVE',
        status: 'pending',
        serviceProgress: [
          {
            name: 'MySQL数据库',
            status: 'pending',
          },
        ],
      },
    ]);

    expect(() => archiveOrder('ORD-PENDING-ARCHIVE')).toThrow('Only confirmed orders can be archived');
  });

  it('supports plan confirmation and feedback loop before delivery', () => {
    const order = createOrder({
      comboId: 'combo-test',
      comboName: '测试环境交付',
      services: ['MySQL数据库'],
      aiConfig: '标准',
      answers: {},
      extras: {},
    });

    seedOrders([
      {
        ...order,
        status: 'processing',
        itsm: {
          status: 'approved',
          sourceOrderId: order.id,
          formSnapshot: {},
          syncLogs: [],
        },
        serviceProgress: [
          {
            name: 'MySQL数据库',
            status: 'pending',
          },
        ],
      },
    ]);

    expect(() => submitPlanForConfirmation(order.id)).toThrow('Delivery implementation plan must be ready before plan confirmation');

    const accepted = updateDeliveryAcceptance(order.id, {
      status: 'plan_ready',
      acceptedBy: 'IPE交付中心',
      deliveryPath: 'standard',
      domains: ['数据库'],
      implementationPlan: makeImplementationPlan(),
    });
    expect(accepted.deliveryAcceptance?.status).toBe('plan_ready');

    const waitingPlanConfirm = submitPlanForConfirmation(order.id);
    expect(waitingPlanConfirm.status).toBe('plan_confirming');

    const rejected = rejectPlan(order.id, '数据库规格偏小，请调整为高可用实例');
    expect(rejected.status).toBe('processing');
    expect(rejected.planFeedback).toBe('数据库规格偏小，请调整为高可用实例');
    expect(rejected.planFeedbackAt).toBeTruthy();

    seedOrders([
      {
        ...rejected,
        status: 'plan_confirming',
      },
    ]);

    const approved = confirmPlan(order.id);
    expect(approved.status).toBe('delivering');
    expect(approved.planFeedback).toBeUndefined();
    expect(approved.planFeedbackAt).toBeUndefined();
  });

  it('keeps ITSM approved orders in processing until delivery acceptance plan is ready', () => {
    const order = createOrder({
      comboId: 'combo-test',
      comboName: '测试环境交付',
      services: ['MySQL数据库'],
      aiConfig: '标准',
      answers: {},
      extras: {},
    });

    seedOrders([
      {
        ...order,
        status: 'processing',
        itsm: {
          status: 'processing',
          sourceOrderId: order.id,
          formSnapshot: {},
          syncLogs: [],
        },
      },
    ]);

    const approved = updateItsmTicketInfo(order.id, {
      status: 'approved',
      actor: '运营中心',
      resultComment: '资源审批通过',
    });

    expect(approved.status).toBe('processing');
    expect(approved.itsm?.status).toBe('approved');
    expect(approved.deliveryAcceptance?.status).toBe('accepted');
    expect(approved.deliveryAcceptance?.acceptedBy).toBe('运营中心');
  });

  it('supports review approval and rejection before orchestration', () => {
    const order = createOrder({
      comboId: 'combo-review',
      comboName: '生产环境发布',
      services: ['云基础设施'],
      aiConfig: '标准',
      answers: {},
      extras: {},
    });

    const reviewing = submitOrderForReview(order.id);
    expect(reviewing.status).toBe('reviewing');
    expect(reviewing.reviewStatus).toBe('pending');

    const rejected = rejectReview(order.id, '请补充业务影响范围与预计使用时长');
    expect(rejected.status).toBe('pending');
    expect(rejected.reviewStatus).toBe('rejected');
    expect(rejected.reviewComment).toBe('请补充业务影响范围与预计使用时长');
    expect(rejected.reviewedAt).toBeTruthy();

    seedOrders([
      {
        ...rejected,
        status: 'reviewing',
        reviewStatus: 'pending',
      },
    ]);

    const approved = approveReview(order.id, '资源范围合理，可进入方案编排');
    expect(approved.status).toBe('processing');
    expect(approved.reviewStatus).toBe('approved');
    expect(approved.reviewComment).toBe('资源范围合理，可进入方案编排');
    expect(approved.reviewedAt).toBeTruthy();
  });

  it('normalizes workflow timeline after status rollback so only one current node remains', () => {
    const order = createOrder({
      comboId: 'combo-review',
      comboName: '生产环境发布',
      services: ['云基础设施'],
      aiConfig: '标准',
      answers: {},
      extras: {},
    });

    submitOrderForReview(order.id);
    approveReview(order.id, '评审通过');
    const rolledBack = updateOrderStatus(order.id, 'pending');

    expect(rolledBack.status).toBe('pending');
    expect(rolledBack.workflowTimeline?.map(node => node.status)).toEqual(['pending']);
    expect(rolledBack.workflowTimeline?.[0].completedAt).toBeUndefined();
  });

  it('repairs dirty workflow timeline snapshots when loading stored orders', () => {
    const dirtyOrder: Partial<Order> = {
      id: 'ORD-DIRTY-TIMELINE',
      comboId: 'combo-dirty',
      comboName: '脏时间线修复',
      services: ['云基础设施'],
      aiConfig: '标准',
      orchestratedPlan: {
        summary: '脏时间线修复测试方案',
        estimatedTime: '1 个工作日',
        resources: [],
        integrations: [],
      },
      answers: {},
      extras: {},
      status: 'reviewing',
      createdAt: '2026/6/29 16:00:00',
      reviewStatus: 'pending',
      serviceProgress: [{ name: '云基础设施', status: 'pending' }],
      workflowTimeline: [
        {
          status: 'pending',
          label: '待处理',
          enteredAt: '2026/6/29 16:00:00',
          completedAt: undefined,
          slaTarget: undefined,
        },
        {
          status: 'reviewing',
          label: '评审中',
          enteredAt: '2026/6/29 16:05:00',
          completedAt: undefined,
          slaTarget: '8h',
        },
        {
          status: 'processing',
          label: '处理中',
          enteredAt: '2026/6/29 16:10:00',
          completedAt: undefined,
          slaTarget: '24h',
        },
      ],
    };

    seedOrders([dirtyOrder]);

    const loaded = getOrder('ORD-DIRTY-TIMELINE');
    expect(loaded?.workflowTimeline?.map(node => node.status)).toEqual(['pending', 'reviewing']);
    expect(loaded?.workflowTimeline?.[0].completedAt).toBeTruthy();
    expect(loaded?.workflowTimeline?.[1].completedAt).toBeUndefined();
  });

  it('returns a just-created order immediately by id', () => {
    const order = createOrder({
      comboId: 'combo-immediate-read',
      comboName: '即时读取测试',
      services: ['云基础设施'],
      aiConfig: '标准',
      answers: { applicationName: '即时读取系统' },
      extras: {},
    });

    const loaded = getOrder(order.id);
    expect(loaded?.id).toBe(order.id);
    expect(loaded?.comboName).toBe('即时读取测试');
  });

  it('deletes an order from shared storage', () => {
    const order = createOrder({
      comboId: 'combo-delete',
      comboName: '删除测试工单',
      services: ['云基础设施'],
      aiConfig: '标准',
      answers: {},
      extras: {},
    });

    expect(getOrder(order.id)?.id).toBe(order.id);
    deleteOrder(order.id);
    expect(getOrder(order.id)).toBeUndefined();
  });

  it('supports step-by-step approval stage progression', () => {
    const order = createOrder({
      comboId: 'combo-review-stages',
      comboName: '生产资源开通',
      services: ['云基础设施'],
      aiConfig: '标准',
      answers: {},
      extras: {},
      approvalStages: [
        { stageCode: 'dept-review', stageName: '部门审批', role: '评审人', required: true, source: 'base' },
        { stageCode: 'security-review', stageName: '安全审批', role: '安全管理员', required: true, source: 'trigger' },
        { stageCode: 'ops-review', stageName: '运维评审', role: '交付工程师', required: true, source: 'base' },
      ],
    });

    const reviewing = submitOrderForReview(order.id);
    expect(reviewing.approvalStages?.[0].status).toBe('processing');
    expect(reviewing.approvalStages?.[1].status).toBe('pending');

    const firstApproved = approveCurrentApprovalStage(order.id, '部门已确认');
    expect(firstApproved.status).toBe('reviewing');
    expect(firstApproved.reviewStatus).toBe('pending');
    expect(firstApproved.approvalStages?.[0].status).toBe('approved');
    expect(firstApproved.approvalStages?.[1].status).toBe('processing');

    const rejected = rejectCurrentApprovalStage(order.id, '安全策略需补充');
    expect(rejected.status).toBe('pending');
    expect(rejected.reviewStatus).toBe('rejected');
    expect(rejected.approvalStages?.[0].status).toBe('approved');
    expect(rejected.approvalStages?.[1].status).toBe('rejected');

    seedOrders([
      {
        ...reviewing,
        approvalStages: reviewing.approvalStages,
      },
    ]);

    approveCurrentApprovalStage(order.id, '部门通过');
    const secondApproved = approveCurrentApprovalStage(order.id, '安全通过');
    const finalApproved = approveCurrentApprovalStage(order.id, '运维通过');
    expect(secondApproved.status).toBe('reviewing');
    expect(finalApproved.status).toBe('processing');
    expect(finalApproved.reviewStatus).toBe('approved');
    expect(finalApproved.approvalStages?.every(stage => stage.status === 'approved')).toBe(true);
  });

  it('builds delivered assets for completed confirmed and archived orders', () => {
    seedOrders([
      {
        id: 'ORD-ARCHIVED',
        comboId: 'combo-db',
        comboName: '数据库交付',
        services: ['MySQL数据库'],
        aiConfig: '标准',
        orchestratedPlan: { resources: [] },
        answers: {},
        extras: {},
        status: 'archived',
        createdAt: '2026/6/11 10:00:00',
        archivedAt: '2026/6/11 11:00:00',
        serviceProgress: [
          {
            name: 'MySQL数据库',
            status: 'completed',
            deliveryDetail: {
              type: 'db',
              asset: { assetId: 'DB-001', instance: 'mysql-prod-01' },
              connection: { host: '10.0.0.11', port: 3306, schema: 'orders', charset: 'utf8mb4' },
              ha: { mode: '主从', primary: 'db-a', secondary: 'db-b' },
            },
          },
        ],
      },
      {
        id: 'ORD-CONFIRMED',
        comboId: 'combo-paas',
        comboName: 'PaaS交付',
        services: ['PaaS容器平台'],
        aiConfig: '标准',
        orchestratedPlan: { resources: [] },
        answers: {},
        extras: {},
        status: 'confirmed',
        createdAt: '2026/6/11 10:10:00',
        serviceProgress: [
          {
            name: 'PaaS容器平台',
            status: 'completed',
            deliveryDetail: {
              type: 'paas',
              cluster: { name: 'k8s-prod', apiServer: 'https://k8s.example.com', version: '1.30' },
              namespace: { name: 'team-a', nodeCount: 6, resourceQuota: '32C/64G' },
            },
          },
        ],
      },
      {
        id: 'ORD-PENDING',
        comboId: 'combo-pending',
        comboName: '待处理工单',
        services: ['ELK日志平台'],
        aiConfig: '标准',
        orchestratedPlan: { resources: [] },
        answers: {},
        extras: {},
        status: 'pending',
        createdAt: '2026/6/11 10:20:00',
        serviceProgress: [
          {
            name: 'ELK日志平台',
            status: 'pending',
            deliveryDetail: {
              type: 'logging',
              agent: { name: 'filebeat', version: '8.15', status: 'running' },
              cluster: { esNodes: 3, kibanaUrl: 'https://kibana.example.com', indexPattern: 'logs-*' },
            },
          },
        ],
      },
    ]);

    const assets = getDeliveredAssets();

    expect(assets).toHaveLength(2);
    expect(
      assets.map(asset => ({ orderId: asset.orderId, category: asset.category, assetName: asset.assetName, status: asset.status })),
    ).toEqual([
        { orderId: 'ORD-ARCHIVED', category: 'database', assetName: 'DB-001', status: 'archived' },
        { orderId: 'ORD-CONFIRMED', category: 'paas', assetName: 'k8s-prod', status: 'accepted' },
      ]);
    expect(assets[0].assetMeta).toEqual({
        资产编号: 'DB-001',
        实例名: 'mysql-prod-01',
        主机: '10.0.0.11',
        端口: '3306',
        库名: 'orders',
        字符集: 'utf8mb4',
        HA模式: '主从',
        主节点: 'db-a',
        从节点: 'db-b',
      });
  });

  it('builds delivered assets for archived internet app orders', () => {
    const detail = generateInternetAppDetail(
      '订单中心',
      '交易平台',
      'PROD',
      'PC Web',
      '交易域',
      'orders.example.com',
      '80,443',
      true,
    );

    const order = createOrder({
      comboId: 'combo-internet-app',
      comboName: '互联网应用部署',
      services: ['云基础设施', '容器计算', 'MySQL数据库', 'Redis缓存', '网络发布', 'CDN加速', 'WAF防护'],
      aiConfig: '互联网应用全栈自动化交付',
      answers: {},
      extras: { cdnEnabled: true },
      internetAppDetail: detail,
    });

    seedOrders([
      {
        ...order,
        status: 'delivering',
      },
    ]);

    const completed = completeAllChainNodes(order.id);
    expect(completed.status).toBe('completed');
    expect(completed.serviceProgress.every(service => service.status === 'completed')).toBe(true);
    expect(completed.serviceProgress.every(service => service.deliveryDetail)).toBe(true);

    seedOrders([
      {
        ...completed,
        status: 'confirmed',
      },
    ]);

    const archived = archiveOrder(order.id);
    expect(archived.status).toBe('archived');

    const assets = getDeliveredAssets().filter(asset => asset.orderId === order.id);
    expect(assets).toHaveLength(7);
    expect(assets.some(asset => asset.category === 'database' && asset.assetName.includes('MYSQL'))).toBe(true);
    expect(assets.some(asset => asset.category === 'network' && asset.assetMeta['域名'] === 'orders.example.com')).toBe(true);
    expect(assets.some(asset => asset.category === 'security' && asset.assetMeta['SSL域名'] === 'orders.example.com')).toBe(true);
  });

  it('tracks combo order lifecycle into delivered asset stages', () => {
    const order = createOrder({
      comboId: 'combo-test',
      comboName: '搭建测试环境',
      services: ['容器集群配置(DCE4)', 'Redis部署', 'MQ部署', '日志接入(EFK)'],
      aiConfig: '测试环境组合交付方案 · 自动编排',
      answers: {
        applicationName: '组合交付回归验证',
        environment: 'UAT',
      },
      extras: {},
    });

    const reviewing = submitOrderForReview(order.id);
    expect(reviewing.status).toBe('reviewing');

    const processing = approveReview(order.id, '评审通过');
    expect(processing.status).toBe('processing');

    const itsmApproved = updateItsmTicketInfo(order.id, {
      status: 'approved',
      actor: '运营中心',
      resultComment: '资源审批通过',
    });
    expect(itsmApproved.status).toBe('processing');

    const accepted = updateDeliveryAcceptance(order.id, {
      status: 'plan_ready',
      acceptedBy: 'IPE交付中心',
      deliveryPath: 'standard',
      domains: ['PaaS', '中间件', '运维'],
      implementationPlan: makeImplementationPlan('组合服务正式实施方案'),
    });
    expect(accepted.deliveryAcceptance?.implementationPlan?.summary).toBe('组合服务正式实施方案');

    const planConfirming = submitPlanForConfirmation(order.id);
    expect(planConfirming.status).toBe('plan_confirming');

    const delivering = confirmPlan(order.id);
    expect(delivering.status).toBe('delivering');

    let current = delivering;
    for (const serviceName of order.services) {
      current = completeServiceDelivery(order.id, serviceName);
    }

    expect(current.status).toBe('completed');
    expect(current.serviceProgress.every(service => service.status === 'completed')).toBe(true);

    const pendingAcceptanceAssets = getDeliveredAssets().filter(asset => asset.orderId === order.id);
    expect(pendingAcceptanceAssets.length).toBeGreaterThan(0);
    expect(pendingAcceptanceAssets.every(asset => asset.status === 'pending_acceptance')).toBe(true);

    const confirmed = confirmOrder(order.id);
    expect(confirmed.status).toBe('confirmed');

    const acceptedAssets = getDeliveredAssets().filter(asset => asset.orderId === order.id);
    expect(acceptedAssets.length).toBe(pendingAcceptanceAssets.length);
    expect(acceptedAssets.every(asset => asset.status === 'accepted')).toBe(true);
    expect(acceptedAssets.every(asset => asset.acceptedAt)).toBe(true);

    const archived = archiveOrder(order.id);
    expect(archived.status).toBe('archived');

    const archivedAssets = getDeliveredAssets().filter(asset => asset.orderId === order.id);
    expect(archivedAssets.length).toBe(acceptedAssets.length);
    expect(archivedAssets.every(asset => asset.status === 'archived')).toBe(true);
    expect(archivedAssets.every(asset => asset.archivedAt)).toBe(true);

    const scopedAssets = getDeliveredAssetsByOrderId(order.id);
    expect(scopedAssets).toHaveLength(archivedAssets.length);
    expect(scopedAssets.every(asset => asset.orderId === order.id)).toBe(true);
  });

  it('returns empty scoped assets for non-delivered orders', () => {
    const order = createOrder({
      comboId: 'combo-test',
      comboName: '搭建测试环境',
      services: ['Redis部署'],
      aiConfig: '测试环境组合交付方案',
      answers: {
        applicationName: '预交付校验',
        environment: 'DEV',
      },
      extras: {},
    });

    expect(getDeliveredAssetsByOrderId(order.id)).toHaveLength(0);
  });

  it('rebuilds internet app detail from answers for legacy archived orders', () => {
    seedOrders([
      {
        id: 'ORD-LEGACY-INTERNET',
        comboId: 'combo-internet-app',
        comboName: '互联网应用部署',
        services: ['云基础设施', '容器计算', 'MySQL数据库', 'Redis缓存', '网络发布', 'CDN加速', 'WAF防护'],
        aiConfig: '互联网应用全栈自动化交付',
        orchestratedPlan: { resources: [], integrations: [], summary: '', estimatedTime: '' },
        answers: {
          appName: '旧版订单中心',
          system: '旧版交易系统',
          targetEnv: 'PROD',
          appType: 'PC Web',
          businessDomain: '交易域',
          domain: 'legacy-orders.example.com',
          ports: '80,443',
        },
        extras: { cdnEnabled: true },
        status: 'archived',
        createdAt: '2026/6/11 10:30:00',
        archivedAt: '2026/6/11 11:30:00',
        serviceProgress: [
          { name: '云基础设施', status: 'pending' },
          { name: '容器计算', status: 'pending' },
          { name: 'MySQL数据库', status: 'pending' },
          { name: 'Redis缓存', status: 'pending' },
          { name: '网络发布', status: 'pending' },
          { name: 'CDN加速', status: 'pending' },
          { name: 'WAF防护', status: 'pending' },
        ],
      },
    ]);

    const orders = getOrders();
    expect(orders[0].internetAppDetail?.domain).toBe('legacy-orders.example.com');
    expect(orders[0].serviceProgress.every(service => service.deliveryDetail)).toBe(true);

    const assets = getDeliveredAssets();
    expect(assets).toHaveLength(7);
    expect(assets.some(asset => asset.orderId === 'ORD-LEGACY-INTERNET' && asset.category === 'network')).toBe(true);
  });

  it('normalizes legacy combo service spec ids and rebuilds archived assets', () => {
    seedOrders([
      {
        id: 'ORD-LEGACY-COMBO',
        comboId: 'combo-test',
        comboName: '搭建测试环境',
        services: ['paas-dce4', 'mw-redis', 'mw-mq', 'paas-efk'],
        aiConfig: '测试环境交付',
        orchestratedPlan: { resources: [], integrations: [], summary: '', estimatedTime: '' },
        answers: {},
        extras: {},
        status: 'archived',
        createdAt: '2026/6/15 10:00:00',
        archivedAt: '2026/6/15 10:30:00',
        serviceProgress: [
          { name: 'paas-dce4', status: 'completed' },
          { name: 'mw-redis', status: 'completed' },
          { name: 'mw-mq', status: 'completed' },
          { name: 'paas-efk', status: 'completed' },
        ],
      },
    ]);

    const orders = getOrders();
    expect(orders[0].services).toEqual(['容器集群配置(DCE4)', 'Redis部署', 'MQ部署', '日志接入(EFK)']);
    expect(orders[0].serviceProgress.map(service => service.name)).toEqual(['容器集群配置(DCE4)', 'Redis部署', 'MQ部署', '日志接入(EFK)']);

    const assets = getDeliveredAssets().filter(asset => asset.orderId === 'ORD-LEGACY-COMBO');
    expect(assets).toHaveLength(4);
    expect(assets.some(asset => asset.serviceName === '容器集群配置(DCE4)' && asset.category === 'paas')).toBe(true);
    expect(assets.some(asset => asset.serviceName === 'Redis部署' && asset.category === 'database')).toBe(true);
    expect(assets.some(asset => asset.serviceName === 'MQ部署' && asset.category === 'middleware')).toBe(true);
    expect(assets.some(asset => asset.serviceName === '日志接入(EFK)' && asset.category === 'logging')).toBe(true);
  });
});
