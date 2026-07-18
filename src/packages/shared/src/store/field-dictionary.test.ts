import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  addFieldDictionaryEntry,
  deleteFieldDictionaryEntry,
  getFieldDictionaryEntries,
  resetFieldDictionaryEntries,
  updateFieldDictionaryEntry,
} from './field-dictionary';
import type { FieldDictionaryEntry } from '../types';

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

describe('field dictionary store', () => {
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
    resetFieldDictionaryEntries();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('loads seed entries by default', () => {
    const entries = getFieldDictionaryEntries();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.some(entry => entry.key === 'description')).toBe(true);
  });

  it('supports add, update, and delete', () => {
    const entry: FieldDictionaryEntry = {
      id: 'field-app-code',
      key: 'appCode',
      label: '应用编号',
      type: 'text',
      required: true,
      category: '基础信息',
      description: '应用唯一标识',
      sourceScope: 'input',
      status: 'active',
      createdAt: '2026-06-12T09:30:00.000Z',
      updatedAt: '2026-06-12T09:30:00.000Z',
    };

    addFieldDictionaryEntry(entry);
    expect(getFieldDictionaryEntries().some(item => item.id === entry.id)).toBe(true);

    updateFieldDictionaryEntry(entry.id, { label: '应用编码', required: false });
    const updated = getFieldDictionaryEntries().find(item => item.id === entry.id);
    expect(updated?.label).toBe('应用编码');
    expect(updated?.required).toBe(false);

    deleteFieldDictionaryEntry(entry.id);
    expect(getFieldDictionaryEntries().some(item => item.id === entry.id)).toBe(false);
  });
});
