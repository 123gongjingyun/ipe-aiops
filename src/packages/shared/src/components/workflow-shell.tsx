import type { ReactNode } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';

export type WorkflowShellStageStatus = 'completed' | 'processing' | 'blocked' | 'pending';

export interface WorkflowShellStageCard {
  key: string;
  index: number;
  label: string;
  status: WorkflowShellStageStatus;
  metaPrimary: string;
  metaSecondary: string;
  footerLeft: string;
  footerRight: string;
  active: boolean;
  reached: boolean;
  onClick: () => void;
}

export interface WorkflowShellNodeCard {
  id: string;
  title: string;
  status: WorkflowShellStageStatus;
  summary: string;
  owner: string;
  updatedAt?: string;
  onClick: () => void;
}

export interface WorkflowShellAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline';
}

export interface WorkflowShellContextBadge {
  label: string;
  tone?: 'default' | 'primary';
}

interface WorkflowShellProps {
  progressValue: number;
  timelineLabel?: string;
  onOpenTimeline: () => void;
  stageCards: WorkflowShellStageCard[];
  summaryTitle: string;
  summaryText: string;
  summaryTag: string;
  guidanceText?: string;
  contextBadges?: WorkflowShellContextBadge[];
  statusBadge?: { label: string; className: string };
  helperText?: string;
  actions?: WorkflowShellAction[];
  futureNotice?: ReactNode;
  nodeDetail?: ReactNode;
  nodeSection?: {
    title: string;
    description: string;
    badge: string;
    railTitle: string;
    railDescription: string;
    nodes: WorkflowShellNodeCard[];
  };
}

function stageStatusClass(status: WorkflowShellStageStatus) {
  switch (status) {
    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'processing':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    case 'blocked':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
}

function stageStatusLabel(status: WorkflowShellStageStatus) {
  switch (status) {
    case 'completed':
      return '已完成';
    case 'processing':
      return '处理中';
    case 'blocked':
      return '已退回';
    default:
      return '待处理';
  }
}

function nodeStatusLabel(status: WorkflowShellStageStatus) {
  switch (status) {
    case 'completed':
      return '已完成';
    case 'processing':
      return '处理中';
    case 'blocked':
      return '已退回';
    default:
      return '待开始';
  }
}

function nodeStatusClass(status: WorkflowShellStageStatus) {
  switch (status) {
    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'processing':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    case 'blocked':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
}

export function WorkflowShell({
  progressValue,
  timelineLabel = '查看节点记录',
  onOpenTimeline,
  stageCards,
  summaryTitle,
  summaryText,
  summaryTag,
  guidanceText,
  contextBadges = [],
  statusBadge,
  helperText,
  actions = [],
  futureNotice,
  nodeDetail,
  nodeSection,
}: WorkflowShellProps) {
  return (
    <>
      <Card className="mb-6">
        <CardContent className="p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">工单流转阶段</div>
              <div className="mt-1 text-xs text-muted-foreground">按业务阶段依次推进，点击阶段可查看当前处理内容，完整节点记录保留在弹窗中。</div>
            </div>
            <Button variant="outline" size="sm" onClick={onOpenTimeline}>
              {timelineLabel}
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-5">
            {stageCards.map((stage, index) => (
              <div key={stage.key} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={stage.onClick}
                  className={`min-h-[92px] min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-left transition-all ${
                    stage.active
                      ? 'border-primary bg-primary/[0.08] shadow-sm'
                      : stage.reached
                        ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        : 'border-slate-200 bg-slate-50/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium tracking-[0.16em] text-slate-400">
                        {String(stage.index + 1).padStart(2, '0')}
                      </div>
                      <div className="mt-0.5 text-sm font-semibold text-foreground">{stage.label}</div>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${stageStatusClass(stage.status)}`}>
                      {stageStatusLabel(stage.status)}
                    </span>
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-500">
                    <span className="font-medium text-slate-700">{stage.metaPrimary}</span>
                    <span className="mx-1 text-slate-300">/</span>
                    <span>{stage.metaSecondary}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate">{stage.footerLeft}</span>
                    <span>{stage.footerRight}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {stage.reached ? '\u00A0' : '前序完成后开放'}
                  </div>
                </button>
                {index < stageCards.length - 1 && (
                  <div className="hidden w-4 shrink-0 items-center justify-center text-slate-300 md:flex">
                    <span className="text-sm">&#8594;</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Progress value={progressValue} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">{summaryTitle}</div>
              <p className="mt-0.5 text-sm leading-6 text-muted-foreground">{summaryText}</p>
            </div>
            <span className="rounded-full border border-primary/20 bg-primary/[0.06] px-2.5 py-1 text-xs text-primary">
              {summaryTag}
            </span>
          </div>

          {futureNotice}

          {guidanceText ? (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm text-slate-700">
              {guidanceText}
            </div>
          ) : null}

          {(contextBadges.length > 0 || statusBadge || helperText || actions.length > 0) ? (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  {contextBadges.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {contextBadges.map(badge => (
                        <span
                          key={badge.label}
                          className={`rounded-full border px-2.5 py-1 text-xs ${
                            badge.tone === 'primary'
                              ? 'border-primary/20 bg-primary/[0.06] text-primary'
                              : 'border-slate-200 bg-slate-50 text-slate-600'
                          }`}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {(statusBadge || helperText) ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {statusBadge ? (
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                      ) : null}
                      {helperText ? <span className="text-xs text-slate-500">{helperText}</span> : null}
                    </div>
                  ) : null}
                </div>
                {actions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {actions.map(action => (
                      <Button
                        key={action.label}
                        size="sm"
                        variant={action.variant === 'outline' ? 'outline' : 'default'}
                        onClick={action.onClick}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {nodeSection ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">{nodeSection.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{nodeSection.description}</div>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                  {nodeSection.badge}
                </span>
              </div>

              <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{nodeSection.railTitle}</div>
                    <div className="mt-1 text-[11px] text-slate-500">{nodeSection.railDescription}</div>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600">
                    {nodeSection.badge}
                  </span>
                </div>

                <div className="mt-2.5 overflow-x-auto pb-1">
                  <div className="flex min-w-max items-center gap-2.5">
                    {nodeSection.nodes.map((node, index) => (
                      <div key={node.id} className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={node.onClick}
                          className={`w-[282px] rounded-xl border bg-slate-50/30 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${
                            node.status === 'processing'
                              ? 'border-sky-300 shadow-sm'
                              : node.status === 'completed'
                                ? 'border-emerald-200'
                                : node.status === 'blocked'
                                  ? 'border-amber-200'
                                  : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[11px] font-medium text-slate-400">步骤 {index + 1}</div>
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${nodeStatusClass(node.status)}`}>
                              {nodeStatusLabel(node.status)}
                            </span>
                          </div>
                          <div className="mt-1.5 text-sm font-semibold text-foreground">{node.title}</div>
                          <div className="mt-1 line-clamp-1 text-xs leading-5 text-slate-600">{node.summary}</div>
                          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                            <span>{node.owner}</span>
                            <span>{node.updatedAt || '待处理'}</span>
                          </div>
                        </button>
                        {index < nodeSection.nodes.length - 1 ? (
                          <div className="flex h-full items-center px-0.5 text-slate-300">
                            <span className="text-base">&#8594;</span>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {nodeDetail ? (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-3">
              {nodeDetail}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
