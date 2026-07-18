// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TemplateFormLayout } from './template-form-layout';

describe('TemplateFormLayout', () => {
  it('renders three-column rows when layout provides three visible columns', () => {
    render(
      <TemplateFormLayout
        fields={[
          { key: 'systemCode', label: '系统编号', type: 'text', required: true },
          { key: 'systemName', label: '系统名称', type: 'text', required: true },
          { key: 'moduleName', label: '模块名称', type: 'text', required: true },
        ]}
        layout={{
          sections: [
            {
              id: 'section-application',
              title: '申请信息',
              rows: [
                {
                  id: 'row-1',
                  columns: [
                    { fieldKey: 'systemCode', span: 1 },
                    { fieldKey: 'systemName', span: 1 },
                    { fieldKey: 'moduleName', span: 1 },
                  ],
                },
              ],
            },
          ],
        }}
        textValues={{}}
        setTextValues={vi.fn()}
      />,
    );

    const systemCodeInput = screen.getByLabelText(/系统编号/);
    const row = systemCodeInput.closest('.grid');
    expect(row?.className).toContain('xl:grid-cols-3');
  });
});
