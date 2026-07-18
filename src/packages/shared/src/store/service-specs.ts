import type { ServiceSpec, AtomicServiceSpec, ComboServiceSpec, ProductionFieldDefinition, ServiceStatus, SpecFilter } from '../types';
import { allAtomicSpecs } from '../data/specs';
import { allComboSpecs } from '../data/spec-combos';
import { APPROVAL_POLICIES, ASSET_FIELD_MAPPINGS, DELIVERY_STEP_SETS, SAMPLE_PRODUCTION_METAS } from '../data/specs/production-meta';

const STORAGE_KEY = 'ipe_service_specs';
const CHANNEL_NAME = 'ipe_specs_sync';
const CUSTOM_EVENT = 'ipe_specs_updated';

const DEFAULT_ENVIRONMENT_OPTIONS = [
  { label: 'DEV', value: 'DEV' },
  { label: 'SIT', value: 'SIT' },
  { label: 'UAT', value: 'UAT' },
  { label: 'PERF', value: 'PERF' },
  { label: 'PROD', value: 'PROD' },
] as const;

function normalizeEnvironmentOptionValue(value: string) {
  const normalized = String(value).trim().toUpperCase();
  if (normalized === 'TEST') return 'UAT';
  if (normalized === 'PRODUCTION') return 'PROD';
  return normalized;
}

function buildSupportedEnvironmentOptions(supportedEnvironments?: string[]) {
  const normalizedValues = (supportedEnvironments ?? [])
    .map(environment => normalizeEnvironmentOptionValue(environment))
    .filter(Boolean);

  if (normalizedValues.length === 0) return DEFAULT_ENVIRONMENT_OPTIONS.map(option => ({ ...option }));

  return normalizedValues.map(value => ({ label: value, value }));
}

function normalizeProductionField(
  field: ProductionFieldDefinition,
  supportedEnvironments?: string[],
) {
  if (field.key !== 'environment') return field;

  const existingOptions = (field.options ?? [])
    .map(option => {
      const value = normalizeEnvironmentOptionValue(option.value);
      return value ? { label: value, value } : null;
    })
    .filter((option): option is { label: string; value: string } => Boolean(option));

  return {
    ...field,
    type: 'select' as const,
    options: existingOptions.length > 0 ? existingOptions : buildSupportedEnvironmentOptions(supportedEnvironments),
  };
}

function resolveAtomicInputSchema(spec: AtomicServiceSpec, meta: typeof SAMPLE_PRODUCTION_METAS[number]) {
  const productionFields = (meta.inputFields ?? []).map(field => normalizeProductionField(field, meta.supportedEnvironments));
  const productionKeys = new Set(productionFields.map(field => field.key));
  const hiddenLegacyKeys = new Set<string>();

  if (productionKeys.has('configProfile')) {
    ['spec', 'os', 'count', 'purpose'].forEach(key => hiddenLegacyKeys.add(key));
  }

  if (productionKeys.has('bucketName') || productionKeys.has('sfsName')) {
    ['description', 'urgency', 'deadline'].forEach(key => hiddenLegacyKeys.add(key));
  }

  const remainingLegacyFields = spec.inputSchema.filter(
    field => !productionKeys.has(field.key) && !hiddenLegacyKeys.has(field.key),
  );

  return [
    ...productionFields.map(field => ({
      key: field.key,
      label: field.label,
      type: field.type,
      required: field.required ?? false,
      options: field.options,
      placeholder: field.placeholder,
    })),
    ...remainingLegacyFields,
  ];
}

function enhanceAtomicSpecs(specs: ServiceSpec[]): ServiceSpec[] {
  return specs.map(spec => {
    if (spec.type !== 'atomic') return spec;
    const meta = SAMPLE_PRODUCTION_METAS.find(item => item.serviceName === spec.name);
    if (!meta) return spec;
    const atomicSpec = spec as AtomicServiceSpec;
    return {
      ...atomicSpec,
      serviceCode: meta.serviceCode,
      supportedEnvironments: meta.supportedEnvironments,
      prerequisites: meta.prerequisites,
      approvalPolicyId: meta.approvalPolicyId,
      deliveryStepSetId: meta.deliveryStepSetId,
      assetCategory: meta.assetCategory,
      deliveryOutputs: meta.deliveryOutputs,
      productionInputFields: (meta.inputFields ?? []).map(field => normalizeProductionField(field, meta.supportedEnvironments)),
      serviceSummary: meta.serviceSummary,
      inputSchema: resolveAtomicInputSchema(atomicSpec, meta),
    } satisfies AtomicServiceSpec;
  });
}

