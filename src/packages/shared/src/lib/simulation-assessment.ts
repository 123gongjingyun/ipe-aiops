import type { InternetAppDeployDetail, Order } from '../types';

export interface SimulationCheckItem {
  key: string;
  label: string;
  status: 'pass' | 'warn';
  detail: string;
}

export interface SimulationAssessment {
  summary: string;
  gateStatus: 'ready' | 'attention';
  environmentLabel: string;
  items: SimulationCheckItem[];
}

interface SimulationInput {
  answers?: Record<string, string>;
  extras?: Record<string, boolean>;
  internetAppDetail?: InternetAppDeployDetail;
}

function buildTargetEnvLabel(value?: string) {
  if (!value) return '未指定环境';
  if (value === 'PROD') return '生产仿真链路';
  if (value === 'UAT' || value === 'SIT') return '测试预发布链路';
  return '非生产验证链路';
}

export function deriveSimulationAssessment(input: SimulationInput): SimulationAssessment {
  const answers = input.answers ?? {};
  const detail = input.internetAppDetail;
  const targetEnv = detail?.targetEnv || answers.targetEnv || 'DEV';
  const scale = answers.scale || 'medium';
  const domain = detail?.domain || answers.domain || '';
  const ports = (detail?.ports || answers.ports || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
  const businessCriticality = answers.businessCriticality || 'standard';
  const useDuration = answers.useDuration || answers.duration || '';
  const cdnEnabled = Boolean(input.extras?.cdnEnabled);

  const items: SimulationCheckItem[] = [];

  items.push({
    key: 'resource-shape',
    label: '资源规模匹配',
    status: targetEnv === 'PROD' || scale === 'high' || scale === 'ultra' ? 'warn' : 'pass',
    detail:
      targetEnv === 'PROD' || scale === 'high' || scale === 'ultra'
        ? '当前需求规模较高，建议先确认容量、并发与切换预案是否充足'
        : '当前需求规模适合按标准配置推进，可先完成基础验证',
  });

  items.push({
    key: 'network-chain',
    label: '访问链路完整性',
    status: domain && ports.length > 0 ? 'pass' : 'warn',
    detail:
      domain && ports.length > 0
        ? `已明确访问域名 ${domain} 与端口 ${ports.join(', ')}，可继续核对发布链路`
        : '当前域名或端口信息不完整，发布路径还需要补充确认',
  });

  items.push({
    key: 'security-gate',
    label: '审批与放行条件',
    status: targetEnv === 'PROD' || businessCriticality === 'core' || businessCriticality === 'mission' ? 'warn' : 'pass',
    detail:
      targetEnv === 'PROD' || businessCriticality === 'core' || businessCriticality === 'mission'
        ? '当前属于生产或高等级场景，建议提前确认审批与放行条件'
        : '当前可先完成门户内预检，后续再补充正式审批流程',
  });

  items.push({
    key: 'operation-window',
    label: '持续使用准备',
    status: useDuration.includes('长期') || useDuration.includes('12') ? 'warn' : 'pass',
    detail:
      useDuration.includes('长期') || useDuration.includes('12')
        ? '当前计划使用周期较长，建议提前确认运行保障与成本边界'
        : '当前使用周期较清晰，可按标准方式推进交付准备',
  });

  if (cdnEnabled) {
    items.push({
      key: 'cdn-publish',
      label: 'CDN 发布准备',
      status: 'warn',
      detail: '已启用 CDN，建议提前确认缓存刷新、回源和 HTTPS 策略',
    });
  }

  const warnCount = items.filter(item => item.status === 'warn').length;

  return {
    summary: warnCount > 0 ? `当前有 ${warnCount} 项交付前建议重点确认` : '当前关键信息已基本齐备，可继续进入下一阶段',
    gateStatus: warnCount > 0 ? 'attention' : 'ready',
    environmentLabel: buildTargetEnvLabel(targetEnv),
    items,
  };
}

export function deriveOrderSimulationAssessment(order: Pick<Order, 'answers' | 'extras' | 'internetAppDetail'>) {
  return deriveSimulationAssessment(order);
}
