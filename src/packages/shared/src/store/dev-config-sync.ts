import {
  onConfigProfileGroupsSync,
} from './config-profiles';
import {
  onSchemaTemplateConfigProfileBindingsSync,
} from './schema-template-config-profiles';
import {
  onSchemaTemplatesSync,
} from './schema-templates';
import {
  onSpecsSync,
} from './service-specs';

const DEV_CONFIG_SYNC_PATH = '/api/dev/config-sync';
const DEV_CONFIG_SYNC_INTERVAL_MS = 3000;

type DevConfigSyncMode = 'portal' | 'center';

type SyncedStorageItem = {
  storageKey: string;
  syncEventName: string;
  channelName?: string;
  channelMessageType?: string;
};

type DevConfigSyncPayload = {
  config?: Record<string, unknown> | null;
  updatedAt?: string | null;
};

const SYNCED_STORAGE_ITEMS: SyncedStorageItem[] = [
  {
    storageKey: 'ipe_service_specs',
    syncEventName: 'ipe_specs_updated',
    channelName: 'ipe_specs_sync',
    channelMessageType: 'specs-updated',
  },
  {
    storageKey: 'ipe_schema_templates',
    syncEventName: 'ipe_schema_templates_updated',
    channelName: 'ipe_schema_templates_sync',
    channelMessageType: 'schema-templates-updated',
  },
  {
    storageKey: 'ipe_schema_template_versions',
    syncEventName: 'ipe_schema_templates_updated',
    channelName: 'ipe_schema_templates_sync',
    channelMessageType: 'schema-templates-updated',
  },
  {
    storageKey: 'ipe_config_profile_groups',
    syncEventName: 'ipe_config_profile_groups_updated',
    channelName: 'ipe_config_profile_groups_sync',
    channelMessageType: 'config-profile-groups-updated',
  },
  {
    storageKey: 'ipe_schema_template_config_profile_bindings',
    syncEventName: 'ipe_schema_template_config_profile_bindings_updated',
    channelName: 'ipe_schema_template_config_profile_bindings_sync',
    channelMessageType: 'schema-template-config-profile-bindings-updated',
  },
];

let initializedMode: DevConfigSyncMode | null = null;
let remotePullTimer: number | null = null;
let remotePullInFlight: Promise<void> | null = null;
let remotePushInFlight: Promise<void> | null = null;
let pendingRemotePushPayload: string | null = null;
let suppressRemotePush = false;
let cleanupCallbacks: Array<() => void> = [];

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function getRemoteSyncUrl() {
  return DEV_CONFIG_SYNC_PATH;
}

function notifyLocalConfigSync(item: SyncedStorageItem) {
  window.dispatchEvent(new CustomEvent(item.syncEventName));

  if (!item.channelName) return;
  try {
    const channel = new BroadcastChannel(item.channelName);
    channel.postMessage({
      type: item.channelMessageType || item.syncEventName,
      timestamp: Date.now(),
    });
    channel.close();
  } catch {
    // Ignore BroadcastChannel failures in dev sync mode.
  }
}

function readStorageValue(storageKey: string) {
  if (!canUseBrowserStorage()) return null;
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readCurrentConfigSnapshot() {
  const config: Record<string, unknown> = {};
  SYNCED_STORAGE_ITEMS.forEach(item => {
    config[item.storageKey] = readStorageValue(item.storageKey);
  });
  return config;
}

function replaceLocalConfigSnapshot(nextConfig: Record<string, unknown>) {
  if (!canUseBrowserStorage()) return false;

  let changed = false;
  suppressRemotePush = true;

  try {
    SYNCED_STORAGE_ITEMS.forEach(item => {
      const nextValue = nextConfig[item.storageKey] ?? null;
      const nextSerialized = nextValue == null ? null : JSON.stringify(nextValue);
      const currentSerialized = localStorage.getItem(item.storageKey);

      if (currentSerialized === nextSerialized) return;

      if (nextSerialized == null) {
        localStorage.removeItem(item.storageKey);
      } else {
        localStorage.setItem(item.storageKey, nextSerialized);
      }

      notifyLocalConfigSync(item);
      changed = true;
    });
  } finally {
    suppressRemotePush = false;
  }

  return changed;
}

async function pushConfigToRemote() {
  if (typeof window === 'undefined') return;

  pendingRemotePushPayload = JSON.stringify({
    config: readCurrentConfigSnapshot(),
    updatedAt: new Date().toISOString(),
  });

  if (remotePushInFlight) return remotePushInFlight;

  remotePushInFlight = (async () => {
    while (pendingRemotePushPayload) {
      const payload = pendingRemotePushPayload;
      pendingRemotePushPayload = null;
      try {
        await fetch(getRemoteSyncUrl(), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
      } catch {
        pendingRemotePushPayload = payload;
        break;
      }
    }
  })().finally(() => {
    remotePushInFlight = null;
  });

  return remotePushInFlight;
}

export async function pullDevConfigFromRemote() {
  if (typeof window === 'undefined') return;
  if (remotePullInFlight) return remotePullInFlight;

  remotePullInFlight = (async () => {
    try {
      const response = await fetch(getRemoteSyncUrl(), { cache: 'no-store' });
      if (!response.ok) return;

      const payload = await response.json() as DevConfigSyncPayload;
      if (payload.config && typeof payload.config === 'object') {
        const changed = replaceLocalConfigSnapshot(payload.config);
        if (changed && initializedMode === 'center') {
          void pushConfigToRemote();
        }
        return;
      }

      if (initializedMode === 'center') {
        void pushConfigToRemote();
      }
    } catch {
      // Ignore dev sync failures and keep local fallback.
    }
  })().finally(() => {
    remotePullInFlight = null;
  });

  return remotePullInFlight;
}

function scheduleRemotePush() {
  if (suppressRemotePush) return;
  void pushConfigToRemote();
}

function registerPushListeners() {
  cleanupCallbacks = [
    onSpecsSync(scheduleRemotePush),
    onSchemaTemplatesSync(scheduleRemotePush),
    onConfigProfileGroupsSync(scheduleRemotePush),
    onSchemaTemplateConfigProfileBindingsSync(scheduleRemotePush),
  ];
}

export function initDevConfigRemoteSync(mode: DevConfigSyncMode) {
  if (!canUseBrowserStorage()) return () => undefined;
  if (initializedMode === mode) return () => undefined;

  cleanupCallbacks.forEach(callback => callback());
  cleanupCallbacks = [];

  if (remotePullTimer !== null) {
    window.clearInterval(remotePullTimer);
    remotePullTimer = null;
  }

  initializedMode = mode;
  registerPushListeners();

  if (mode === 'center') {
    void pushConfigToRemote();
  } else {
    void pullDevConfigFromRemote();
  }

  remotePullTimer = window.setInterval(() => {
    void pullDevConfigFromRemote();
  }, DEV_CONFIG_SYNC_INTERVAL_MS);

  return () => {
    if (initializedMode !== mode) return;
    cleanupCallbacks.forEach(callback => callback());
    cleanupCallbacks = [];
    initializedMode = null;
    if (remotePullTimer !== null) {
      window.clearInterval(remotePullTimer);
      remotePullTimer = null;
    }
  };
}
