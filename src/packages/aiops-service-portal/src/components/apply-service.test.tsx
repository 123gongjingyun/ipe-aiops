// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ApplyServicePage } from '../pages/apply-service';
import { bootstrapSchemaTemplatesFromSpecs, getOrders, getSpec, saveSchemaTemplateConfigProfileBinding } from '@aiops/shared';

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

function renderApplyService(serviceId: string) {
  return render(
    <MemoryRouter initialEntries={[`/apply-service/${serviceId}`]}>
      <Routes>
        <Route path="/apply-service/:serviceId" element={<ApplyServicePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ApplyService editable AI recommendation', () => {
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
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      value: vi.fn(),
      configurable: true,
      writable: true,
    });
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('allows editing AI recommendation before submission and persists orchestrated plan', async () => {
    renderApplyService('db-mysql');

    const appNameInput = await screen.findByLabelText(/应用名称/);
    fireEvent.change(appNameInput, { target: { value: '订单中心' } });

    const appEnglishNameInput = screen.getByLabelText(/应用英文名/);
    fireEvent.change(appEnglishNameInput, { target: { value: 'order-center' } });

    const descriptionInput = screen.getByLabelText(/应用描述/);
    fireEvent.change(descriptionInput, { target: { value: '订单中心核心交易库。' } });

    const purposeInput = screen.getByLabelText(/业务用途/);
    fireEvent.change(purposeInput, { target: { value: '申请高可用 MySQL 数据库用于订单交易。' } });

    const storageInput = screen.getByLabelText(/存储容量/);
    fireEvent.change(storageInput, { target: { value: '200' } });

    const architectureInput = screen.getByLabelText('上传架构图');
    fireEvent.change(architectureInput, {
      target: {
        files: [new File(['mock architecture'], 'mysql-architecture.png', { type: 'image/png' })],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: '下一步：生成需求建议' }));

    expect(await screen.findByText('AI 推荐方案确认', {}, { timeout: 4000 })).toBeTruthy();

    const summaryInput = screen.getByLabelText('方案摘要');
    fireEvent.change(summaryInput, { target: { value: 'MySQL 高可用交付方案' } });
    await waitFor(() => {
      expect((summaryInput as HTMLTextAreaElement).value).toBe('MySQL 高可用交付方案');
    });

    const estimatedTimeInput = screen.getByLabelText('预计交付时长');
    fireEvent.change(estimatedTimeInput, { target: { value: '2-3 工作日' } });
    await waitFor(() => {
      expect((estimatedTimeInput as HTMLInputElement).value).toBe('2-3 工作日');
    });

    const resourceNameInput = screen.getByLabelText('资源名称');
    fireEvent.change(resourceNameInput, { target: { value: '订单中心 MySQL 实例' } });
    await waitFor(() => {
      expect((resourceNameInput as HTMLInputElement).value).toBe('订单中心 MySQL 实例');
    });

    const resourcePurposeInput = screen.getByLabelText('用途说明');
    fireEvent.change(resourcePurposeInput, { target: { value: '承载订单交易主库' } });
    await waitFor(() => {
      expect((resourcePurposeInput as HTMLInputElement).value).toBe('承载订单交易主库');
    });

    fireEvent.click(screen.getByRole('button', { name: /平台默认配套能力/ }));

    const loggingSwitch = screen.getAllByRole('switch')[1];
    fireEvent.click(loggingSwitch);

    fireEvent.click(screen.getByRole('button', { name: '确认并提交申请' }));

    expect(await screen.findByText('申请提交成功')).toBeTruthy();

    await waitFor(() => {
      const [latestOrder] = getOrders();
      expect(latestOrder?.orchestratedPlan?.summary).toBe('MySQL 高可用交付方案');
      expect(latestOrder?.orchestratedPlan?.estimatedTime).toBe('2-3 工作日');
      expect(latestOrder?.orchestratedPlan?.resources[0]?.name).toBe('订单中心 MySQL 实例');
      expect(latestOrder?.orchestratedPlan?.resources[0]?.purpose).toBe('承载订单交易主库');
      expect(latestOrder?.orchestratedPlan?.integrations[1]?.enabled).toBe(false);
    });
  }, 10000);

  it('renders mysql trial grouped fields for database scenario', async () => {
    renderApplyService('db-mysql');

    expect(await screen.findByText('基础信息')).toBeTruthy();
    expect(screen.getByText('近生产表单')).toBeTruthy();
    expect(screen.getByText('需求与目标')).toBeTruthy();
    expect(screen.getByText('数据库配置')).toBeTruthy();
    expect(screen.getByText('SLA 与安全策略')).toBeTruthy();

    expect(screen.getByLabelText(/应用英文名/)).toBeTruthy();
    expect(screen.getByLabelText(/应用描述/)).toBeTruthy();
    expect(screen.getByLabelText(/业务用途/)).toBeTruthy();
    expect(screen.getByRole('combobox', { name: /申请环境|环境/ })).toBeTruthy();
    expect(screen.getByLabelText(/数据库名/)).toBeTruthy();
    expect(screen.getByLabelText(/字符集\/编码/)).toBeTruthy();
    expect(screen.getByText('架构图材料（必填）')).toBeTruthy();
    expect(screen.getByRole('button', { name: '查看架构图填写说明' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '下载模版' }).getAttribute('href')).toBe('/portal/templates/架构图模版.xlsx');
    expect(screen.getByLabelText('上传架构图')).toBeTruthy();
  });

  it('prefills mysql package defaults from environment profile while keeping fields editable', async () => {
    renderApplyService('db-mysql');

    expect(await screen.findByText('推荐套餐')).toBeTruthy();
    expect(screen.getByText('开发单机版')).toBeTruthy();
    expect(screen.getByText('已按默认套餐带出')).toBeTruthy();
    expect(screen.getByText('2 vCPU')).toBeTruthy();
    expect(screen.getByText('4 GB')).toBeTruthy();
    expect(screen.getByText('100 GB SSD')).toBeTruthy();
    expect(screen.getByLabelText(/数据库版本/)).toBeTruthy();
  });

  it('shows all bound environment package references for mysql after opening the reference dialog', async () => {
    const user = userEvent.setup();
    renderApplyService('db-mysql');

    expect(await screen.findByText('推荐套餐')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '查看套餐参考' }));

    expect(await screen.findByText('MySQL部署 套餐参考')).toBeTruthy();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('开发单机版')).toBeTruthy();
    expect(within(dialog).getByText('UAT主从版')).toBeTruthy();
    expect(within(dialog).getByText('生产高可用版')).toBeTruthy();
    expect(within(dialog).getByText('适用于功能开发、自测和短周期验证场景。')).toBeTruthy();
    expect(within(dialog).getByText('适用于生产核心业务，默认主从+只读副本。')).toBeTruthy();
  });

  it('blocks mysql trial from generating recommendation without architecture file', async () => {
    renderApplyService('db-mysql');

    const appNameInput = await screen.findByLabelText(/应用名称/);
    fireEvent.change(appNameInput, { target: { value: '订单中心' } });
    fireEvent.change(screen.getByLabelText(/应用英文名/), { target: { value: 'order-center' } });
    fireEvent.change(screen.getByLabelText(/应用描述/), { target: { value: '订单中心核心交易库。' } });
    fireEvent.change(screen.getByLabelText(/业务用途/), { target: { value: '申请高可用 MySQL 数据库用于订单交易。' } });
    fireEvent.change(screen.getByLabelText(/存储容量/), { target: { value: '200' } });

    fireEvent.click(screen.getByRole('button', { name: '下一步：生成需求建议' }));

    expect(await screen.findByText('请先上传架构图，当前环节已按必填处理。')).toBeTruthy();
    expect(screen.queryByText('AI 推荐方案确认')).toBeNull();
  });

  it('renders vm scenario fields aligned to pre-production structure', async () => {
    renderApplyService('cloud-vm-private');

    expect(await screen.findByLabelText(/系统编号/)).toBeTruthy();
    expect(screen.getByText('近生产表单')).toBeTruthy();
    expect(screen.getByLabelText(/系统名称/)).toBeTruthy();
    expect(screen.getByLabelText(/模块名称/)).toBeTruthy();
    expect(screen.getByLabelText(/担当/)).toBeTruthy();
    expect(screen.getByLabelText(/类型/)).toBeTruthy();
    expect(screen.getByLabelText(/^CPU/)).toBeTruthy();
    expect(screen.getByLabelText(/内存/)).toBeTruthy();
    expect(screen.getByLabelText(/容量/)).toBeTruthy();
    expect(screen.getByText('架构图材料（必填）')).toBeTruthy();
    expect(screen.getByRole('link', { name: '下载模版' }).getAttribute('href')).toBe('/portal/templates/架构图模版.xlsx');
  });

  it('prefills private vm package defaults from environment profile while keeping fields editable', async () => {
    renderApplyService('cloud-vm-private');

    expect(await screen.findByText('推荐套餐')).toBeTruthy();
    expect(screen.getByText('开发基础版')).toBeTruthy();
    expect(screen.getByText('已按默认套餐带出')).toBeTruthy();
    expect(screen.getByText('2 vCPU')).toBeTruthy();
    expect(screen.getByText('4 GB')).toBeTruthy();
    expect(screen.getByText('100 GB SSD')).toBeTruthy();
    expect(screen.getByText('私网交付')).toBeTruthy();
    expect(screen.getByLabelText(/^CPU/)).toBeTruthy();
    expect(screen.getByLabelText(/内存/)).toBeTruthy();
    expect(screen.getByLabelText(/容量/)).toBeTruthy();
  });

  it('applies template environment package bindings in portal and preserves manual overrides', async () => {
    bootstrapSchemaTemplatesFromSpecs();
    const user = userEvent.setup();
    const vmSpec = getSpec('cloud-vm-private');
    expect(vmSpec?.inputTemplateId).toBeTruthy();
    saveSchemaTemplateConfigProfileBinding(
      vmSpec!.inputTemplateId!,
      ['vm'],
      {
        profileGroupKey: 'vm',
        environmentFieldKey: 'environment',
        preserveOverrides: true,
        hintText: '默认会根据环境推荐配置，可按需调整',
        fields: [
          { key: 'nodes', enabled: true, allowOverride: true },
          { key: 'cpu', enabled: true, allowOverride: true },
          { key: 'memory', enabled: true, allowOverride: true },
          { key: 'disk', enabled: true, allowOverride: true },
          { key: 'securityLevel', enabled: true, allowOverride: true },
        ],
      },
    );

    renderApplyService('cloud-vm-private');

    expect(await screen.findByText('模板推荐')).toBeTruthy();
    expect(screen.getByText('开发基础版')).toBeTruthy();
    expect(screen.getByText(/推荐来源：云服务器/)).toBeTruthy();

    const cpuInput = screen.getByLabelText(/^CPU$/);
    const memoryInput = screen.getByLabelText(/内存/);
    const diskInput = screen.getByLabelText(/磁盘/);
    const nodeInput = screen.getByLabelText(/节点/);

    await waitFor(() => {
      expect((cpuInput as HTMLInputElement).value).toBe('2 vCPU');
      expect((memoryInput as HTMLInputElement).value).toBe('4 GB');
      expect((diskInput as HTMLInputElement).value).toBe('100 GB SSD');
      expect((nodeInput as HTMLInputElement).value).toBe('1');
    });

    fireEvent.change(cpuInput, { target: { value: '6 vCPU' } });

    const environmentSelect = screen.getByRole('combobox', { name: /环境/ });
    await user.click(environmentSelect);
    await user.click(await screen.findByRole('option', { name: 'PROD' }));

    await waitFor(() => {
      expect((cpuInput as HTMLInputElement).value).toBe('6 vCPU');
      expect((memoryInput as HTMLInputElement).value).toBe('16 GB');
      expect((diskInput as HTMLInputElement).value).toBe('500 GB SSD');
      expect((nodeInput as HTMLInputElement).value).toBe('2');
    });
  });

  it('prefills public vm package defaults from environment profile while keeping fields editable', async () => {
    renderApplyService('cloud-vm-public');

    expect(await screen.findByText('推荐套餐')).toBeTruthy();
    expect(screen.getByText('开发基础版')).toBeTruthy();
    expect(screen.getByText('已按默认套餐带出')).toBeTruthy();
    expect(screen.getByText('公网接入')).toBeTruthy();
    expect(screen.getByLabelText(/^CPU/)).toBeTruthy();
    expect(screen.getByLabelText(/内存/)).toBeTruthy();
    expect(screen.getByLabelText(/容量/)).toBeTruthy();
    expect(screen.getByLabelText(/安全等级/)).toBeTruthy();
  });

  it('prefills virtual vm package defaults from environment profile while keeping fields editable', async () => {
    renderApplyService('cloud-vm-virtual');

    expect(await screen.findByText('推荐套餐')).toBeTruthy();
    expect(screen.queryByText('近生产表单')).toBeNull();
    expect(screen.getByText('开发基础版')).toBeTruthy();
    expect(screen.getByText('已按默认套餐带出')).toBeTruthy();
    expect(screen.getByText('私网交付')).toBeTruthy();
    expect(screen.getByLabelText(/规格/)).toBeTruthy();
    expect(screen.getByText('架构图材料（必填）')).toBeTruthy();
  });

  it('renders internet lb scenario with grouped network fields and required architecture upload', async () => {
    renderApplyService('net-f5-domain');

    expect(await screen.findByText('基础信息')).toBeTruthy();
    expect(screen.getByText('需求与目标')).toBeTruthy();
    expect(screen.getByText('公网发布配置')).toBeTruthy();
    expect(screen.getByText('SLA 与安全策略')).toBeTruthy();

    expect(screen.getByLabelText(/应用名称/)).toBeTruthy();
    expect(screen.getByLabelText(/应用英文名/)).toBeTruthy();
    expect(screen.getByLabelText(/发布域名/)).toBeTruthy();
    expect(screen.getByLabelText(/后端服务地址/)).toBeTruthy();
    expect(screen.getByLabelText(/监听协议/)).toBeTruthy();
    expect(screen.getByLabelText(/监听端口/)).toBeTruthy();
    expect(screen.getByText('架构图材料（必填）')).toBeTruthy();
    expect(screen.getByRole('link', { name: '下载模版' }).getAttribute('href')).toBe('/portal/templates/架构图模版.xlsx');
    expect(screen.getByLabelText('上传架构图')).toBeTruthy();
  });

  it('renders object storage scenario fields aligned to pre-production structure', async () => {
    renderApplyService('obj-storage');

    expect(await screen.findByLabelText(/应用供应商名称/)).toBeTruthy();
    expect(screen.queryByText('近生产表单')).toBeNull();
    expect(screen.getByLabelText(/所属系统/)).toBeTruthy();
    expect(screen.getByLabelText(/应用担当/)).toBeTruthy();
    expect(screen.getByLabelText(/桶名称/)).toBeTruthy();
    expect(screen.getByLabelText(/容量大小\(GB\)/)).toBeTruthy();
    expect(screen.getByLabelText(/AK\/SK数量/)).toBeTruthy();
    expect(screen.getByLabelText(/使用时间/)).toBeTruthy();
    expect(screen.getByText('架构图材料（必填）')).toBeTruthy();
    expect(screen.getByRole('link', { name: '下载模版' }).getAttribute('href')).toBe('/portal/templates/架构图模版.xlsx');
  });

  it('shows object storage environment package recommendation before user adjustment', async () => {
    renderApplyService('obj-storage');

    expect(await screen.findByText('推荐套餐')).toBeTruthy();
    expect(screen.getByText('开发轻量版')).toBeTruthy();
    expect(screen.getByText('已按默认套餐带出')).toBeTruthy();
    expect(screen.getByText('100 GB')).toBeTruthy();
    expect(screen.getByText('1 个 AK/SK')).toBeTruthy();
    expect(screen.getAllByText('临时').length).toBeGreaterThan(0);
    expect(screen.getAllByText('私有').length).toBeGreaterThan(0);
  });

  it('renders cloud database scenario with grouped database fields and required architecture upload', async () => {
    renderApplyService('cloud-db-create');

    expect(await screen.findByText('基础信息')).toBeTruthy();
    expect(screen.getByText('近生产表单')).toBeTruthy();
    expect(screen.getByText('需求与目标')).toBeTruthy();
    expect(screen.getByText('数据库配置')).toBeTruthy();
    expect(screen.getByText('SLA 与安全策略')).toBeTruthy();

    expect(screen.getByLabelText(/应用名称/)).toBeTruthy();
    expect(screen.getByLabelText(/应用英文名/)).toBeTruthy();
    expect(screen.getByLabelText(/引擎类型/)).toBeTruthy();
    expect(screen.getByLabelText(/^版本/)).toBeTruthy();
    expect(screen.getByLabelText(/^CPU/)).toBeTruthy();
    expect(screen.getByLabelText(/内存/)).toBeTruthy();
    expect(screen.getByLabelText(/存储容量/)).toBeTruthy();
    expect(screen.getByLabelText(/高可用模式/)).toBeTruthy();
    expect(screen.getByText('架构图材料（必填）')).toBeTruthy();
    expect(screen.getByRole('link', { name: '下载模版' }).getAttribute('href')).toBe('/portal/templates/架构图模版.xlsx');
    expect(screen.getByLabelText('上传架构图')).toBeTruthy();
  });

  it('prefills cloud database package defaults from environment profile while keeping fields editable', async () => {
    renderApplyService('cloud-db-create');

    expect(await screen.findByText('推荐套餐')).toBeTruthy();
    expect(screen.getByText('开发单机版')).toBeTruthy();
    expect(screen.getByText('已按默认套餐带出')).toBeTruthy();
    expect(screen.getByText('2 vCPU')).toBeTruthy();
    expect(screen.getByText('4 GB')).toBeTruthy();
    expect(screen.getByText('100 GB SSD')).toBeTruthy();
    expect(screen.getByLabelText(/引擎类型/)).toBeTruthy();
  });

  it('renders container trial fields for dce4 aligned to container resource sheets', async () => {
    renderApplyService('paas-dce4');

    expect(await screen.findByText('基础信息')).toBeTruthy();
    expect(screen.getByText('近生产表单')).toBeTruthy();
    expect(screen.getByText('租户信息')).toBeTruthy();
    expect(screen.getByText('容器资源')).toBeTruthy();
    expect(screen.getByText('平台集成')).toBeTruthy();

    expect(screen.getByLabelText(/申请环境/)).toBeTruthy();
    expect(screen.getByLabelText(/资源分区/)).toBeTruthy();
    expect(screen.getByLabelText(/系统代码/)).toBeTruthy();
    expect(screen.getByLabelText(/供应商名称/)).toBeTruthy();
    expect(screen.getByLabelText(/应用英文名称/)).toBeTruthy();
    expect(screen.getByLabelText(/命名空间/)).toBeTruthy();
    expect(screen.getByLabelText(/实例个数/)).toBeTruthy();
    expect(screen.getByLabelText(/单实例 CPU/)).toBeTruthy();
    expect(screen.getByLabelText(/单实例内存/)).toBeTruthy();
    expect(screen.getByText('架构图材料（必填）')).toBeTruthy();
    expect(screen.getByRole('link', { name: '下载模版' }).getAttribute('href')).toBe('/portal/templates/架构图模版.xlsx');
  });

  it('prefills container package defaults from environment profile while keeping fields editable', async () => {
    renderApplyService('paas-resource');

    expect(await screen.findByText('推荐套餐')).toBeTruthy();
    expect(screen.getByText('开发轻量容器版')).toBeTruthy();
    expect(screen.getByText('已按默认套餐带出')).toBeTruthy();
    expect(screen.getByText('1 实例')).toBeTruthy();
    expect(screen.getByText('1C / 2G')).toBeTruthy();
    expect(screen.getByText('LAN 分区')).toBeTruthy();
    expect(screen.getByLabelText(/开通 EFK 日志权限/)).toBeTruthy();
  });

  it('renders intranet lb scenario with grouped network fields and required architecture upload', async () => {
    renderApplyService('net-f5-lb');

    expect(await screen.findByText('基础信息')).toBeTruthy();
    expect(screen.getByText('需求与目标')).toBeTruthy();
    expect(screen.getByText('负载配置')).toBeTruthy();
    expect(screen.getByText('SLA 与安全策略')).toBeTruthy();

    expect(screen.getByLabelText(/应用名称/)).toBeTruthy();
    expect(screen.getByLabelText(/应用英文名/)).toBeTruthy();
    expect(screen.getByLabelText(/后端服务地址/)).toBeTruthy();
    expect(screen.getByLabelText(/监听协议/)).toBeTruthy();
    expect(screen.getByLabelText(/监听端口/)).toBeTruthy();
    expect(screen.getByText('架构图材料（必填）')).toBeTruthy();
    expect(screen.getByRole('link', { name: '下载模版' }).getAttribute('href')).toBe('/portal/templates/架构图模版.xlsx');
    expect(screen.getByLabelText('上传架构图')).toBeTruthy();
  });
});
