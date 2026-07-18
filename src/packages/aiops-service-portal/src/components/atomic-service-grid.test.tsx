// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, render, screen } from '@testing-library/react';

import { AtomicServiceGrid } from './atomic-service-grid';

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

describe('AtomicServiceGrid', () => {
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

  it('marks near-production atomic services with a demo tag in the service directory', async () => {
    render(
      <MemoryRouter>
        <AtomicServiceGrid />
      </MemoryRouter>,
    );

    expect(await screen.findByText('云服务器开通（私有云）')).toBeTruthy();
    expect(screen.getAllByText('近生产表单').length).toBeGreaterThan(0);
  });
});
