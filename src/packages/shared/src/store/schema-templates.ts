import { getFieldDictionaryEntries } from './field-dictionary';
import { getSpecs, updateSpec } from './service-specs';
import type {
  AtomicServiceSpec,
  ComboServiceSpec,
  FieldDictionaryEntry,
  FieldSchema,
  FormLayoutConfig,
  SchemaTemplate,
  SchemaTemplateFieldBinding,
  SchemaTemplateVersion,
  ServiceSpec,
} from '../types';

const TEMPLATES_STORAGE_KEY = 'ipe_schema_templates';
const TEMPLATE_VERSIONS_STORAGE_KEY = 'ipe_schema_template_versions';
const CHANNEL_NAME = 'ipe_schema_templates_sync';
const CUSTOM_EVENT = 'ipe_schema_templates_updated';

const DEFAULT_ENVIRONMENT_OPTIONS = [
  { label: 'DEV', value: 'DEV' },
  { label: 'SIT', value: 'SIT' },
  { label: 'UAT', value: 'UAT' },
  { label: 'PERF', value: 'PERF' },
  { label: 'PROD', value: 'PROD' },
] as const;

let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel(CHANNEL_NAME);
} catch {
  // BroadcastChannel may be unavailable.
}

function notifySync() {
  try {
    channel?.postMessage({ type: 'schema-templates-updated', timestamp: Date.now() });
  } catch {
    // Ignore broadcast failures.
  }
  window.dispatchEvent(new CustomEvent(CUSTOM_EVENT));
}

export function onSchemaTemplatesSync(callback: () => void): () => void {
  const channelHandler = (event: MessageEvent) => {
    if (event.data?.type === 'schema-templates-updated') callback();
  };
  channel?.addEventListener('message', channelHandler);
  window.addEventListener(CUSTOM_EVENT, callback);
  return () => {
    channel?.removeEventListener('message', channelHandler);
    window.removeEventListener(CUSTOM_EVENT, callback);
  };
}

function makeTemplateId(specId: string, kind: 'input' | 'output') {
  return `schema-template:${specId}:${kind}`;
}

function makeTemplateVersionId(specId: string, kind: 'input' | 'output', version = '1.0.0') {
  return `schema-template-version:${specId}:${kind}:${version}`;
}

function buildTemplateCode(specId: string, kind: 'input' | 'output') {
  return `${specId}-${kind}`;
}

function buildTemplateName(specName: string, kind: 'input' | 'output') {
  return `${specName} - ${kind === 'input' ? '输入模板' : '输出模板'}`;
}

function buildDefaultRows(fields: FieldSchema[]) {
  const rows: SchemaTemplateVersion['layout']['sections'][number]['rows'] = [];
  let buffer: FieldSchema[] = [];

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    rows.push({
      id: `row-${rows.length + 1}`,
      columns: buffer.map(field => ({ fieldKey: field.key, span: 1 as 1 })),
    });
    buffer = [];
  };

  fields.forEach(field => {
    if (field.type === 'textarea') {
      flushBuffer();
      rows.push({
        id: `row-${rows.length + 1}`,
        columns: [{ fieldKey: field.key, span: 2 as 2 }],
      });
      return;
    }

    buffer.push(field);
    if (buffer.length === 3) {
      flushBuffer();
    }
  });

  flushBuffer();
  return rows;
}

function buildDefaultLayout(fields: FieldSchema[]) {
  return {
    sections: [
      {
        id: 'section-default',
        title: '默认分组',
        rows: buildDefaultRows(fields),
      },
    ],
  } satisfies SchemaTemplateVersion['layout'];
}

