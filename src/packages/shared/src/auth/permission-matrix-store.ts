import type { PermissionMatrix, PermissionMatrixSyncListener } from './permission-matrix-types';

const STORAGE_KEY = 'ipe_auth_permission_matrix';

const listeners = new Set<PermissionMatrixSyncListener>();

function safeGet(): PermissionMatrix | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PermissionMatrix;
  } catch {
    return null;
  }
}

function safeSet(matrix: PermissionMatrix): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matrix));
  } catch {
    // ignore
  }
}

function safeRemove(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getPermissionMatrix(): PermissionMatrix | null {
  return safeGet();
}

export function setPermissionMatrix(matrix: PermissionMatrix): void {
  safeSet(matrix);
  notifyPermissionMatrixSync();
}

export function clearPermissionMatrix(): void {
  safeRemove();
  notifyPermissionMatrixSync();
}

export function onPermissionMatrixSync(listener: PermissionMatrixSyncListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyPermissionMatrixSync(): void {
  listeners.forEach(listener => listener());
}
