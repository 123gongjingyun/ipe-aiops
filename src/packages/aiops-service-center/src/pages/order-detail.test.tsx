// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';

import { OrderDetail } from './order-detail';

function seedProcessingOrder() {
  window.localStorage.setItem('ipe_orders', JSON.stringify([
    {
      id: 'ORD-CENTER-PROCESSING',
      comboId: 'combo-test',
      comboName: 'Center阶段卡片回归',
      services: ['MySQL数据库'],
      aiConfig: '标准',
      orchestratedPlan: {
        summary: '实施方案摘要',
        estimatedTime: '1-2 个工作日',
        resources: [],
        integrations: [],
      },
      answers: {},
      extras: {},
      status: 'processing',
      createdAt: '2026/6/30 10:00:00',
      reviewedAt: '2026/6/30 10:20:00',
      reviewStatus: 'approved',
      workflowTimeline: [
        { status: 'pending', label: '待处理', enteredAt: '2026/6/30 10:00:00', completedAt: '2026/6/30 10:00:00' },
        { status: 'reviewing', label: '评审中', enteredAt: '2026/6/30 10:10:00', completedAt: '2026/6/30 10:20:00' },
        { status: 'processing', label: '处理中', enteredAt: '2026/6/30 10:21:00' },
      ],
      itsm: {
        status: 'processing',
        sourceOrderId: 'ORD-CENTER-PROCESSING',
        ticketNo: 'ITSM-20260630',
        formSnapshot: {},
        syncLogs: [],
      },
      deliveryAcceptance: {
        status: 'accepted',
        acceptedBy: 'IPE交付中心',
        acceptedAt: '2026/6/30 10:30:00',
        deliveryPath: 'standard',
        domains: ['数据库'],
      },
      serviceProgress: [
        { name: 'MySQL数据库', status: 'pending' },
      ],
    },
  ]));
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/orders/ORD-CENTER-PROCESSING']}>
      <Routes>
        <Route path="/orders/:id" element={<OrderDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Center OrderDetail stage cards', () => {
  beforeEach(() => {
    window.localStorage.clear();
    seedProcessingOrder();
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps later stages pending when the order is still processing', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('工单流转阶段')).toBeTruthy();
    });

    const stageShell = screen.getByText('工单流转阶段').closest('.rounded-lg');
    expect(stageShell).toBeTruthy();
    const stageButtons = within(stageShell as HTMLElement).getAllByRole('button');

    const reviewCard = stageButtons.find(button => button.textContent?.includes('发起需求与架构评审'));
    const itsmCard = stageButtons.find(button => button.textContent?.includes('ITSM审批'));
    const planCard = stageButtons.find(button => button.textContent?.includes('确认交付方案'));
    const deliveryCard = stageButtons.find(button => button.textContent?.includes('交付实施'));
    const acceptanceCard = stageButtons.find(button => button.textContent?.includes('验收与归档'));

    expect(reviewCard).toBeTruthy();
    expect(itsmCard).toBeTruthy();
    expect(planCard).toBeTruthy();
    expect(deliveryCard).toBeTruthy();
    expect(acceptanceCard).toBeTruthy();

    expect(reviewCard?.textContent).toContain('已完成');
    expect(itsmCard?.textContent).toContain('处理中');
    expect(planCard?.textContent).toContain('待处理');
    expect(deliveryCard?.textContent).toContain('待处理');
    expect(acceptanceCard?.textContent).toContain('待处理');
  });
});