function normalizeLayout(layout: FormLayoutConfig | undefined, fields: FieldSchema[]) {
  if (!layout?.sections?.length) return buildDefaultLayout(fields);

  const fieldMap = new Map(fields.map(field => [field.key, field]));
  const usedFieldKeys = new Set<string>();
  const sections = layout.sections
    .map(section => ({
      ...section,
      rows: section.rows
        .map(row => ({
          ...row,
          columns: row.columns.filter(column => fieldMap.has(column.fieldKey)),
        }))
        .filter(row => row.columns.length > 0),
    }))
    .filter(section => section.rows.length > 0);

  sections.forEach(section => {
    section.rows.forEach(row => {
      row.columns.forEach(column => usedFieldKeys.add(column.fieldKey));
    });
  });

  const missingFields = fields.filter(field => !usedFieldKeys.has(field.key));
  if (missingFields.length > 0) {
    const fallbackSection = sections[0] ?? {
      id: 'section-default',
      title: '默认分组',
      rows: [],
    };

    if (!sections[0]) sections.push(fallbackSection);
    fallbackSection.rows = [
      ...fallbackSection.rows,
      ...buildDefaultRows(missingFields).map((row, index) => ({
        ...row,
        id: `row-missing-${index + 1}`,
      })),
    ];
  }

  return { sections } satisfies FormLayoutConfig;
}

function findDictionaryEntry(field: FieldSchema, dictionary: FieldDictionaryEntry[]) {
  return dictionary.find(entry => entry.key === field.key);
}

function buildBindings(fields: FieldSchema[], dictionary: FieldDictionaryEntry[]) {
  return fields.map<SchemaTemplateFieldBinding>((field, index) => {
    const entry = findDictionaryEntry(field, dictionary);
    return {
      id: `binding:${field.key}:${index + 1}`,
      fieldKey: field.key,
      dictionaryEntryId: entry?.id,
      source: entry ? 'dictionary' : 'custom',
      order: index,
      required: field.required,
      fieldSnapshot: field,
    };
  });
}

function loadTemplatesRaw(): SchemaTemplate[] {
  try {
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (stored) {
      const templates = JSON.parse(stored) as SchemaTemplate[];
      if (Array.isArray(templates)) return templates;
    }
  } catch {
    // Ignore parse errors and rebuild below.
  }
  return [];
}

function loadTemplateVersionsRaw(): SchemaTemplateVersion[] {
  try {
    const stored = localStorage.getItem(TEMPLATE_VERSIONS_STORAGE_KEY);
    if (stored) {
      const versions = JSON.parse(stored) as SchemaTemplateVersion[];
      if (Array.isArray(versions)) return versions;
    }
  } catch {
    // Ignore parse errors and rebuild below.
  }
  return [];
}

function saveRaw(templates: SchemaTemplate[], versions: SchemaTemplateVersion[]) {
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  localStorage.setItem(TEMPLATE_VERSIONS_STORAGE_KEY, JSON.stringify(versions));
  notifySync();
}

