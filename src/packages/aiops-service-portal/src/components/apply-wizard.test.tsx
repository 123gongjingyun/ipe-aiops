// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { Apply } from '../pages/apply';

function renderApply(comboId: string) {
  return render(
    <MemoryRouter initialEntries={[`/apply/${comboId}`]}>
      <Routes>
        <Route path="/apply/:comboId" element={<Apply />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ApplyWizard environment strategy', () => {
  afterEach(() => {
    cleanup();
  });

  it('locks test environment combo to UAT', async () => {
    renderApply('combo-test');

    expect((await screen.findAllByText('目标环境')).length).toBeGreaterThan(0);
    expect(screen.getByText('UAT')).toBeTruthy();
    expect(screen.getByText('场景锁定')).toBeTruthy();
    expect(screen.queryByDisplayValue('PROD')).toBeNull();
  });

  it('locks high availability production combo to PROD', async () => {
    renderApply('combo-ha');

    expect((await screen.findAllByText('目标环境')).length).toBeGreaterThan(0);
    expect(screen.getByText('PROD')).toBeTruthy();
    expect(screen.getByText('场景锁定')).toBeTruthy();
    expect(screen.queryByDisplayValue('UAT')).toBeNull();
  });

  it('resets locked environment when switching between combo routes', async () => {
    const view = render(
      <MemoryRouter initialEntries={['/apply/combo-test']}>
        <Routes>
          <Route path="/apply/:comboId" element={<Apply />} />
        </Routes>
      </MemoryRouter>,
    );

    expect((await screen.findAllByText('目标环境')).length).toBeGreaterThan(0);
    expect(screen.getByText('UAT')).toBeTruthy();

    view.unmount();

    renderApply('combo-ha');

    expect((await screen.findAllByText('目标环境')).length).toBeGreaterThan(0);
    expect(screen.getByText('PROD')).toBeTruthy();
    expect(screen.queryByText('UAT')).toBeNull();
  });

  it('renders shared architecture artifact field with template download', async () => {
    renderApply('combo-ha');

    expect(await screen.findByText('架构图材料（必填）')).toBeTruthy();
    expect(screen.getByRole('button', { name: '查看架构图填写说明' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '下载模版' }).getAttribute('href')).toBe('/portal/templates/架构图模版.xlsx');
    expect(screen.getByLabelText('上传架构图')).toBeTruthy();
  });

  it('blocks combo apply from generating recommendation without architecture file', async () => {
    renderApply('combo-ha');

    fireEvent.click(await screen.findByRole('button', { name: '生成并查看 AI 建议' }));

    expect(await screen.findByText('请先上传架构图，当前环节已按必填处理。')).toBeTruthy();
  });

  it('shows container package recommendation for test environment combo', async () => {
    renderApply('combo-test');

    expect(await screen.findByText('容器资源推荐')).toBeTruthy();
    expect(screen.getByText('验收联调容器版')).toBeTruthy();
    expect(screen.getByText(/后端容器/)).toBeTruthy();
    expect(screen.getByText('2C / 4G / 2 实例')).toBeTruthy();
    expect(screen.getByText('1C / 2G / 2 实例')).toBeTruthy();
  });

  it('does not show container package recommendation for data platform combo', async () => {
    renderApply('combo-data');

    expect(await screen.findAllByText('目标环境')).toBeTruthy();
    expect(screen.queryByText('容器资源推荐')).toBeNull();
  });

  it('carries container package recommendation into AI confirmation content', async () => {
    renderApply('combo-test');

    const architectureInput = await screen.findByLabelText('上传架构图');
    fireEvent.change(architectureInput, {
      target: {
        files: [new File(['mock architecture'], 'combo-architecture.png', { type: 'image/png' })],
      },
    });

    fireEvent.click(screen.getByRole('button', { name: '生成并查看 AI 建议' }));

    expect(await screen.findByText('系统建议概览', {}, { timeout: 4000 })).toBeTruthy();

    const firstEditButtons = screen.getAllByRole('button', { name: '编辑' });
    fireEvent.click(firstEditButtons[1]);
    const secondEditButtons = screen.getAllByRole('button', { name: '编辑' });
    fireEvent.click(secondEditButtons[1]);

    const textboxValues = screen.getAllByRole('textbox').map(element => (element as HTMLTextAreaElement | HTMLInputElement).value);
    expect(textboxValues.some(value => value.includes('容器推荐：验收联调容器版'))).toBe(true);
    expect(screen.getByText(/容器套餐=验收联调容器版/)).toBeTruthy();
  });
});
