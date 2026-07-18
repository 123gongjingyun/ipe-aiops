import { describe, expect, it } from 'vitest';

import {
  buildWorkflowShellStageStatuses,
  deriveWorkflowStageStatus,
  normalizeLinearWorkflowStageNodes,
} from './workflow-stage';

describe('workflow stage helpers', () => {
  it('normalizes linear nodes to a single blocked node and pending tail', () => {
    const nodes = normalizeLinearWorkflowStageNodes([
      { status: 'completed' as const },
      { status: 'blocked' as const },
      { status: 'processing' as const },
      { status: 'completed' as const },
    ]);

    expect(nodes.map(node => node.status)).toEqual(['completed', 'blocked', 'pending', 'pending']);
  });

  it('normalizes linear nodes to a single processing node and pending tail', () => {
    const nodes = normalizeLinearWorkflowStageNodes([
      { status: 'completed' as const },
      { status: 'processing' as const },
      { status: 'processing' as const },
      { status: 'completed' as const },
    ]);

    expect(nodes.map(node => node.status)).toEqual(['completed', 'processing', 'pending', 'pending']);
  });

  it('derives shell stage statuses relative to the current stage', () => {
    const statuses = buildWorkflowShellStageStatuses(
      ['review', 'itsm', 'plan'] as const,
      'itsm',
      {
        review: [{ status: 'completed' }],
        itsm: [{ status: 'processing' }],
        plan: [{ status: 'completed' }],
      },
    );

    expect(statuses).toEqual({
      review: 'completed',
      itsm: 'processing',
      plan: 'pending',
    });
    expect(deriveWorkflowStageStatus([{ status: 'blocked' }])).toBe('blocked');
  });
});
