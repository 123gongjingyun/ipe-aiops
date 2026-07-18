import { useEffect, useMemo, useState } from 'react';
import {
  getCurrentSchemaTemplateVersion,
  getResolvedTemplateFields,
  getResolvedTemplateLayout,
  getSchemaTemplate,
  getSchemaTemplates,
  getSchemaTemplateVersion,
  getSchemaTemplateVersions,
  onSchemaTemplatesSync,
} from '../store/schema-templates';

export function useSchemaTemplates() {
  const [templates, setTemplates] = useState(() => getSchemaTemplates());

  useEffect(() => {
    setTemplates(getSchemaTemplates());
    return onSchemaTemplatesSync(() => setTemplates(getSchemaTemplates()));
  }, []);

  return templates;
}

export function useSchemaTemplate(templateId: string) {
  const [tick, setTick] = useState(0);

  useEffect(() => onSchemaTemplatesSync(() => setTick(value => value + 1)), []);

  return useMemo(() => getSchemaTemplate(templateId), [templateId, tick]);
}

export function useSchemaTemplateVersions(templateId?: string) {
  const [tick, setTick] = useState(0);

  useEffect(() => onSchemaTemplatesSync(() => setTick(value => value + 1)), []);

  return useMemo(() => getSchemaTemplateVersions(templateId), [templateId, tick]);
}

export function useSchemaTemplateVersion(versionId?: string) {
  const [tick, setTick] = useState(0);

  useEffect(() => onSchemaTemplatesSync(() => setTick(value => value + 1)), []);

  return useMemo(() => (versionId ? getSchemaTemplateVersion(versionId) : undefined), [versionId, tick]);
}

export function useResolvedTemplateFields(templateVersionId?: string) {
  const [tick, setTick] = useState(0);

  useEffect(() => onSchemaTemplatesSync(() => setTick(value => value + 1)), []);

  return useMemo(() => getResolvedTemplateFields(templateVersionId), [templateVersionId, tick]);
}

export function useResolvedTemplateLayout(templateVersionId?: string) {
  const [tick, setTick] = useState(0);

  useEffect(() => onSchemaTemplatesSync(() => setTick(value => value + 1)), []);

  return useMemo(() => getResolvedTemplateLayout(templateVersionId), [templateVersionId, tick]);
}

export function useCurrentTemplateVersion(templateId?: string) {
  const [tick, setTick] = useState(0);

  useEffect(() => onSchemaTemplatesSync(() => setTick(value => value + 1)), []);

  return useMemo(() => (templateId ? getCurrentSchemaTemplateVersion(templateId) : undefined), [templateId, tick]);
}
