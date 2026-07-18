import type { WorkflowTimelineNode } from '../types';
import { formatDurationBetween } from './utils';

function formatNodeDuration(node: WorkflowTimelineNode) {
  return formatDurationBetween(node.enteredAt, node.completedAt);
}

export function buildWorkflowTimelineSlaSummary(nodes: WorkflowTimelineNode[] = []) {
  return nodes
    .map(node => `${node.label}: ${node.slaTarget || '-'}`)
    .join('\n');
}

export function buildWorkflowTimelineDurationSummary(nodes: WorkflowTimelineNode[] = []) {
  return nodes
    .map(node => `${node.label}: ${formatNodeDuration(node)}`)
    .join('\n');
}

export function buildWorkflowTimelineDetailSummary(nodes: WorkflowTimelineNode[] = []) {
  return nodes
    .map(
      node =>
        `${node.label}｜SLA ${node.slaTarget || '-'}｜耗时 ${formatNodeDuration(node)}｜进入 ${node.enteredAt || '-'}｜完成 ${node.completedAt || '-'}`,
    )
    .join('\n');
}

export function getWorkflowTimelineNodeDuration(node: WorkflowTimelineNode) {
  return formatNodeDuration(node);
}
