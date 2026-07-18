import { ROLE_DEFINITION_SEED } from '../data/role-definitions';
import type { RoleDefinition, RoleMember } from '../types';

const STORAGE_KEY = 'ipe_role_definitions';
const CHANNEL_NAME = 'ipe_role_definitions_sync';
const CUSTOM_EVENT = 'ipe_role_definitions_updated';

let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel(CHANNEL_NAME);
} catch {
  // BroadcastChannel may be unavailable in some environments.
}

function cloneMembers(members: RoleMember[]) {
  return members.map(member => ({ ...member }));
}

function cloneRoles(roles: RoleDefinition[]) {
  return roles.map(role => ({
    ...role,
    perms: [...role.perms],
    members: cloneMembers(role.members),
  }));
}

function notifySync() {
  try {
    channel?.postMessage({ type: 'role-definitions-updated', timestamp: Date.now() });
  } catch {
    // Ignore broadcast failures and keep same-tab sync.
  }
  window.dispatchEvent(new CustomEvent(CUSTOM_EVENT));
}

export function onRoleDefinitionsSync(callback: () => void): () => void {
  const channelHandler = (event: MessageEvent) => {
    if (event.data?.type === 'role-definitions-updated') callback();
  };
  channel?.addEventListener('message', channelHandler);
  window.addEventListener(CUSTOM_EVENT, callback);
  return () => {
    channel?.removeEventListener('message', channelHandler);
    window.removeEventListener(CUSTOM_EVENT, callback);
  };
}

function loadRoles(): RoleDefinition[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const roles = JSON.parse(stored) as RoleDefinition[];
      if (Array.isArray(roles) && roles.length > 0) return cloneRoles(roles);
    }
  } catch {
    // Ignore parse errors and restore seed.
  }
  const seed = cloneRoles(ROLE_DEFINITION_SEED);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function saveRoles(roles: RoleDefinition[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cloneRoles(roles)));
  notifySync();
}

export function getRoleDefinitions() {
  return loadRoles().sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

export function getRoleDefinition(key: string) {
  return loadRoles().find(role => role.key === key);
}

export function updateRoleDefinition(key: string, patch: Partial<RoleDefinition>) {
  const roles = loadRoles();
  const next = roles.map(role =>
    role.key === key
      ? {
          ...role,
          ...patch,
          perms: patch.perms ? [...patch.perms] : [...role.perms],
          members: patch.members ? cloneMembers(patch.members) : cloneMembers(role.members),
          updatedAt: new Date().toISOString(),
        }
      : role,
  );
  saveRoles(next);
}

export function resetRoleDefinitions() {
  saveRoles(ROLE_DEFINITION_SEED);
}

export { ROLE_DEFINITION_SEED };
