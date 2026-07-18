import { kafkaConfigProfiles, mqConfigProfiles, mysqlConfigProfiles, redisConfigProfiles, vmConfigProfiles } from '../data/config-profiles';
import { getSpec, updateSpec } from './service-specs';
import type { AtomicServiceSpec, ConfigProfileGroup, ServiceConfigProfile } from '../types';

const STORAGE_KEY = 'ipe_config_profile_groups';
const CHANNEL_NAME = 'ipe_config_profile_groups_sync';
const CUSTOM_EVENT = 'ipe_config_profile_groups_updated';

const CONFIG_PROFILE_GROUP_SEED: ConfigProfileGroup[] = [
  { key: 'vm', title: '云服务器', specIds: ['cloud-vm-private', 'cloud-vm-virtual', 'cloud-vm-public'], profiles: vmConfigProfiles },
  { key: 'mysql', title: '数据库', specIds: ['cloud-db-create', 'db-mysql'], profiles: mysqlConfigProfiles },
  { key: 'redis', title: 'Redis', specIds: ['mw-redis'], profiles: redisConfigProfiles },
  { key: 'mq', title: 'MQ', specIds: ['mw-mq'], profiles: mqConfigProfiles },
  { key: 'kafka', title: 'Kafka', specIds: ['mw-kafka'], profiles: kafkaConfigProfiles },
];

let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel(CHANNEL_NAME);
} catch {
  // BroadcastChannel may be unavailable in some environments.
}

function cloneProfiles(profiles: ServiceConfigProfile[]) {
  return profiles.map(profile => ({
    ...profile,
    details: profile.details ? { ...profile.details } : {},
  }));
}

function cloneGroups(groups: ConfigProfileGroup[]) {
  return groups.map(group => ({
    ...group,
    specIds: [...group.specIds],
    profiles: cloneProfiles(group.profiles),
  }));
}

function notifySync() {
  try {
    channel?.postMessage({ type: 'config-profile-groups-updated', timestamp: Date.now() });
  } catch {
    // Ignore broadcast failures and keep same-tab sync.
  }
  window.dispatchEvent(new CustomEvent(CUSTOM_EVENT));
}

export function onConfigProfileGroupsSync(callback: () => void): () => void {
  const channelHandler = (event: MessageEvent) => {
    if (event.data?.type === 'config-profile-groups-updated') callback();
  };
  channel?.addEventListener('message', channelHandler);
  window.addEventListener(CUSTOM_EVENT, callback);
  return () => {
    channel?.removeEventListener('message', channelHandler);
    window.removeEventListener(CUSTOM_EVENT, callback);
  };
}

function syncGroupsToManagedSpecs(groups: ConfigProfileGroup[]) {
  groups.forEach(group => {
    group.specIds.forEach(specId => {
      const spec = getSpec(specId);
      if (!spec || spec.type !== 'atomic') return;
      updateSpec(specId, { configProfiles: cloneProfiles(group.profiles) } as Partial<AtomicServiceSpec>);
    });
  });
}

function loadGroups(): ConfigProfileGroup[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const groups = JSON.parse(stored) as ConfigProfileGroup[];
      if (Array.isArray(groups) && groups.length > 0) return cloneGroups(groups);
    }
  } catch {
    // Ignore parse errors and restore seed.
  }
  const seed = cloneGroups(CONFIG_PROFILE_GROUP_SEED);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  syncGroupsToManagedSpecs(seed);
  return seed;
}

function saveGroups(groups: ConfigProfileGroup[]) {
  const cloned = cloneGroups(groups);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cloned));
  syncGroupsToManagedSpecs(cloned);
  notifySync();
}

export function getConfigProfileGroups() {
  return loadGroups();
}

export function getConfigProfileGroup(key: string) {
  return loadGroups().find(group => group.key === key);
}

export function getConfigProfileGroupBySpecId(specId: string) {
  return loadGroups().find(group => group.specIds.includes(specId));
}

export function getManagedConfigProfilesForSpec(specId: string, fallback: ServiceConfigProfile[] = []) {
  const group = getConfigProfileGroupBySpecId(specId);
  return group ? cloneProfiles(group.profiles) : cloneProfiles(fallback);
}

export function updateConfigProfileGroup(key: string, patch: Partial<ConfigProfileGroup>) {
  const groups = loadGroups();
  const next = groups.map(group =>
    group.key === key
      ? {
          ...group,
          ...patch,
          specIds: patch.specIds ? [...patch.specIds] : [...group.specIds],
          profiles: patch.profiles ? cloneProfiles(patch.profiles) : cloneProfiles(group.profiles),
        }
      : group,
  );
  saveGroups(next);
}

export function addConfigProfileGroup(group: ConfigProfileGroup) {
  const groups = loadGroups();
  if (groups.some(item => item.key === group.key)) return false;
  saveGroups([...groups, {
    ...group,
    specIds: [...group.specIds],
    profiles: cloneProfiles(group.profiles),
  }]);
  return true;
}

export function deleteConfigProfileGroup(key: string) {
  const groups = loadGroups();
  const next = groups.filter(group => group.key !== key);
  if (next.length === groups.length) return false;
  saveGroups(next);
  return true;
}

export function saveConfigProfilesForSpec(specId: string, profiles: ServiceConfigProfile[]) {
  const managedGroup = getConfigProfileGroupBySpecId(specId);
  if (managedGroup) {
    updateConfigProfileGroup(managedGroup.key, { profiles });
    return;
  }
  const spec = getSpec(specId);
  if (!spec || spec.type !== 'atomic') return;
  updateSpec(specId, { configProfiles: cloneProfiles(profiles) } as Partial<AtomicServiceSpec>);
}

export function resetConfigProfileGroups() {
  saveGroups(CONFIG_PROFILE_GROUP_SEED);
}

export { CONFIG_PROFILE_GROUP_SEED };
