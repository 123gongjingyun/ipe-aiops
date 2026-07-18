// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ServiceLedger, buildCategoryAssetsCsv } from './service-ledger';
import { getAssetFieldSchema, getDeliveredAssets } from '@aiops/shared';

function seedOrders() {
  window.localStorage.setItem('ipe_orders', JSON.stringify([
    {
      id: 'ORD-ARCH-001',
      comboId: 'combo-db',
      comboName: '数据库交付',
      services: ['MySQL数据库'],
      aiConfig: '标准',
      orchestratedPlan: { resources: [], integrations: [], summary: '', estimatedTime: '' },
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
      id: 'ORD-ARCH-002',
      comboId: 'combo-paas',
      comboName: 'PaaS交付',
      services: ['PaaS容器平台'],
      aiConfig: '标准',
      orchestratedPlan: { resources: [], integrations: [], summary: '', estimatedTime: '' },
      answers: {},
      extras: {},
      status: 'archived',
      createdAt: '2026/6/11 10:10:00',
      archivedAt: '2026/6/11 11:10:00',
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
      id: 'ORD-CONF-003',
      comboId: 'combo-log',
      comboName: '日志交付',
      services: ['ELK日志平台'],
      aiConfig: '标准',
      orchestratedPlan: { resources: [], integrations: [], summary: '', estimatedTime: '' },
      answers: {},
      extras: {},
      status: 'confirmed',
      createdAt: '2026/6/11 10:20:00',
      serviceProgress: [
        {
          name: 'ELK日志平台',
          status: 'completed',
          deliveryDetail: {
            type: 'logging',
            agent: { name: 'filebeat', version: '8.15', status: 'running' },
            cluster: { esNodes: 3, kibanaUrl: 'https://kibana.example.com', indexPattern: 'logs-*' },
          },
        },
      ],
    },
    {
      id: 'ORD-COMP-004',
      comboId: 'combo-vm',
      comboName: '云主机交付',
      services: ['云主机'],
      aiConfig: '标准',
      orchestratedPlan: { resources: [], integrations: [], summary: '', estimatedTime: '' },
      answers: {},
      extras: {},
      status: 'completed',
      createdAt: '2026/6/11 10:30:00',
      workflowTimeline: [
        { status: 'pending', label: '待处理', enteredAt: '2026/6/11 09:50:00', completedAt: '2026/6/11 09:50:00' },
        { status: 'completed', label: '待验收', enteredAt: '2026/6/11 10:35:00' },
      ],
      serviceProgress: [
        {
          name: '云主机',
          status: 'completed',
          deliveryDetail: {
            type: 'vm',
            asset: { assetId: 'VM-001', location: 'A01', rackUnit: 'R01' },
            network: { hostname: 'vm-prod-01', ip: '10.0.0.21', subnet: '255.255.255.0', gateway: '10.0.0.1', vlan: 'vlan-10' },
            spec: { cpu: '4C', memory: '8G', systemDisk: '100G', dataDisk: '200G', os: 'CentOS 7.9' },
          },
        },
      ],
    },
  ]));
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ServiceLedger />
    </MemoryRouter>,
  );
}

describe('ServiceLedger page', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    window.localStorage.clear();
    seedOrders();
    vi.restoreAllMocks();
  });

  it('shows delivered assets for completed confirmed and archived orders', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /^按属性归类$/i }));

    expect(screen.getByRole('button', { name: /数据库\s*\(1\)/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /PaaS\s*\(1\)/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /日志\s*\(1\)/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /计算资源\s*\(1\)/i })).toBeTruthy();
  });

  it('applies category field schema defaults and field visibility settings', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /^按属性归类$/i }));
    await user.click(screen.getByRole('button', { name: /数据库\s*\(1\)/i }));

    expect(screen.getByRole('columnheader', { name: '实例名' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: '主机' })).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: '字符集' })).toBeNull();

    await user.type(screen.getByPlaceholderText('搜索当前分类字段...'), '10.0.0.11');
    expect(screen.getByText('mysql-prod-01')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /字段设置/i }));
    expect(screen.getByText('数据库 字段设置')).toBeTruthy();
    await user.click(screen.getByRole('checkbox', { name: /字符集/i }));
    await user.click(screen.getByRole('button', { name: /^确认$/i }));

    expect(await screen.findByRole('columnheader', { name: '字符集' })).toBeTruthy();
    expect(screen.getByText('utf8mb4')).toBeTruthy();
  });

  it('builds category csv from selected export fields only', () => {
    const assets = getDeliveredAssets().filter(asset => asset.category === 'database');
    const fields = getAssetFieldSchema('database').filter(field => field.key !== '端口');
    const csv = buildCategoryAssetsCsv(assets, fields);

    expect(csv).toContain('实例名');
    expect(csv).not.toContain('","端口"');
    expect(csv).toContain('mysql-prod-01');
  });

  it('exports selected category fields from the page', async () => {
    const user = userEvent.setup();
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:test'),
      configurable: true,
      writable: true,
    });
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:test');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderPage();

    await user.click(screen.getByRole('button', { name: /^按属性归类$/i }));
    await user.click(screen.getByRole('button', { name: /数据库\s*\(1\)/i }));
    await user.click(screen.getByRole('button', { name: /^导出$/i }));
    expect(screen.getByText('数据库 导出字段')).toBeTruthy();
    await user.click(screen.getByRole('checkbox', { name: /字符集/i }));
    await user.click(screen.getByRole('button', { name: /^确认$/i }));

    await waitFor(() => expect(createObjectURLSpy).toHaveBeenCalledTimes(1));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('opens rebuild preview from asset ledger', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /^按属性归类$/i }));
    await user.click(screen.getByRole('button', { name: /数据库\s*\(1\)/i }));
    await user.click(screen.getByRole('button', { name: /查看预览/i }));

    expect(await screen.findByText('资产重建预览')).toBeTruthy();
    expect(screen.getByText('冻结版本')).toBeTruthy();
    expect(screen.getByText('当前口径预览')).toBeTruthy();
  });

  it('shows asset status labels in delivered asset pool', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /^按属性归类$/i }));
    await user.click(screen.getByRole('button', { name: /计算资源\s*\(1\)/i }));
    expect(screen.getByText('待验收')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /日志\s*\(1\)/i }));
    expect(screen.getByText('已验收')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /数据库\s*\(1\)/i }));
    expect(screen.getByText('已归档')).toBeTruthy();
  });
});
