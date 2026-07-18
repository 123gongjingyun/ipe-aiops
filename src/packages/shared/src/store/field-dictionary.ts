import { FIELD_DICTIONARY_SEED } from '../data/field-dictionary';
import type { FieldDictionaryEntry } from '../types';

const STORAGE_KEY = 'ipe_field_dictionary';
const CHANNEL_NAME = 'ipe_field_dictionary_sync';
const CUSTOM_EVENT = 'ipe_field_dictionary_updated';

let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel(CHANNEL_NAME);
} catch {
  // BroadcastChannel may be unavailable in some environments.
}

function notifySync() {
  try {
    channel?.postMessage({ type: 'field-dictionary-updated', timestamp: Date.now() });
  } catch {
    // Ignore broadcast failures and keep same-tab sync.
  }
  window.dispatchEvent(new CustomEvent(CUSTOM_EVENT));
}

export function onFieldDictionarySync(callback: () => void): () => void {
  const channelHandler = (event: MessageEvent) => {
    if (event.data?.type === 'field-dictionary-updated') callback();
  };
  channel?.addEventListener('message', channelHandler);
  window.addEventListener(CUSTOM_EVENT, callback);
  return () => {
    channel?.removeEventListener('message', channelHandler);
    window.removeEventListener(CUSTOM_EVENT, callback);
  };
}

function loadEntries(): FieldDictionaryEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const entries = JSON.parse(stored) as FieldDictionaryEntry[];
      if (Array.isArray(entries) && entries.length > 0) return entries;
    }
  } catch {
    // Ignore parse errors and restore seed.
  }
  saveEntries(FIELD_DICTIONARY_SEED);
  return FIELD_DICTIONARY_SEED;
}

function saveEntries(entries: FieldDictionaryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  notifySync();
}

export function getFieldDictionaryEntries() {
  return loadEntries().sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
}

export function getFieldDictionaryEntry(id: string) {
  return loadEntries().find(entry => entry.id === id);
}

export function addFieldDictionaryEntry(entry: FieldDictionaryEntry) {
  const entries = loadEntries();
  entries.push(entry);
  saveEntries(entries);
}

export function updateFieldDictionaryEntry(id: string, patch: Partial<FieldDictionaryEntry>) {
  const entries = loadEntries();
  const next = entries.map(entry =>
    entry.id === id
      ? {
          ...entry,
          ...patch,
          updatedAt: new Date().toISOString(),
        }
      : entry,
  );
  saveEntries(next);
}

export function deleteFieldDictionaryEntry(id: string) {
  saveEntries(loadEntries().filter(entry => entry.id !== id));
}

export function resetFieldDictionaryEntries() {
  saveEntries(FIELD_DICTIONARY_SEED);
}