function compareVersions(a: string, b: string) {
  const aParts = a.split('.').map(part => Number(part) || 0);
  const bParts = b.split('.').map(part => Number(part) || 0);
  const length = Math.max(aParts.length, bParts.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (aParts[index] || 0) - (bParts[index] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function getNextPatchVersion(version: string) {
  const parts = version.split('.').map(part => Number(part) || 0);
  const [major = 1, minor = 0, patch = 0] = parts;
  return `${major}.${minor}.${patch + 1}`;
}

function normalizeEnvironmentOptionValue(value: string) {
  const normalized = String(value).trim().toUpperCase();
  if (normalized === 'TEST') return 'UAT';
  if (normalized === 'PRODUCTION') return 'PROD';
  return normalized;
}

function normalizeEnvironmentField(field: FieldSchema): FieldSchema {
  if (field.key !== 'environment') return field;

  const normalizedOptions = (field.options ?? [])
    .map(option => {
      const value = normalizeEnvironmentOptionValue(option.value);
      return value ? { label: value, value } : null;
    })
    .filter((option): option is { label: string; value: string } => Boolean(option));

  const normalizedDefaultValue = typeof field.defaultValue === 'string'
    ? normalizeEnvironmentOptionValue(field.defaultValue)
    : field.defaultValue;

  return {
    ...field,
    type: 'select',
    options: normalizedOptions.length > 0 ? normalizedOptions : DEFAULT_ENVIRONMENT_OPTIONS.map(option => ({ ...option })),
    defaultValue: normalizedDefaultValue,
  };
}

function normalizeSchemaField(field: FieldSchema): FieldSchema {
  return normalizeEnvironmentField(field);
}

function serializeOptions(options?: FieldSchema['options']) {
  return JSON.stringify(options ?? []);
}

function hasSelectOptions(options?: FieldSchema['options']) {
  return Array.isArray(options) && options.length > 0;
}

function resolveFieldType(
  snapshot: FieldSchema,
  dictionaryEntry?: FieldDictionaryEntry,
  resolvedOptions?: FieldSchema['options'],
): FieldSchema['type'] {
  if (!dictionaryEntry?.type) return snapshot.type;
  if (dictionaryEntry.type !== snapshot.type) return snapshot.type;
  if (snapshot.type === 'select' && !hasSelectOptions(resolvedOptions)) return snapshot.type;
  return dictionaryEntry.type;
}

function resolveBoundFieldSchema(binding: SchemaTemplateFieldBinding, dictionaryEntry?: FieldDictionaryEntry): FieldSchema {
  const snapshot = binding.fieldSnapshot;
  const resolvedOptions = dictionaryEntry?.options ?? snapshot.options;

  return {
    key: binding.fieldKey,
    label: binding.aliasLabel || dictionaryEntry?.label || snapshot.label,
    type: resolveFieldType(snapshot, dictionaryEntry, resolvedOptions),
    required: binding.required ?? dictionaryEntry?.required ?? snapshot.required,
    options: resolvedOptions,
    defaultValue: binding.defaultValueOverride ?? dictionaryEntry?.defaultValue ?? snapshot.defaultValue,
    placeholder: dictionaryEntry?.placeholder ?? snapshot.placeholder,
    min: dictionaryEntry?.min ?? snapshot.min,
    max: dictionaryEntry?.max ?? snapshot.max,
    minLength: dictionaryEntry?.minLength ?? snapshot.minLength,
    maxLength: dictionaryEntry?.maxLength ?? snapshot.maxLength,
  };
}

function hasFieldStructureDrift(currentFields: FieldSchema[], version?: SchemaTemplateVersion) {
  if (!version) return true;
  if (version.bindings.length !== currentFields.length) return true;

  return currentFields.some((field, index) => {
    const binding = version.bindings[index];
    if (!binding) return true;
    const normalizedField = normalizeSchemaField(field);
    const snapshot = normalizeSchemaField(binding.fieldSnapshot);
    return (
      binding.fieldKey !== normalizedField.key
      || snapshot.key !== normalizedField.key
      || snapshot.label !== normalizedField.label
      || snapshot.type !== normalizedField.type
      || snapshot.required !== normalizedField.required
      || snapshot.defaultValue !== normalizedField.defaultValue
      || serializeOptions(snapshot.options) !== serializeOptions(normalizedField.options)
    );
  });
}

function hasLegacyStackedDefaultLayout(currentFields: FieldSchema[], version?: SchemaTemplateVersion) {
  if (!version?.layout?.sections?.length) return false;
  if (version.layout.sections.length !== 1) return false;

  const [section] = version.layout.sections;
  if (section.id !== 'section-default' || section.title !== '默认分组') return false;
  if (section.rows.length !== currentFields.length) return false;

  return currentFields.every((field, index) => {
    const row = section.rows[index];
    if (!row || row.columns.length !== 1) return false;
    const [column] = row.columns;
    return (
      column.fieldKey === field.key
      && column.span === ((field.type === 'textarea' ? 2 : 1) as 1 | 2)
    );
  });
}

type ScopedSpec = AtomicServiceSpec | ComboServiceSpec;

function ensureTemplateForSpec(
  spec: ScopedSpec,
  kind: 'input' | 'output',
  dictionary: FieldDictionaryEntry[],
  templates: SchemaTemplate[],
  versions: SchemaTemplateVersion[],
): { templateId: string; templateVersionId: string } {
  const now = new Date().toISOString();
  const templateId = makeTemplateId(spec.id, kind);
  const initialTemplateVersionId = makeTemplateVersionId(spec.id, kind);
  const currentFields = kind === 'input' ? spec.inputSchema : spec.outputSchema;
  const scope = spec.type === 'atomic' ? 'atomic' : 'combo';

  if (!templates.some(template => template.id === templateId)) {
    templates.push({
      id: templateId,
      code: buildTemplateCode(spec.id, kind),
      name: buildTemplateName(spec.name, kind),
      kind,
      scope,
      domain: spec.type === 'atomic' ? spec.domain : undefined,
      serviceId: spec.id,
      serviceName: spec.name,
      description: `从 ${spec.name} 当前${kind === 'input' ? '输入' : '输出'}字段冻结生成的专属模板首版`,
      status: 'active',
      currentVersionId: initialTemplateVersionId,
      createdAt: now,
      updatedAt: now,
    });
  }

  let template = templates.find(item => item.id === templateId);
  const baseTemplateVersionId = template?.currentVersionId || initialTemplateVersionId;

  if (!versions.some(version => version.id === initialTemplateVersionId)) {
    versions.push({
      id: initialTemplateVersionId,
      templateId,
      version: '1.0.0',
      status: 'active',
      changeSummary: '由现有服务字段结构冻结生成首版模板',
      bindings: buildBindings(currentFields, dictionary),
      layout: buildDefaultLayout(currentFields),
      createdAt: now,
      updatedAt: now,
    });
  } else {
    const template = templates.find(item => item.id === templateId);
    const currentVersion = template?.currentVersionId
      ? versions.find(item => item.id === template.currentVersionId)
      : versions.find(item => item.id === initialTemplateVersionId);

    if (hasFieldStructureDrift(currentFields, currentVersion) || hasLegacyStackedDefaultLayout(currentFields, currentVersion)) {
      const baseVersion = currentVersion?.version || '1.0.0';
      const nextVersion = getNextPatchVersion(baseVersion);
      const nextVersionId = makeTemplateVersionId(spec.id, kind, nextVersion);

      if (!versions.some(version => version.id === nextVersionId)) {
        versions.push({
          id: nextVersionId,
          templateId,
          version: nextVersion,
          status: 'active',
          changeSummary: hasFieldStructureDrift(currentFields, currentVersion)
            ? '字段结构已同步到当前服务定义'
            : '默认布局已升级为多列表单',
          bindings: buildBindings(currentFields, dictionary),
          layout: buildDefaultLayout(currentFields),
          createdAt: now,
          updatedAt: now,
        });
      }

      const templateIndex = templates.findIndex(item => item.id === templateId);
      if (templateIndex >= 0) {
        templates[templateIndex] = {
          ...templates[templateIndex],
          currentVersionId: nextVersionId,
          updatedAt: now,
        };
      }

      return { templateId, templateVersionId: nextVersionId };
    }
  }

  template = templates.find(item => item.id === templateId);
  return {
    templateId,
    templateVersionId: template?.currentVersionId || baseTemplateVersionId,
  };
}

export function bootstrapSchemaTemplatesFromSpecs() {
  const specs = getSpecs();
  const dictionary = getFieldDictionaryEntries();
  const templates = loadTemplatesRaw();
  const versions = loadTemplateVersionsRaw();
  let mutated = false;

  specs.forEach(spec => {
    if (spec.type !== 'atomic') return;
    const inputRefs = ensureTemplateForSpec(spec, 'input', dictionary, templates, versions);
    const outputRefs = ensureTemplateForSpec(spec, 'output', dictionary, templates, versions);

    const patch: Partial<AtomicServiceSpec> = {};
    if (!spec.inputTemplateId) patch.inputTemplateId = inputRefs.templateId;
    if (
      !spec.inputTemplateVersionId
      || (spec.inputTemplateId === inputRefs.templateId && spec.inputTemplateVersionId !== inputRefs.templateVersionId)
    ) {
      patch.inputTemplateVersionId = inputRefs.templateVersionId;
    }
    if (!spec.outputTemplateId) patch.outputTemplateId = outputRefs.templateId;
    if (
      !spec.outputTemplateVersionId
      || (spec.outputTemplateId === outputRefs.templateId && spec.outputTemplateVersionId !== outputRefs.templateVersionId)
    ) {
      patch.outputTemplateVersionId = outputRefs.templateVersionId;
    }

    if (Object.keys(patch).length > 0) {
      updateSpec(spec.id, patch);
      mutated = true;
    }
  });

  if (templates.length > 0 || versions.length > 0) {
    saveRaw(templates, versions);
    mutated = true;
  }

  return mutated;
}

function ensureBootstrapped() {
  const templates = loadTemplatesRaw();
  const versions = loadTemplateVersionsRaw();
  if (templates.length === 0 || versions.length === 0) {
    bootstrapSchemaTemplatesFromSpecs();
    return {
      templates: loadTemplatesRaw(),
      versions: loadTemplateVersionsRaw(),
    };
  }
  return { templates, versions };
}

export function getSchemaTemplates() {
  return ensureBootstrapped().templates.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

export function getSchemaTemplate(id: string) {
  return ensureBootstrapped().templates.find(template => template.id === id);
}

export function getSchemaTemplateVersions(templateId?: string) {
  const versions = ensureBootstrapped().versions;
  const filtered = templateId ? versions.filter(version => version.templateId === templateId) : versions;
  return filtered.sort((a, b) => compareVersions(b.version, a.version));
}

export function getSchemaTemplateVersion(id: string) {
  return ensureBootstrapped().versions.find(version => version.id === id);
}

export function getCurrentSchemaTemplateVersion(templateId: string) {
  const template = getSchemaTemplate(templateId);
  if (!template?.currentVersionId) return undefined;
  return getSchemaTemplateVersion(template.currentVersionId);
}

export function getResolvedTemplateFields(templateVersionId?: string) {
  if (!templateVersionId) return [];
  const dictionary = getFieldDictionaryEntries();
  const version = getSchemaTemplateVersion(templateVersionId);
  if (!version) return [];
  return version.bindings
    .sort((a, b) => a.order - b.order)
    .map(binding => {
      const entry = binding.dictionaryEntryId
        ? dictionary.find(item => item.id === binding.dictionaryEntryId)
        : undefined;
      return normalizeSchemaField(resolveBoundFieldSchema(binding, entry));
    });
}

export function getResolvedTemplateLayout(templateVersionId?: string) {
  if (!templateVersionId) return undefined;
  const version = getSchemaTemplateVersion(templateVersionId);
  if (!version) return undefined;
  const fields = getResolvedTemplateFields(templateVersionId);
  return normalizeLayout(version.layout, fields);
}

export function getResolvedSpecSchemaFields(spec: Pick<ServiceSpec, 'type' | 'inputSchema' | 'outputSchema' | 'inputTemplateVersionId' | 'outputTemplateVersionId'>, kind: 'input' | 'output') {
  const templateVersionId = kind === 'input' ? spec.inputTemplateVersionId : spec.outputTemplateVersionId;
  const resolved = getResolvedTemplateFields(templateVersionId);
  if (resolved.length > 0) return resolved;
  return (kind === 'input' ? spec.inputSchema : spec.outputSchema).map(normalizeSchemaField);
}

export function getResolvedSpecSchemaLayout(
  spec: Pick<ServiceSpec, 'type' | 'inputSchema' | 'outputSchema' | 'inputTemplateVersionId' | 'outputTemplateVersionId'>,
  kind: 'input' | 'output',
) {
  const templateVersionId = kind === 'input' ? spec.inputTemplateVersionId : spec.outputTemplateVersionId;
  const resolvedFields = getResolvedSpecSchemaFields(spec, kind);
  const resolvedLayout = getResolvedTemplateLayout(templateVersionId);
  return normalizeLayout(resolvedLayout, resolvedFields);
}

export function addSchemaTemplateVersion(version: SchemaTemplateVersion) {
  const { templates, versions } = ensureBootstrapped();
  const nextVersions = [...versions, version];
  const nextTemplates = templates.map(template =>
    template.id === version.templateId
      ? {
          ...template,
          currentVersionId: version.id,
          updatedAt: new Date().toISOString(),
        }
      : template,
  );
  saveRaw(nextTemplates, nextVersions);
}

export function createDraftFromTemplateVersion(templateId: string, sourceVersionId?: string) {
  const { templates, versions } = ensureBootstrapped();
  const template = templates.find(item => item.id === templateId);
  if (!template) return undefined;

  const sourceVersion = sourceVersionId
    ? versions.find(item => item.id === sourceVersionId)
    : template.currentVersionId
      ? versions.find(item => item.id === template.currentVersionId)
      : versions.find(item => item.templateId === templateId);

  if (!sourceVersion) return undefined;

  const nextVersion = getNextPatchVersion(sourceVersion.version);
  const nextId = `${sourceVersion.templateId}:${nextVersion}:draft`;
  if (versions.some(item => item.id === nextId)) return versions.find(item => item.id === nextId);

  const now = new Date().toISOString();
  const draftVersion: SchemaTemplateVersion = {
    ...sourceVersion,
    id: nextId,
    version: nextVersion,
    status: 'draft',
    basedOnVersionId: sourceVersion.id,
    changeSummary: `从 v${sourceVersion.version} 复制生成草稿版本`,
    bindings: sourceVersion.bindings.map(binding => ({ ...binding, fieldSnapshot: { ...binding.fieldSnapshot } })),
    layout: JSON.parse(JSON.stringify(sourceVersion.layout)),
    createdAt: now,
    updatedAt: now,
  };

  saveRaw(
    templates.map(item =>
      item.id === templateId
        ? { ...item, updatedAt: now }
        : item,
    ),
    [...versions, draftVersion],
  );

  return draftVersion;
}

export function updateSchemaTemplateVersion(versionId: string, patch: Partial<SchemaTemplateVersion>) {
  const { templates, versions } = ensureBootstrapped();
  const now = new Date().toISOString();
  const nextVersions = versions.map(version =>
    version.id === versionId
      ? {
          ...version,
          ...patch,
          updatedAt: now,
        }
      : version,
  );

  const targetVersion = nextVersions.find(version => version.id === versionId);
  const nextTemplates = targetVersion
    ? templates.map(template =>
        template.id === targetVersion.templateId
          ? { ...template, updatedAt: now }
          : template,
      )
    : templates;

  saveRaw(nextTemplates, nextVersions);
}

export function publishSchemaTemplateVersion(templateId: string, versionId: string) {
  const { templates, versions } = ensureBootstrapped();
  const now = new Date().toISOString();
  const nextVersions: SchemaTemplateVersion[] = versions.map(version => {
    if (version.templateId !== templateId) return version;
    if (version.id === versionId) {
      return { ...version, status: 'active', updatedAt: now };
    }
    return {
      ...version,
      status: version.status === 'draft' ? 'draft' : 'archived',
      updatedAt: now,
    };
  });

  const nextTemplates: SchemaTemplate[] = templates.map(template =>
    template.id === templateId
      ? {
          ...template,
          currentVersionId: versionId,
          status: 'active',
          updatedAt: now,
        }
      : template,
  );

  saveRaw(nextTemplates, nextVersions);
}
