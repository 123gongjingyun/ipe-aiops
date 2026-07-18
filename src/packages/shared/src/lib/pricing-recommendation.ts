import { DEFAULT_PRICING_CONFIG, formatPriceRange, loadPricingConfig } from './pricing-config';
import type { InternetAppDeployDetail, Order } from '../types';

export interface PackageRecommendation {
  tierKey: 'basic' | 'standard' | 'ha';
  tierLabel: string;
  durationLabel: string;
  estimateLabel: string;
  summary: string;
  reasons: string[];
}

interface RecommendationInput {
  comboId?: string;
  comboName?: string;
  answers?: Record<string, string>;
  extras?: Record<string, boolean>;
  internetAppDetail?: InternetAppDeployDetail;
  services?: string[];
}

function normalizeDurationLabel(value?: string, targetEnv?: string) {
  if (!value) return targetEnv === 'PROD' ? '6-12 个月' : '1-3 个月';
  return value;
}

export function derivePackageRecommendation(input: RecommendationInput): PackageRecommendation {
  const pricingConfig = typeof window === 'undefined' ? DEFAULT_PRICING_CONFIG : loadPricingConfig();
  const answers = input.answers ?? {};
  const targetEnv = input.internetAppDetail?.targetEnv || answers.targetEnv || 'DEV';
  const durationLabel = normalizeDurationLabel(answers.useDuration || answers.duration, targetEnv);
  const criticality = answers.businessCriticality || 'standard';
  const scale = answers.scale || 'medium';
  const cdnEnabled = Boolean(input.extras?.cdnEnabled);

  let tierKey: PackageRecommendation['tierKey'] = 'basic';
  const reasons: string[] = [];

  if (input.comboId === 'combo-ha') {
    tierKey = 'ha';
    reasons.push('高可用生产环境默认按高可用增长包评估');
  } else if (input.comboId === 'combo-data') {
    tierKey = 'standard';
    reasons.push('数据平台组合默认按标准生产包评估');
  } else if (input.comboId === 'combo-test') {
    tierKey = 'basic';
    reasons.push('测试环境场景优先按基础发布包评估');
  }

  if (targetEnv === 'PROD') {
    tierKey = tierKey === 'basic' ? 'standard' : tierKey;
    reasons.push('目标环境为 PROD，需要纳入生产级交付保障');
  }

  if (scale === 'high' || scale === 'ultra') {
    tierKey = 'ha';
    reasons.push('访问规模较高，需要容量与高可用冗余');
  } else if (scale === 'medium' && tierKey === 'basic') {
    tierKey = 'standard';
    reasons.push('中等访问规模建议使用标准生产包');
  }

  if (criticality === 'core' || criticality === 'mission') {
    tierKey = 'ha';
    reasons.push('业务等级较高，需要更强的容灾与运行保障');
  } else if (criticality === 'important' && tierKey === 'basic') {
    tierKey = 'standard';
    reasons.push('重要业务建议提升到标准生产包');
  }

  if (cdnEnabled) {
    reasons.push('已启用 CDN，加速与发布链路会纳入套餐成本');
  }

  const durationFactor = pricingConfig.durationFactors.find(item => item.key === durationLabel)?.factor ?? 1;
  const envFactor = pricingConfig.envFactors.find(item => item.key === targetEnv)?.factor ?? 1;
  const criticalityFactor = pricingConfig.criticalityFactors.find(item => item.key === criticality)?.factor ?? 1;
  if (durationFactor >= 1.35) {
    reasons.push('使用时长较长，建议纳入持续运营与成本控制');
  }

  const tier = pricingConfig.packages.find(item => item.key === tierKey) ?? pricingConfig.packages[0];
  const totalFactor = durationFactor * envFactor * criticalityFactor;
  const estimateLabel = formatPriceRange(
    Math.round(tier.baseMin * totalFactor),
    Math.round(tier.baseMax * totalFactor),
  );
  const summary = `${tier.name} · ${durationLabel} · ${estimateLabel}`;

  return {
    tierKey,
    tierLabel: tier.name,
    durationLabel,
    estimateLabel,
    summary,
    reasons,
  };
}

export function deriveOrderPackageRecommendation(order: Pick<Order, 'comboId' | 'comboName' | 'answers' | 'extras' | 'internetAppDetail' | 'services'>) {
  return derivePackageRecommendation(order);
}
