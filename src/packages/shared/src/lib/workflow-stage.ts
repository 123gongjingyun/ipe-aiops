import type { WorkflowShellStageStatus } from '../components/workflow-shell';

export type WorkflowStageNodeStatus = 'pending' | 'processing' | 'completed' | 'blocked';

export interface WorkflowStageNodeLike {
  status: WorkflowStageNodeStatus;
}

export function normalizeLinearWorkflowStageNodes<T extends WorkflowStageNodeLike>(nodes: T[]): T[] {
  const firstBlockedIndex = nodes.findIndex(node => node.status === 'blocked');
  if (firstBlockedIndex >= 0) {
    return nodes.map((node, index) => ({
      ...node,
      status:
        index < firstBlockedIndex
          ? 'completed'
          : index === firstBlockedIndex
            ? 'blocked'
            : 'pending',
    }));
  }

  const firstProcessingIndex = nodes.findIndex(node => node.status === 'processing');
  if (firstProcessingIndex >= 0) {
    return nodes.map((node, index) => ({
      ...node,
      status:
        index < firstProcessingIndex
          ? 'completed'
          : index === firstProcessingIndex
            ? 'processing'
            : 'pending',
    }));
  }

  return nodes;
}

export function deriveWorkflowStageStatus(
  nodes: WorkflowStageNodeLike[],
): WorkflowShellStageStatus {
  if (!nodes.length) return 'pending';
  const hasBlocked = nodes.some(node => node.status === 'blocked');
  const hasProcessing = nodes.some(node => node.status === 'processing');
  const allCompleted = nodes.every(node => node.status === 'completed');

  if (allCompleted) return 'completed';
  if (hasBlocked) return 'blocked';
  if (hasProcessing) return 'processing';
  return 'pending';
}

export function buildWorkflowShellStageStatuses<TStageKey extends string>(
  orderedStageKeys: TStageKey[],
  currentStageKey: TStageKey,
  currentStageNodes: Record<TStageKey, WorkflowStageNodeLike[]>,
): Record<TStageKey, WorkflowShellStageStatus> {
  const currentStageIndex = orderedStageKeys.findIndex(stageKey => stageKey === currentStageKey);

  return Object.fromEntries(
    orderedStageKeys.map((stageKey, index) => {
      const nodes = currentStageNodes[stageKey] || [];
      const ownStatus = deriveWorkflowStageStatus(nodes);

      let status: WorkflowShellStageStatus;
      if (index < currentStageIndex) {
        status = ownStatus === 'blocked' ? 'blocked' : 'completed';
      } else if (index > currentStageIndex) {
        status = 'pending';
      } else {
        status = ownStatus;
      }

      return [stageKey, status];
    }),
  ) as Record<TStageKey, WorkflowShellStageStatus>;
}
