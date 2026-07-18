import { describe, expect, it } from 'vitest';

import {
  buildPortalAcceptanceAssetNodes,
  buildPortalDeliveryPlanNodes,
  buildPortalResourceItsmNodes,
} from './order-stage-nodes';

describe('order stage nodes builders', () => {
  it('builds portal itsm stage nodes with processing and completion semantics', () => {
    const processingNodes = buildPortalResourceItsmNodes({
      orderId: 'ORD-1',
      orderCreatedAt: '2026/6/29 10:00:00',
      orderReviewedAt: '2026/6/29 11:00:00',
      orderStatus: 'processing',
      reviewStatus: 'approved',
      itsmInfo: {
        ticketNo: 'ITSM-1',
        syncStatus: '审批处理中',
        lastSyncAt: '2026/6/29 11:30:00',
      },
    });

    expect(processingNodes.map(node => node.status)).toEqual(['completed', 'processing']);

    const completedNodes = buildPortalResourceItsmNodes({
      orderId: 'ORD-1',
      orderStatus: 'plan_confirming',
      reviewStatus: 'approved',
      itsmInfo: {},
    });
    expect(completedNodes[1].status).toBe('completed');
  });

  it('builds portal delivery plan nodes from shared delivery acceptance info', () => {
    const nodes = buildPortalDeliveryPlanNodes({
      orderStatus: 'plan_confirming',
      orderPlanFeedbackAt: '2026/6/29 12:00:00',
      deliveryAcceptance: {
        status: 'plan_ready',
        acceptedBy: 'IPE交付中心',
        deliveryPath: 'standard',
        domains: ['网络', '数据库'],
        implementationPlan: {
          summary: '正式实施方案',
          steps: [],
          prerequisites: [],
          risks: [],
          estimatedSchedule: '2天',
          deliverables: [],
        },
      },
    });

    expect(nodes[0].status).toBe('completed');
    expect(nodes[1].status).toBe('processing');
    expect(nodes[0].details.some(detail => detail.includes('能力域：网络、数据库'))).toBe(true);
  });

  it('builds portal acceptance asset nodes with acceptance and archive states', () => {
    const completedNodes = buildPortalAcceptanceAssetNodes({
      orderStatus: 'completed',
      assetCount: 3,
      orderCreatedAt: '2026/6/29 10:00:00',
    });
    expect(completedNodes.map(node => node.status)).toEqual(['processing', 'processing']);

    const archivedNodes = buildPortalAcceptanceAssetNodes({
      orderStatus: 'archived',
      assetCount: 3,
      orderArchivedAt: '2026/6/29 18:00:00',
    });
    expect(archivedNodes.map(node => node.status)).toEqual(['completed', 'completed']);
  });
});
