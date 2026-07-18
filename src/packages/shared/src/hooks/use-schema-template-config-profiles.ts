import { useEffect, useMemo, useState } from 'react';
import {
  getSchemaTemplateConfigProfileBinding,
  getSchemaTemplateConfigProfileBindings,
  onSchemaTemplateConfigProfileBindingsSync,
} from '../store/schema-template-config-profiles';

export function useSchemaTemplateConfigProfileBindings() {
  const [tick, setTick] = useState(0);

  useEffect(() => onSchemaTemplateConfigProfileBindingsSync(() => setTick(value => value + 1)), []);

  return useMemo(() => getSchemaTemplateConfigProfileBindings(), [tick]);
}

export function useSchemaTemplateConfigProfileBinding(templateId?: string) {
  const [tick, setTick] = useState(0);

  useEffect(() => onSchemaTemplateConfigProfileBindingsSync(() => setTick(value => value + 1)), []);

  return useMemo(
    () => (templateId ? getSchemaTemplateConfigProfileBinding(templateId) : undefined),
    [templateId, tick],
  );
}
