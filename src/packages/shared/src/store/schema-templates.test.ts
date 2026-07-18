import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  bootstrapSchemaTemplatesFromSpecs,
  getResolvedSpecSchemaFields,
  getResolvedTemplateFields,
  getSchemaTemplate,
  getSchemaTemplateVersion,
} from './schema-templates';
import { getSpec, updateSpec } from './service-specs';
import { updateFieldDictionaryEntry } from './field-dictionary';

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

describe('schema template bootstrap', () => {
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
      },
      configurable: true,
      writable: true,
    });
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('binds cloud vm public input template to the latest de-duplicated version', () => {
    bootstrapSchemaTemplatesFromSpecs();

    const spec = getSpec('cloud-vm-public');
    expect(spec?.type).toBe('atomic');
    expect(spec?.inputTemplateId).toBe('schema-template:cloud-vm-public:input');
    expect(spec?.inputTemplateVersionId).toBeDefined();

    const template = getSchemaTemplate(spec!.inputTemplateId!);
    expect(template?.currentVersionId).toBe(spec!.inputTemplateVersionId);

    const version = getSchemaTemplateVersion(spec!.inputTemplateVersionId!);
    const fieldKeys = version?.bindings.map(binding => binding.fieldKey) ?? [];
    expect(fieldKeys).toContain('systemCode');
    expect(fieldKeys).toContain('publicAccess');
  });

  it('preserves manually shared template bindings during bootstrap', () => {
    bootstrapSchemaTemplatesFromSpecs();

    const privateSpec = getSpec('cloud-vm-private');
    const publicSpec = getSpec('cloud-vm-public');
    expect(privateSpec?.type).toBe('atomic');
    expect(publicSpec?.type).toBe('atomic');

    updateSpec('cloud-vm-public', {
      inputTemplateId: privateSpec!.inputTemplateId,
      inputTemplateVersionId: privateSpec!.inputTemplateVersionId,
    });

    bootstrapSchemaTemplatesFromSpecs();

    const reboundPublicSpec = getSpec('cloud-vm-public');
    expect(reboundPublicSpec?.inputTemplateId).toBe(privateSpec!.inputTemplateId);
    expect(reboundPublicSpec?.inputTemplateVersionId).toBe(privateSpec!.inputTemplateVersionId);
  });

  it('bumps mysql input template version when historical environment field options are incomplete', () => {
    bootstrapSchemaTemplatesFromSpecs();

    const spec = getSpec('db-mysql');
    expect(spec?.type).toBe('atomic');
    expect(spec?.inputTemplateId).toBeTruthy();
    expect(spec?.inputTemplateVersionId).toBeTruthy();

    const template = getSchemaTemplate(spec!.inputTemplateId!);
    const originalVersionId = spec!.inputTemplateVersionId!;
    const originalVersion = getSchemaTemplateVersion(originalVersionId);
    expect(originalVersion).toBeTruthy();

    const downgradedBindings = originalVersion!.bindings.map(binding => (
      binding.fieldKey === 'environment'
        ? {
            ...binding,
            fieldSnapshot: {
              ...binding.fieldSnapshot,
              type: 'select',
              options: undefined,
            },
          }
        : binding
    ));

    localStorage.setItem('ipe_schema_template_versions', JSON.stringify([
      {
        ...originalVersion!,
        bindings: downgradedBindings,
      },
    ]));
    localStorage.setItem('ipe_schema_templates', JSON.stringify([
      {
        ...template!,
        currentVersionId: originalVersionId,
      },
    ]));

    bootstrapSchemaTemplatesFromSpecs();

    const refreshedSpec = getSpec('db-mysql');
    expect(refreshedSpec?.inputTemplateVersionId).not.toBe(originalVersionId);

    const refreshedVersion = getSchemaTemplateVersion(refreshedSpec!.inputTemplateVersionId!);
    const environmentBinding = refreshedVersion?.bindings.find(binding => binding.fieldKey === 'environment');
    expect(environmentBinding?.fieldSnapshot.type).toBe('select');
    expect(environmentBinding?.fieldSnapshot.options).toEqual([
      { label: 'DEV', value: 'DEV' },
      { label: 'UAT', value: 'UAT' },
      { label: 'PROD', value: 'PROD' },
    ]);
  });

  it('upgrades legacy stacked default layout to balanced multi-column layout', () => {
    bootstrapSchemaTemplatesFromSpecs();

    const spec = getSpec('cloud-vm-private');
    expect(spec?.type).toBe('atomic');
    const template = getSchemaTemplate(spec!.inputTemplateId!);
    const originalVersionId = spec!.inputTemplateVersionId!;
    const originalVersion = getSchemaTemplateVersion(originalVersionId);
    expect(originalVersion).toBeTruthy();

    const stackedRows = originalVersion!.bindings.map((binding, index) => ({
      id: `row-${index + 1}`,
      columns: [{ fieldKey: binding.fieldKey, span: (binding.fieldSnapshot.type === 'textarea' ? 2 : 1) as 1 | 2 }],
    }));

    localStorage.setItem('ipe_schema_template_versions', JSON.stringify([
      {
        ...originalVersion!,
        layout: {
          sections: [
            {
              id: 'section-default',
              title: '默认分组',
              rows: stackedRows,
            },
          ],
        },
      },
    ]));
    localStorage.setItem('ipe_schema_templates', JSON.stringify([
      {
        ...template!,
        currentVersionId: originalVersionId,
      },
    ]));
    updateSpec('cloud-vm-private', {
      inputTemplateVersionId: originalVersionId,
    });

    bootstrapSchemaTemplatesFromSpecs();

    const refreshedSpec = getSpec('cloud-vm-private');
    expect(refreshedSpec?.inputTemplateVersionId).toBe('schema-template-version:cloud-vm-private:input:1.0.1');

    const refreshedVersion = getSchemaTemplateVersion(refreshedSpec!.inputTemplateVersionId!);
    expect(refreshedVersion?.changeSummary).toBe('默认布局已升级为多列表单');
    expect(refreshedVersion?.layout.sections[0]?.rows[0]?.columns.map(column => column.fieldKey)).toEqual([
      'systemCode',
      'systemName',
      'moduleName',
    ]);
  });

  it('normalizes environment field when resolved spec falls back to raw schema', () => {
    const fields = getResolvedSpecSchemaFields(
      {
        type: 'atomic',
        inputSchema: [
          { key: 'environment', label: '申请环境', type: 'text', required: true, defaultValue: 'production' },
        ],
        outputSchema: [],
      },
      'input',
    );

    expect(fields).toEqual([
      {
        key: 'environment',
        label: '申请环境',
        type: 'select',
        required: true,
        options: [
          { label: 'DEV', value: 'DEV' },
          { label: 'SIT', value: 'SIT' },
          { label: 'UAT', value: 'UAT' },
          { label: 'PERF', value: 'PERF' },
          { label: 'PROD', value: 'PROD' },
        ],
        defaultValue: 'PROD',
      },
    ]);
  });

  it('preserves snapshot select structure when dictionary entry becomes incomplete', () => {
    const templateId = 'schema-template:test-select:input';
    const versionId = 'schema-template-version:test-select:input:1.0.0';

    localStorage.setItem('ipe_schema_templates', JSON.stringify([
      {
        id: templateId,
        code: 'test-select-input',
        name: 'Test Select - 输入模板',
        kind: 'input',
        scope: 'atomic',
        serviceId: 'test-select',
        serviceName: 'Test Select',
        status: 'active',
        currentVersionId: versionId,
        createdAt: '2026-07-03T00:00:00.000Z',
        updatedAt: '2026-07-03T00:00:00.000Z',
      },
    ]));
    localStorage.setItem('ipe_schema_template_versions', JSON.stringify([
      {
        id: versionId,
        templateId,
        version: '1.0.0',
        status: 'active',
        bindings: [
          {
            id: 'binding:urgency:1',
            fieldKey: 'urgency',
            dictionaryEntryId: 'field-urgency',
            source: 'dictionary',
            order: 0,
            required: true,
            fieldSnapshot: {
              key: 'urgency',
              label: '紧急程度',
              type: 'select',
              required: true,
              options: [
                { label: '常规', value: 'normal' },
                { label: '紧急', value: 'urgent' },
              ],
            },
          },
        ],
        layout: {
          sections: [
            {
              id: 'section-default',
              title: '默认分组',
              rows: [{ id: 'row-1', columns: [{ fieldKey: 'urgency', span: 1 }] }],
            },
          ],
        },
        createdAt: '2026-07-03T00:00:00.000Z',
        updatedAt: '2026-07-03T00:00:00.000Z',
      },
    ]));

    updateFieldDictionaryEntry('field-urgency', {
      type: 'text',
      options: undefined,
    });

    expect(getResolvedTemplateFields(versionId)).toEqual([
      {
        key: 'urgency',
        label: '紧急程度',
        type: 'select',
        required: true,
        options: [
          { label: '常规', value: 'normal' },
          { label: '紧急', value: 'urgent' },
        ],
        defaultValue: 'medium',
      },
    ]);
  });
});
