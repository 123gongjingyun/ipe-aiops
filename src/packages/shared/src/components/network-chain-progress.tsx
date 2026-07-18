import { useState } from 'react';
import { CheckCircle, Clock, Circle, Pencil } from 'lucide-react';
import type { NetworkChainNode } from '../types';

interface NetworkChainProgressProps {
  nodes: NetworkChainNode[];
  domain: string;
  onNodeClick?: (nodeId: string) => void;
  onNodeEdit?: (nodeId: string) => void;
  showActions?: boolean;
}

const STATUS_CONFIG = {
  completed: { borderColor: 'hsl(var(--success))', bgClass: 'bg-success/5', icon: CheckCircle, iconClass: 'text-success', arrowClass: 'text-success' },
  processing: { borderColor: 'hsl(var(--info))', bgClass: 'bg-info/5', icon: Clock, iconClass: 'text-info animate-pulse', arrowClass: 'text-muted-foreground/30' },
  pending: { borderColor: 'hsl(var(--muted-foreground) / 0.3)', bgClass: 'bg-muted/30', icon: Circle, iconClass: 'text-muted-foreground/30', arrowClass: 'text-muted-foreground/30' },
} as const;

export function NetworkChainProgress({ nodes, domain, onNodeClick, onNodeEdit, showActions = false }: NetworkChainProgressProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      {/* Chain label */}
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded font-medium">交付链路</span>
        <span className="text-xs text-muted-foreground">{domain}</span>
      </div>

      {/* Chain visualization */}
      <div className="bg-muted/30 border rounded-lg p-4 overflow-x-auto">
        <div className="flex items-center min-w-[900px]">
          {nodes.map((node, i) => {
            const cfg = STATUS_CONFIG[node.status] ?? STATUS_CONFIG.pending;
            const IconComp = cfg.icon;
            const isExpanded = expandedId === node.id;

            return (
              <div key={node.id} className="flex items-center">
                {/* Node box */}
                <div
                  className="w-[100px] min-w-[100px] h-[100px] rounded-lg border-2 p-2 text-center flex flex-col justify-center relative cursor-pointer transition-shadow hover:shadow-md"
                  style={{ borderColor: cfg.borderColor }}
                  onClick={() => {
                    setExpandedId(isExpanded ? null : node.id);
                    onNodeClick?.(node.id);
                  }}
                >
                  {/* Top-left: delivery mode */}
                  <div className="absolute top-0.5 left-1">
                    {node.deliveryMode === 'ai' ? (
                      <span className="bg-info text-info-foreground text-[8px] px-1 rounded leading-tight">AI</span>
                    ) : (
                      <span className="text-[11px]">👨‍💻</span>
                    )}
                  </div>
                  {/* Top-right: edit (completed only) */}
                  {node.status === 'completed' && showActions && onNodeEdit && (
                    <button
                      className="absolute top-0.5 right-1 text-muted-foreground hover:text-primary"
                      onClick={(e) => { e.stopPropagation(); onNodeEdit(node.id); }}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                  <IconComp className={`h-4 w-4 mx-auto mb-0.5 ${cfg.iconClass}`} />
                  <div className="text-xs font-semibold truncate">{node.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{node.label}</div>
                </div>

                {/* Arrow */}
                {i < nodes.length - 1 && (
                  <div className={`w-6 min-w-[24px] text-center text-sm ${nodes[i].status === 'completed' ? 'text-success' : 'text-muted-foreground/30'}`}>
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded node detail */}
      {expandedId && (() => {
        const node = nodes.find(n => n.id === expandedId);
        if (!node) return null;
        return (
          <div className="mt-3 border-2 rounded-lg p-3 bg-card" style={{ borderColor: (STATUS_CONFIG[node.status] ?? STATUS_CONFIG.pending).borderColor }}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                node.status === 'completed' ? 'bg-success/10 text-success' :
                node.status === 'processing' ? 'bg-info/10 text-info' :
                'bg-muted text-muted-foreground'
              }`}>
                {node.status === 'completed' ? '已完成' : node.status === 'processing' ? '处理中' : '等待中'}
              </span>
              <span className="text-sm font-semibold">{node.name}</span>
              <span className="text-xs text-muted-foreground">
                {node.deliveryMode === 'ai' ? 'AI 自动化' : '人工手动'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {Object.entries(node.config).map(([key, value]) => (
                <div key={key}><span className="text-muted-foreground">{key}：</span>{value}</div>
              ))}
            </div>
            {node.deliveryDetail?.assignee && (
              <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                交付人员：{node.deliveryDetail.assignee} · 预计完成 {node.deliveryDetail.estimatedTime}
              </div>
            )}
          </div>
        );
      })()}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-success/10 border border-success rounded-sm inline-block" /> 已完成</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-info/10 border border-info rounded-sm inline-block" /> 处理中</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-muted border border-muted-foreground/30 rounded-sm inline-block" /> 等待中</span>
        <span className="flex items-center gap-1"><span className="bg-info text-info-foreground text-[8px] px-1 rounded">AI</span> AI 自动化</span>
        <span className="flex items-center gap-1 text-xs">👨‍💻 人工手动</span>
        {showActions && <span className="flex items-center gap-1">✏️ 可编辑调整</span>}
      </div>
    </div>
  );
}
