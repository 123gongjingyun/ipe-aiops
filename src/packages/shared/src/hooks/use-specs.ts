import { useState, useEffect, useMemo } from 'react';
import {
  getSpecs,
  getSpec,
  getAtomicSpecs,
  getComboSpecs,
  onSpecsSync,
} from '../store/service-specs';
import { bootstrapSchemaTemplatesFromSpecs } from '../store/schema-templates';
import type {
  ServiceSpec,
  AtomicServiceSpec,
  ComboServiceSpec,
  ServiceStatus,
  SpecFilter,
} from '../types';

export function useSpecs(filter?: SpecFilter) {
  const [specs, setSpecs] = useState<ServiceSpec[]>(() => getSpecs(filter));

  useEffect(() => {
    bootstrapSchemaTemplatesFromSpecs();
    setSpecs(getSpecs(filter));
    return onSpecsSync(() => setSpecs(getSpecs(filter)));
  }, [filter]);

  return specs;
}

export function useSpec(id: string) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    bootstrapSchemaTemplatesFromSpecs();
    return onSpecsSync(() => setTick(value => value + 1));
  }, []);

  return useMemo(() => getSpec(id), [id, tick]);
}

export function useAtomicSpecs(domain?: string, status?: ServiceStatus) {
  const [specs, setSpecs] = useState<AtomicServiceSpec[]>(() => getAtomicSpecs(domain, status));

  useEffect(() => {
    bootstrapSchemaTemplatesFromSpecs();
    setSpecs(getAtomicSpecs(domain, status));
    return onSpecsSync(() => setSpecs(getAtomicSpecs(domain, status)));
  }, [domain, status]);

  return specs;
}

export function useComboSpecs(status?: ServiceStatus) {
  const [specs, setSpecs] = useState<ComboServiceSpec[]>(() => getComboSpecs(status));

  useEffect(() => {
    bootstrapSchemaTemplatesFromSpecs();
    setSpecs(getComboSpecs(status));
    return onSpecsSync(() => setSpecs(getComboSpecs(status)));
  }, [status]);

  return specs;
}
