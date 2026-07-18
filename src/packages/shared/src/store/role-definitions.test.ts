import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getRoleDefinition,
  getRoleDefinitions,
  resetRoleDefinitions,
  updateRoleDefinition,
} from './role-definitions';

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

describe('role definitions store', () => {
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
    resetRoleDefinitions();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('loads role seeds by default', () => {
    const roles = getRoleDefinitions();
    expect(roles.length).toBeGreaterThan(0);
    expect(roles.some(role => role.key === 'platform-admin')).toBe(true);
  });

  it('supports updating role metadata and members', () => {
    updateRoleDefinition('reviewer', {
      perms: ['审批节点', '驳回建议', '优先级确认'],
      members: [
        {
          id: 'user-reviewer-2',
          name: '何景明',
          account: 'he.jm',
          title: '架构评审负责人',
          department: '架构治理组',
          status: 'active',
        },
      ],
    });

    const reviewer = getRoleDefinition('reviewer');
    expect(reviewer?.perms).toContain('优先级确认');
    expect(reviewer?.members).toHaveLength(1);
    expect(reviewer?.members[0]?.account).toBe('he.jm');
  });
});
