import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import type { DeliveredAsset } from '@aiops/shared';

function getAssetStatusLabel(status: DeliveredAsset['status']) {
  switch (status) {
    case 'pending_acceptance':
      return '待验收';
    case 'accepted':
      return '已验收';
    case 'archived':
      return '已归档';
    default:
      return status;
  }
}

function getAssetStatusClassName(status: DeliveredAsset['status']) {
  switch (status) {
    case 'pending_acceptance':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'accepted':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'archived':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function getHighlightFields(asset: DeliveredAsset): string[] {
  const meta = asset.assetMeta;
  switch (asset.category) {
    case 'vm': return [meta['CPU'], meta['内存'], meta['IP']].filter(Boolean);
    case 'database': return [meta['主机'], meta['端口'], meta['实例名']].filter(Boolean);
    case 'paas': return [meta['集群名'], meta['命名空间'], meta['节点数']].filter(Boolean);
    case 'network': return [meta['VIP'], meta['协议'], meta['端口']].filter(Boolean);
    case 'middleware': return [meta['URL'], meta['协议'], meta['端口']].filter(Boolean);
    case 'monitor': return [meta['Grafana地址'], meta['目标数'], meta['告警规则数']].filter(Boolean);
    case 'security': return [meta['WAF状态'], meta['风险等级'], meta['SSL域名']].filter(Boolean);
    case 'backup': return [meta['备份策略'], meta['最近备份'], meta['备份状态']].filter(Boolean);
    case 'logging': return [meta['Agent名称'], meta['Agent状态'], meta['ES节点数']].filter(Boolean);
    default: return Object.values(meta).slice(0, 3);
  }
}

interface DeliveredAssetsTableProps {
  assets: DeliveredAsset[];
  emptyText?: string;
}

export function DeliveredAssetsTable({
  assets,
  emptyText = '该工单暂无分配资产记录',
}: DeliveredAssetsTableProps) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = async (key: string, value: string) => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey(current => (current === key ? null : current));
      }, 1500);
    } catch {
      setCopiedKey(null);
    }
  };

  if (assets.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">{emptyText}</p>;
  }

  return (
    <div className="overflow-x-auto border rounded-md">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground">序号</th>
            <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground">资产分类</th>
            <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground">资产名称</th>
            <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground">资产状态</th>
            <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground">服务</th>
            <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground">关键字段</th>
            <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground">明细</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {assets.map((asset, index) => {
            const expanded = expandedIds[asset.id] ?? false;
            const metaEntries = Object.entries(asset.assetMeta).filter(([, value]) => value && String(value).trim());

            return (
              <>
                <tr key={asset.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2 text-xs text-muted-foreground font-mono">{index + 1}</td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 text-xs rounded bg-primary/10 text-primary">{asset.categoryLabel}</span>
                  </td>
                  <td className="px-3 py-2 text-sm font-medium">{asset.assetName}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${getAssetStatusClassName(asset.status)}`}>
                      {getAssetStatusLabel(asset.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{asset.serviceName}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{getHighlightFields(asset).join(' · ') || '-'}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setExpandedIds(prev => ({ ...prev, [asset.id]: !expanded }))}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                    >
                      {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {expanded ? '收起' : '展开'}
                    </button>
                  </td>
                </tr>
                {expanded && (
                  <tr key={`${asset.id}-detail`} className="bg-muted/10">
                    <td colSpan={7} className="px-3 py-3">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {metaEntries.map(([key, value]) => (
                          <div key={`${asset.id}-${key}`} className="rounded-md border border-border bg-white px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-[11px] font-medium text-muted-foreground">{key}</div>
                              <button
                                type="button"
                                onClick={() => copyText(`${asset.id}-${key}`, value)}
                                className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
                              >
                                {copiedKey === `${asset.id}-${key}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                {copiedKey === `${asset.id}-${key}` ? '已复制' : '复制'}
                              </button>
                            </div>
                            <div className="mt-1 text-sm text-foreground break-all">{value}</div>
                          </div>
                        ))}
                      </div>
                      {asset.assetDetail && (
                        <div className="mt-3 rounded-md border border-dashed border-slate-200 bg-white px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[11px] font-medium text-muted-foreground">补充详情</div>
                            <button
                              type="button"
                              onClick={() => copyText(`${asset.id}-detail`, asset.assetDetail || '')}
                              className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
                            >
                              {copiedKey === `${asset.id}-detail` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              {copiedKey === `${asset.id}-detail` ? '已复制' : '复制'}
                            </button>
                          </div>
                          <div className="mt-1 text-xs leading-6 text-slate-700 break-all">{asset.assetDetail}</div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export { getHighlightFields };
