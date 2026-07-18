export interface PricingPackageConfig {
  key: 'basic' | 'standard' | 'ha';
  name: string;
  audience: string;
  pricing: string;
  duration: string;
  baseMin: number;
  baseMax: number;
  modules: string[];
}

export interface PricingConfig {
  packages: PricingPackageConfig[];
  durationFactors: Array<{ key: string; label: string; factor: number }>;
  envFactors: Array<{ key: string; label: string; factor: number }>;
  criticalityFactors: Array<{ key: string; label: string; factor: number }>;
}

const STORAGE_KEY = 'ipe_pricing_config_v1';

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  packages: [
    {
      key: 'basic',
      name: '基础发布包',
      audience: '中小型内部应用',
      pricing: '按月估算',
      duration: '1-3 个月',
      baseMin: 1200,
      baseMax: 3600,
      modules: ['计算资源', '数据库', '监控接入'],
    },
    {
      key: 'standard',
      name: '标准生产包',
      audience: '主流生产业务',
      pricing: '按季度估算',
      duration: '3-12 个月',
      baseMin: 6000,
      baseMax: 18000,
      modules: ['计算资源', '数据库', '中间件', '日志', '备份', '安全'],
    },
    {
      key: 'ha',
      name: '高可用增长包',
      audience: '核心交易与高波动业务',
      pricing: '按半年估算',
      duration: '6-12 个月',
      baseMin: 18000,
      baseMax: 42000,
      modules: ['双活/高可用', '网络优化', '安全强化', '容量保障'],
    },
  ],
  durationFactors: [
    { key: '1-3个月', label: '1-3个月', factor: 1 },
    { key: '3-6个月', label: '3-6个月', factor: 1.15 },
    { key: '6-12个月', label: '6-12个月', factor: 1.35 },
    { key: '长期', label: '长期', factor: 1.55 },
  ],
  envFactors: [
    { key: 'DEV', label: '开发环境', factor: 0.9 },
    { key: 'SIT', label: 'SIT', factor: 0.95 },
    { key: 'UAT', label: 'UAT', factor: 1 },
    { key: 'PERM', label: '长期测试', factor: 1.05 },
    { key: 'PROD', label: '生产环境', factor: 1.25 },
  ],
  criticalityFactors: [
    { key: 'standard', label: '一般业务', factor: 1 },
    { key: 'important', label: '重要业务', factor: 1.15 },
    { key: 'core', label: '核心业务', factor: 1.3 },
    { key: 'mission', label: '关键交易', factor: 1.45 },
  ],
};

export function loadPricingConfig(): PricingConfig {
  if (typeof window === 'undefined') return DEFAULT_PRICING_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PRICING_CONFIG;
    const parsed = JSON.parse(raw) as PricingConfig;
    return {
      packages: parsed.packages?.length ? parsed.packages : DEFAULT_PRICING_CONFIG.packages,
      durationFactors: parsed.durationFactors?.length ? parsed.durationFactors : DEFAULT_PRICING_CONFIG.durationFactors,
      envFactors: parsed.envFactors?.length ? parsed.envFactors : DEFAULT_PRICING_CONFIG.envFactors,
      criticalityFactors: parsed.criticalityFactors?.length ? parsed.criticalityFactors : DEFAULT_PRICING_CONFIG.criticalityFactors,
    };
  } catch {
    return DEFAULT_PRICING_CONFIG;
  }
}

export function savePricingConfig(config: PricingConfig) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function formatPriceRange(min: number, max: number) {
  if (min === max) return `¥${min.toLocaleString('zh-CN')}`;
  return `¥${min.toLocaleString('zh-CN')} - ¥${max.toLocaleString('zh-CN')}`;
}
