import type { SchemaTemplateConfigProfileBinding, TemplateEnvironmentConfig } from '../types';

const STORAGE_KEY = 'ipe_schema_template_config_profile_bindings';
const CHANNEL_NAME = 'ipe_schema_template_config_profile_bindings_sync';
const CUSTOM_EVENT = 'ipe_schema_template_config_profile_bindings_updated';

let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel(CHANNEL_NAME);
} catch {
  // BroadcastChannel may be unavailable.
}

function notifySync() {
  try {
    channel?.postMessage({ type: 'schema-template-config-profile-bindings-updated', timestamp: Date.now() });
  } catch {
    // Ignore broadcast failures.
  }
  window.dispatchEvent(new CustomEvent(CUSTOM_EVENT));
}

export function onSchemaTemplateConfigProfileBindingsSync(callback: () => void): () => void {
  const channelHandler = (event: MessageEvent) => {
    if (event.data?.type === 'schema-template-config-profile-bindings-updated') callback();
  };
  channel?.addEventListener('message', channelHandler);
  window.addEventListener(CUSTOM_EVENT, callback);
  return () => {
    channel?.removeEventListener('message', channelHandler);
    window.removeEventListener(CUSTOM_EVENT, callback);
  };
}

function loadBindings(): SchemaTemplateConfigProfileBinding[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SchemaTemplateConfigProfileBinding[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore parse failures and reset to empty.
  }
  return [];
}

function saveBindings(bindings: SchemaTemplateConfigProfileBinding[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
  notifySync();
}

export function getSchemaTemplateConfigProfileBindings() {
  return loadBindings();
}

export function getSchemaTemplateConfigProfileBinding(templateId: string) {
  return loadBindings().find(item => item.templateId === templateId);
}

export function saveSchemaTemplateConfigProfileBinding(
  templateId: string,
  groupKeys: string[],
  environmentConfig?: TemplateEnvironmentConfig,
) {
  const current = loadBindings();
  const nextBinding: SchemaTemplateConfigProfileBinding = {
    templateId,
    groupKeys: [...groupKeys],
    environmentConfig: environmentConfig
      ? {
          ...environmentConfig,
          fields: environmentConfig.fields.map(field => ({ ...field })),
        }
      : undefined,
    updatedAt: new Date().toISOString(),
  };
  const existingIndex = current.findIndex(item => item.templateId === templateId);
  const next = existingIndex >= 0
    ? current.map(item => (item.templateId === templateId ? nextBinding : item))
    : [...current, nextBinding];
  saveBindings(next);
}
