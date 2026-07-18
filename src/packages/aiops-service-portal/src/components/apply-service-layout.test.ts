import { describe, expect, it } from 'vitest';

import type { FieldSchema } from '@aiops/shared';
import { buildApplicantLayout, isStackedSingleColumnLayout } from './apply-service-layout';

describe('apply service layout helpers', () => {
  it('builds triple-column rows for vm applicant scenario', () => {
    const fields: FieldSchema[] = [
      { key: 'systemCode', label: '系统编号', type: 'text', required: true },
      { key: 'systemName', label: '系统名称', type: 'text', required: true },
      { key: 'moduleName', label: '模块名称', type: 'text', required: true },
      { key: 'assignee', label: '担当', type: 'text', required: true },
      { key: 'environment', label: '环境', type: 'select', required: true, options: [{ label: 'DEV', value: 'DEV' }] },
      { key: 'vmType', label: '类型', type: 'text', required: true },
      { key: 'cpu', label: 'CPU', type: 'integer', required: true },
      { key: 'memory', label: '内存', type: 'integer', required: true },
      { key: 'dataDiskSize', label: '容量', type: 'integer', required: true },
    ];

    const layout = buildApplicantLayout(fields);
    const applicationRows = layout.sections.find(section => section.id === 'section-application')?.rows || [];

    expect(applicationRows).toHaveLength(2);
    expect(applicationRows[0]?.columns.map(column => column.fieldKey)).toEqual(['systemCode', 'systemName', 'moduleName']);
    expect(applicationRows[1]?.columns.map(column => column.fieldKey)).toEqual(['assignee', 'environment', 'vmType']);
  });

  it('detects stacked single-column layout', () => {
    expect(isStackedSingleColumnLayout({
      sections: [
        {
          id: 'section-default',
          title: '默认分组',
          rows: [
            { id: 'row-1', columns: [{ fieldKey: 'systemCode', span: 1 }] },
            { id: 'row-2', columns: [{ fieldKey: 'systemName', span: 1 }] },
          ],
        },
      ],
    })).toBe(true);

    expect(isStackedSingleColumnLayout({
      sections: [
        {
          id: 'section-default',
          title: '默认分组',
          rows: [
            {
              id: 'row-1',
              columns: [
                { fieldKey: 'systemCode', span: 1 },
                { fieldKey: 'systemName', span: 1 },
              ],
            },
          ],
        },
      ],
    })).toBe(false);
  });
});
