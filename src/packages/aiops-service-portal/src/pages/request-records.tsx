import { startTransition, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  deleteRequestRecord,
  markRequestRecordsExported,
  type RequestReviewExportValidationResult,
  useRequestRecords,
  validateRequestReviewExport,
} from '@aiops/shared';
import { ArrowRight, ChevronLeft, ChevronRight, Download, FileStack, FileText, Filter, PencilLine, RotateCcw, Trash2 } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [5, 10, 20];

type FilterField = 'id' | 'title' | 'channel' | 'stage' | 'environment' | 'owner';

const stageStyles: Record<string, string> = {
  草稿: 'bg-amber-50 text-amber-700 border border-amber-200',
  已导出待评审: 'bg-sky-50 text-sky-700 border border-sky-200',
  已转工单: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

const filterFieldOptions: { value: FilterField; label: string }[] = [
  { value: 'id', label: '申请单号' },
  { value: 'title', label: '申请名称' },
  { value: 'channel', label: '发起方式' },
  { value: 'stage', label: '阶段' },
  { value: 'environment', label: '环境' },
  { value: 'owner', label: '申请人' },
];

function exportRecords(records: Array<{
  id: string;
  title: string;
  channel: string;
  stage: string;
  environment: string;
  owner: string;
  updatedAt: string;
  summary: string;
}>, filename: string) {
  const header = ['申请单号', '申请名称', '发起方式', '阶段', '环境', '申请人', '最近更新时间', '摘要'];
  const rows = records.map(record => [
    record.id,
    record.title,
    record.channel,
    record.stage,
    record.environment,
    record.owner,
    record.updatedAt,
    record.summary,
  ]);

  const csv = [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function RequestRecords() {
  const navigate = useNavigate();
  const { records } = useRequestRecords();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draftFilterField, setDraftFilterField] = useState<FilterField>('title');
  const [draftFilterKeyword, setDraftFilterKeyword] = useState('');
  const [appliedFilterField, setAppliedFilterField] = useState<FilterField>('title');
  const [appliedFilterKeyword, setAppliedFilterKeyword] = useState('');
  const [summaryRecordId, setSummaryRecordId] = useState<string | null>(null);
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<RequestReviewExportValidationResult | null>(null);

  const filteredRecords = useMemo(() => {
    const keyword = appliedFilterKeyword.trim().toLowerCase();
    if (!keyword) return records;
    return records.filter(record => String(record[appliedFilterField]).toLowerCase().includes(keyword));
  }, [appliedFilterField, appliedFilterKeyword, records]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRecords = useMemo(() => {
    return filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [currentPage, filteredRecords, pageSize]);

  const currentPageIds = pagedRecords.map(record => record.id);
  const selectedRecords = filteredRecords.filter(record => selectedIds.includes(record.id));
  const summaryRecord = records.find(record => record.id === summaryRecordId) || null;
  const deleteRecord = records.find(record => record.id === deleteRecordId) || null;
  const allCurrentPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.includes(id));
  const someCurrentPageSelected = currentPageIds.some(id => selectedIds.includes(id));

  const handleToggleRecord = (id: string, checked: boolean) => {
    setSelectedIds(current =>
      checked ? Array.from(new Set([...current, id])) : current.filter(item => item !== id),
    );
  };

  const handleToggleCurrentPage = (checked: boolean) => {
    setSelectedIds(current => {
      if (checked) return Array.from(new Set([...current, ...currentPageIds]));
      return current.filter(id => !currentPageIds.includes(id));
    });
  };

  const handleApplyFilter = () => {
    setAppliedFilterField(draftFilterField);
    setAppliedFilterKeyword(draftFilterKeyword);
    setPage(1);
  };

  const handleResetFilter = () => {
    setDraftFilterField('title');
    setDraftFilterKeyword('');
    setAppliedFilterField('title');
    setAppliedFilterKeyword('');
    setPage(1);
  };

  const handleExportFiltered = () => {
    exportRecords(filteredRecords, `资源申请单_筛选结果_${new Date().toLocaleDateString('zh-CN')}.csv`);
    markRequestRecordsExported(filteredRecords.map(record => record.id));
  };

  const handleExportSelected = () => {
    if (selectedRecords.length === 0) return;
    exportRecords(selectedRecords, `资源申请单_批量导出_${new Date().toLocaleDateString('zh-CN')}.csv`);
    markRequestRecordsExported(selectedRecords.map(record => record.id));
  };

  const handleExportSingle = (id: string) => {
    const record = records.find(item => item.id === id);
    if (!record) return;
    const validation = validateRequestReviewExport(record);
    if (!validation.ready) {
      setValidationResult(validation);
      return;
    }
    void (async () => {
      const { downloadRequestReviewExcel } = await import('@aiops/shared');
      await downloadRequestReviewExcel(record);
      markRequestRecordsExported([id]);
    })();
  };

  const handleOpenReview = (id: string) => {
    startTransition(() => {
      navigate(`/request-review-export/${id}`);
    });
  };

  const handleDeleteRecord = () => {
    if (!deleteRecordId) return;
    deleteRequestRecord(deleteRecordId);
    setSelectedIds(current => current.filter(id => id !== deleteRecordId));
    setDeleteRecordId(null);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#dbe4f0] bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_42%,#f5f8fc_100%)] p-5 shadow-[0_24px_54px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
              <FileStack className="h-3.5 w-3.5" />
              发起前材料记录
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">查看与导出申请材料记录</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              这里聚焦资源申请材料本身，支持分页查看、字段筛选、勾选导出和回溯摘要，先把申请单材料整理完整。
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm">
            <p className="max-w-[220px] text-xs leading-5 text-slate-500">
              当前先聚焦申请材料整理与导出。
            </p>
            <Link
              to="/orders"
              className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 transition-colors hover:border-slate-300 hover:bg-white"
            >
              正式工单入口
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[22px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
            <div className="text-sm text-slate-500">申请单总数</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{filteredRecords.length}</div>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
            <div className="text-sm text-slate-500">当前已选</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{selectedIds.length}</div>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
            <div className="text-sm text-slate-500">已导出待评审</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">
              {records.filter(item => item.stage === '已导出待评审').length}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-lg font-semibold text-slate-900">申请单列表</div>
            <p className="mt-1 text-sm text-slate-500">草稿可继续编辑；已导出待评审记录建议基于原单复制再发起，避免覆盖已经用于评审的版本。</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              to="/common-requests"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <PencilLine className="h-4 w-4" />
              新建申请材料
            </Link>
            <Button variant="outline" size="sm" onClick={handleExportFiltered} disabled={filteredRecords.length === 0}>
              <Download className="mr-1.5 h-4 w-4" />
              导出筛选结果
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportSelected} disabled={selectedRecords.length === 0}>
              <Download className="mr-1.5 h-4 w-4" />
              批量导出
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <label className="inline-flex items-center gap-2">
              <Checkbox
                checked={allCurrentPageSelected}
                onCheckedChange={checked => handleToggleCurrentPage(checked === true)}
                aria-checked={allCurrentPageSelected ? 'true' : someCurrentPageSelected ? 'mixed' : 'false'}
              />
              <span>全选当前页</span>
            </label>
            <span className="text-slate-400">已选 {selectedIds.length} 条</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={draftFilterField}
                onChange={event => setDraftFilterField(event.target.value as FilterField)}
                className="h-7 rounded-md bg-transparent text-sm text-slate-700 outline-none"
              >
                {filterFieldOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <input
                value={draftFilterKeyword}
                onChange={event => setDraftFilterKeyword(event.target.value)}
                placeholder="输入筛选值"
                className="h-7 min-w-[180px] bg-transparent text-sm text-slate-700 outline-none"
              />
              <button
                type="button"
                onClick={handleApplyFilter}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                筛选
              </button>
              <button
                type="button"
                onClick={handleResetFilter}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="inline-flex items-center gap-1">
                  <RotateCcw className="h-3.5 w-3.5" />
                  重置
                </span>
              </button>
            </div>
            <span>每页</span>
            <select
              value={pageSize}
              onChange={event => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm"
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span>条</span>
          </div>
        </div>

        {pagedRecords.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-500">当前筛选条件下没有可显示的申请单记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1420px] w-full table-fixed">
              <colgroup>
                <col className="w-[56px]" />
                <col className="w-[72px]" />
                <col className="w-[360px]" />
                <col className="w-[120px]" />
                <col className="w-[140px]" />
                <col className="w-[96px]" />
                <col className="w-[96px]" />
                <col className="w-[168px]" />
                <col className="w-[300px]" />
              </colgroup>
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-xs font-medium tracking-wide text-slate-500">
                  <th className="px-4 py-3 text-center">
                    <Checkbox
                      checked={allCurrentPageSelected}
                      onCheckedChange={checked => handleToggleCurrentPage(checked === true)}
                      aria-checked={allCurrentPageSelected ? 'true' : someCurrentPageSelected ? 'mixed' : 'false'}
                    />
                  </th>
                  <th className="px-4 py-3 text-left">序号</th>
                  <th className="px-4 py-3 text-left">申请单信息</th>
                  <th className="px-4 py-3 text-left">发起方式</th>
                  <th className="px-4 py-3 text-left">阶段</th>
                  <th className="px-4 py-3 text-left">环境</th>
                  <th className="px-4 py-3 text-left">申请人</th>
                  <th className="px-4 py-3 text-left">最近更新时间</th>
                  <th className="px-4 py-3 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {pagedRecords.map((record, index) => {
                  const serialNumber = (currentPage - 1) * pageSize + index + 1;
                  const checked = selectedIds.includes(record.id);

                  return (
                    <tr key={record.id} className="border-b border-slate-200 align-top text-sm last:border-b-0">
                      <td className="px-4 py-4 text-center">
                        <Checkbox checked={checked} onCheckedChange={value => handleToggleRecord(record.id, value === true)} />
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-700">{serialNumber}</td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">{record.title}</div>
                        <div className="mt-1 text-xs text-slate-500">申请单号：{record.id}</div>
                        <p className="mt-2 text-xs leading-5 text-slate-500">{record.summary}</p>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{record.channel}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${stageStyles[record.stage]}`}>{record.stage}</span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{record.environment}</td>
                      <td className="px-4 py-4 text-slate-600">{record.owner}</td>
                      <td className="px-4 py-4 text-slate-500">{record.updatedAt}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSummaryRecordId(record.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            查看摘要
                          </button>
                          {record.stage === '草稿' && (
                            <button
                              type="button"
                              onClick={() => navigate(`/${record.mode === 'direct' ? 'direct-workbench' : 'guided-workbench'}?product=${record.product}&action=edit&sourceId=${record.id}`)}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                            >
                              <PencilLine className="h-3.5 w-3.5" />
                              继续编辑
                            </button>
                          )}
                          {record.stage === '已导出待评审' && (
                            <button
                              type="button"
                              onClick={() => navigate(`/${record.mode === 'direct' ? 'direct-workbench' : 'guided-workbench'}?product=${record.product}&action=clone&sourceId=${record.id}`)}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                            >
                              <PencilLine className="h-3.5 w-3.5" />
                              基于此再发起
                            </button>
                          )}
                          {record.stage !== '已转工单' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenReview(record.id)}
                                className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 transition-colors hover:border-sky-300 hover:bg-sky-100"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                评审预览
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportSingle(record.id)}
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                              >
                                <Download className="h-3.5 w-3.5" />
                                导出 Excel
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteRecordId(record.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-500">
            第 {currentPage} / {totalPages} 页，共 {filteredRecords.length} 条
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(value => Math.max(1, value - 1))} disabled={currentPage <= 1}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              上一页
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(value => Math.min(totalPages, value + 1))} disabled={currentPage >= totalPages}>
              下一页
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <Dialog open={Boolean(summaryRecord)} onOpenChange={open => { if (!open) setSummaryRecordId(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>申请单摘要</DialogTitle>
          </DialogHeader>
          {summaryRecord && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                <div className="text-lg font-semibold text-slate-900">{summaryRecord.title}</div>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                  <span>申请单号：{summaryRecord.id}</span>
                  <span>阶段：{summaryRecord.stage}</span>
                  <span>环境：{summaryRecord.environment}</span>
                  <span>申请人：{summaryRecord.owner}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{summaryRecord.summary}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">基础信息</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <div>系统名称：{summaryRecord.draft.systemName || '未填写'}</div>
                    <div>应用名称：{summaryRecord.draft.applicationName || '未填写'}</div>
                    <div>使用对象：{summaryRecord.draft.userType || '未填写'}</div>
                    <div>应用形态：{summaryRecord.draft.appType || '未填写'}</div>
                    <div>访问终端：{summaryRecord.draft.clientType || '未填写'}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">网络与资源</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <div>访问与网络：{summaryRecord.draft.accessScope || '未填写'}</div>
                    <div>资源诉求：{summaryRecord.draft.resourceNeed || '未填写'}</div>
                    <div>SLA / 安全 / 容灾：{summaryRecord.draft.slaRequirement || '未填写'}</div>
                    <div>架构材料说明：{summaryRecord.draft.architectureNote || '未填写'}</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">业务目标</div>
                  <div className="mt-3 text-sm leading-6 text-slate-700">{summaryRecord.draft.businessGoal || '未填写'}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">对接系统</div>
                  <div className="mt-3 text-sm leading-6 text-slate-700">{summaryRecord.draft.integrationSystems || '未填写'}</div>
                </div>
              </div>
            </div>
          )}
      </DialogContent>
      </Dialog>

      <Dialog open={Boolean(validationResult)} onOpenChange={open => { if (!open) setValidationResult(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>当前申请材料未完成，暂不可导出正式评审材料</DialogTitle>
            <DialogDescription>
              记录可以继续预览和编辑；请先补齐以下阻断项后，再导出 Excel。
            </DialogDescription>
          </DialogHeader>
          {validationResult && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
                <div className="text-sm font-semibold text-rose-800">阻断项</div>
                <div className="mt-3 space-y-2">
                  {validationResult.blockingIssues.map(issue => (
                    <div key={`${issue.level}-${issue.key}`} className="rounded-xl bg-white px-3 py-2 text-sm text-rose-700">
                      {issue.reason}
                    </div>
                  ))}
                </div>
              </div>
              {validationResult.warningIssues.length > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                  <div className="text-sm font-semibold text-amber-800">建议补充项</div>
                  <div className="mt-3 space-y-2">
                    {validationResult.warningIssues.map(issue => (
                      <div key={`${issue.level}-${issue.key}`} className="rounded-xl bg-white px-3 py-2 text-sm text-amber-700">
                        {issue.reason}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteRecord)} onOpenChange={open => { if (!open) setDeleteRecordId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除申请单</DialogTitle>
          </DialogHeader>
          {deleteRecord && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-800">
                申请单 <span className="font-semibold">{deleteRecord.id}</span> 删除后不可恢复。该记录的摘要、筛选结果和导出入口都会一起移除。
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <div className="text-sm font-semibold text-slate-900">{deleteRecord.title}</div>
                <div className="mt-2 text-xs text-slate-500">阶段：{deleteRecord.stage} · 环境：{deleteRecord.environment} · 申请人：{deleteRecord.owner}</div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteRecordId(null)}>取消</Button>
                <Button variant="destructive" onClick={handleDeleteRecord}>确认删除</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
