// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Orders } from './orders';
import { createOrder } from '@aiops/shared';

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

function renderOrders() {
  return render(
    <MemoryRouter initialEntries={['/orders']}>
      <Routes>
        <Route path="/orders" element={<Orders />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('portal orders page', () => {
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
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('uses 待处理 as the pending filter label', async () => {
    renderOrders();
    expect((await screen.findAllByRole('button', { name: /待处理/ })).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: '待补充' })).toBeNull();
    expect((screen.getAllByRole('button', { name: /已归档/ })).length).toBeGreaterThan(0);
  });

  it('renders newly created pending orders in the lightweight management view', async () => {
    createOrder({
      comboId: 'cloud-vm-public',
      comboName: '云服务器开通（公有云）',
      services: ['云服务器开通（公有云）'],
      aiConfig: 'test',
      answers: { applicationName: '测试系统', environment: 'PROD' },
      extras: {},
    });

    renderOrders();

    expect((await screen.findAllByText('云服务器开通（公有云）')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('待处理').length).toBeGreaterThan(0);
    expect(screen.getAllByText('需求受理').length).toBeGreaterThan(0);
    expect(screen.getByText('序号')).toBeTruthy();
    expect(screen.getAllByText('阶段进展').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1 个服务').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '下一页' })).toBeTruthy();
  });

  it('filters by keyword across order fields', async () => {
    createOrder({
      comboId: 'obj-storage',
      comboName: '对象存储开通',
      services: ['对象存储开通'],
      aiConfig: 'test',
      answers: { applicationName: '财务归档', bucketName: 'finance-archive' },
      extras: {},
    });

    renderOrders();

    const searchInput = await screen.findByPlaceholderText('搜索工单号 / 申请名称 / 服务 / 表单内容');
    fireEvent.change(searchInput, { target: { value: 'finance-archive' } });

    expect(screen.getByDisplayValue('finance-archive')).toBeTruthy();
    expect(screen.getAllByText('对象存储开通').length).toBeGreaterThan(0);
  });

  it('keeps overview counts available when switching status cards', async () => {
    renderOrders();

    const reviewButtons = await screen.findAllByRole('button', { name: /架构评审中/ });
    fireEvent.click(reviewButtons[0]);
    expect(screen.getAllByRole('button', { name: /已归档/ }).length).toBeGreaterThan(0);
    expect(screen.getByText(/当前状态：/)).toBeTruthy();
    expect(screen.getByText(/共 1 条/)).toBeTruthy();
  });
});
