import type { ApplyStrategy, AtomicServiceSpec, ComboServiceSpec, ServiceSpec } from '../types';

const DEFAULT_COMBO_STRATEGY: ApplyStrategy = {
  workflowMode: 'combo_general',
  aiMode: 'orchestration',
  uiHints: {
    preferArchitectureUpload: true,
    preferConfigUpload: true,
    businessGoalHelpMode: 'dialog',
  },
};

const DEFAULT_ATOMIC_STRATEGY: ApplyStrategy = {
  workflowMode: 'atomic_service',
  aiMode: 'validation',
  uiHints: {
    preferArchitectureUpload: false,
    preferConfigUpload: true,
    businessGoalHelpMode: 'dialog',
  },
};

function mergeApplyStrategy(base: ApplyStrategy, override?: ApplyStrategy): ApplyStrategy {
  if (!override) return base;
  return {
    ...base,
    ...override,
    fieldStrategies: override.fieldStrategies ?? base.fieldStrategies,
    uiHints: {
      ...base.uiHints,
      ...override.uiHints,
    },
  };
}

export function resolveApplyStrategy(spec: ServiceSpec): ApplyStrategy {
  if (spec.type === 'combo') {
    const comboSpec = spec as ComboServiceSpec;
    const comboDefault = comboSpec.id === 'combo-internet-app'
      ? {
          ...DEFAULT_COMBO_STRATEGY,
          workflowMode: 'internet_app' as const,
          aiMode: 'topology_guided' as const,
        }
      : DEFAULT_COMBO_STRATEGY;
    return mergeApplyStrategy(comboDefault, comboSpec.applyStrategy);
  }

  return mergeApplyStrategy(DEFAULT_ATOMIC_STRATEGY, (spec as AtomicServiceSpec).applyStrategy);
}

export function getApplyFieldStrategy(spec: ServiceSpec, fieldKey: string) {
  return resolveApplyStrategy(spec).fieldStrategies?.find(item => item.fieldKey === fieldKey);
}
