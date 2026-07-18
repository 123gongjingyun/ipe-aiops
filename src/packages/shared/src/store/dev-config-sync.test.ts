// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  close() {}
}

describe('dev config sync', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();

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
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn(),
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function flushAsyncWork() {
    await Promise.resolve();
    await Promise.resolve();
  }

  it('pulls center config into portal local storage on init', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        config: {
          ipe_service_specs: [{ id: 'cloud-vm-private', version: '1.0.2' }],
          ipe_schema_templates: [{ id: 'schema-template:cloud-vm-private:input', currentVersionId: 'schema-template-version:cloud-vm-private:input:1.0.2' }],
          ipe_schema_template_versions: [{
            id: 'schema-template-version:cloud-vm-private:input:1.0.2',
            templateId: 'schema-template:cloud-vm-private:input',
            version: '1.0.2',
            bindings: [],
            layout: {
              sections: [{
                id: 'section-default',
                title: '默认分组',
                rows: [{
                  id: 'row-1',
                  columns: [
                    { fieldKey: 'systemCode', span: 1 },
                    { fieldKey: 'systemName', span: 1 },
                    { fieldKey: 'moduleName', span: 1 },
                  ],
                }],
              }],
            },
          }],
          ipe_config_profile_groups: [{ key: 'vm', title: '云服务器', specIds: ['cloud-vm-private'], profiles: [] }],
          ipe_schema_template_config_profile_bindings: [],
        },
        updatedAt: '2026-07-03T10:00:00.000Z',
      }),
    } as Response);

    const { initDevConfigRemoteSync } = await import('./dev-config-sync');
    const cleanup = initDevConfigRemoteSync('portal');

    await flushAsyncWork();

    expect(fetch).toHaveBeenCalledWith('/api/dev/config-sync', { cache: 'no-store' });
    expect(JSON.parse(localStorage.getItem('ipe_service_specs') || 'null')).toEqual([
      { id: 'cloud-vm-private', version: '1.0.2' },
    ]);
    expect(JSON.parse(localStorage.getItem('ipe_schema_template_versions') || 'null')).toHaveLength(1);

    cleanup();
  });

  it('pushes updated center config to remote endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ config: null }),
    } as Response);

    localStorage.setItem('ipe_service_specs', JSON.stringify([{ id: 'cloud-vm-private', version: '1.0.2' }]));
    localStorage.setItem('ipe_schema_templates', JSON.stringify([{ id: 'tpl-1', currentVersionId: 'ver-1' }]));
    localStorage.setItem('ipe_schema_template_versions', JSON.stringify([{ id: 'ver-1', templateId: 'tpl-1', version: '1.0.2', bindings: [], layout: { sections: [] } }]));
    localStorage.setItem('ipe_config_profile_groups', JSON.stringify([{ key: 'vm', title: '云服务器', specIds: ['cloud-vm-private'], profiles: [] }]));
    localStorage.setItem('ipe_schema_template_config_profile_bindings', JSON.stringify([{ templateId: 'tpl-1', groupKeys: ['vm'], updatedAt: '2026-07-03T10:00:00.000Z' }]));

    const { initDevConfigRemoteSync } = await import('./dev-config-sync');
    const cleanup = initDevConfigRemoteSync('center');

    await flushAsyncWork();

    expect(fetch).toHaveBeenCalledWith('/api/dev/config-sync', expect.objectContaining({
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    }));

    const putCall = vi.mocked(fetch).mock.calls.find(([, options]) => options && typeof options === 'object' && 'method' in options && options.method === 'PUT');
    expect(putCall).toBeTruthy();
    const payload = JSON.parse(String(putCall?.[1]?.body || '{}'));
    expect(payload.config.ipe_service_specs).toEqual([{ id: 'cloud-vm-private', version: '1.0.2' }]);
    expect(payload.config.ipe_schema_templates).toEqual([{ id: 'tpl-1', currentVersionId: 'ver-1' }]);

    cleanup();
  });
});