// BroadcastChannel for cross-tab sync
let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel(CHANNEL_NAME);
} catch {
  // BroadcastChannel not available (e.g., SSR)
}

function notifySync() {
  try {
    channel?.postMessage({ type: 'specs-updated', timestamp: Date.now() });
  } catch {}
  // Same-tab notification
  window.dispatchEvent(new CustomEvent(CUSTOM_EVENT));
}

export function onSpecsSync(callback: () => void): () => void {
  // Cross-tab
  const channelHandler = (event: MessageEvent) => {
    if (event.data?.type === 'specs-updated') callback();
  };
  channel?.addEventListener('message', channelHandler);
  // Same-tab
  window.addEventListener(CUSTOM_EVENT, callback);
  return () => {
    channel?.removeEventListener('message', channelHandler);
    window.removeEventListener(CUSTOM_EVENT, callback);
  };
}

// ===== CRUD =====

function loadSpecs(): ServiceSpec[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const specs: ServiceSpec[] = enhanceAtomicSpecs(JSON.parse(stored) as ServiceSpec[]);
      // Backfill missing status field
      if (specs.length > 0 && !('status' in specs[0])) {
        const seed: ServiceSpec[] = enhanceAtomicSpecs([...allAtomicSpecs, ...allComboSpecs]);
        saveSpecs(seed);
        return seed;
      }
      return specs;
    }
  } catch {}
  const seed: ServiceSpec[] = enhanceAtomicSpecs([...allAtomicSpecs, ...allComboSpecs]);
  saveSpecs(seed);
  return seed;
}

function saveSpecs(specs: ServiceSpec[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(specs));
  notifySync();
}

export function getSpecs(filter?: SpecFilter): ServiceSpec[] {
  const specs = loadSpecs();
  if (!filter) return specs;
  return specs.filter(s => {
    if (filter.type && s.type !== filter.type) return false;
    if (filter.domain && s.type === 'atomic') {
      if ((s as AtomicServiceSpec).domain !== filter.domain) return false;
    }
    if (filter.category && s.type === 'atomic') {
      if ((s as AtomicServiceSpec).category !== filter.category) return false;
    }
    if (filter.status && s.status !== filter.status) return false;
    return true;
  });
}

export function getSpec(id: string): ServiceSpec | undefined {
  return loadSpecs().find(s => s.id === id);
}

export function getAtomicSpecs(domain?: string, status?: ServiceStatus): AtomicServiceSpec[] {
  return getSpecs({ type: 'atomic', domain, status }) as AtomicServiceSpec[];
}

export function getComboSpecs(status?: ServiceStatus): ComboServiceSpec[] {
  return getSpecs({ type: 'combo', status }) as ComboServiceSpec[];
}

export function addSpec(spec: ServiceSpec): void {
  const specs = loadSpecs();
  specs.push(spec);
  saveSpecs(specs);
}

export function updateSpec(id: string, patch: Partial<ServiceSpec>): void {
  const specs = loadSpecs();
  const idx = specs.findIndex(s => s.id === id);
  if (idx !== -1) {
    specs[idx] = { ...specs[idx], ...patch } as ServiceSpec;
    saveSpecs(specs);
  }
}

export function deleteSpec(id: string): void {
  const specs = loadSpecs().filter(s => s.id !== id);
  saveSpecs(specs);
}

export function updateSpecStatus(id: string, status: ServiceStatus): void {
  updateSpec(id, { status } as Partial<ServiceSpec>);
}

export function getApprovalPolicies() {
  return APPROVAL_POLICIES;
}

export function getApprovalPolicy(id: string) {
  return APPROVAL_POLICIES.find(policy => policy.id === id);
}

export function getDeliveryStepSets() {
  return DELIVERY_STEP_SETS;
}

export function getDeliveryStepSet(id: string) {
  return DELIVERY_STEP_SETS.find(item => item.id === id);
}

export function getAssetFieldMappings() {
  return ASSET_FIELD_MAPPINGS;
}

export function getAssetFieldMapping(serviceCode: string) {
  return ASSET_FIELD_MAPPINGS.find(item => item.serviceCode === serviceCode);
}
