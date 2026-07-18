import type { Order } from '../types';
import { normalizeInitiationFieldLabel } from './initiation-snapshot';

export function buildInitiationFormCsv(order: Order) {
  const sections = order.initiationForm?.sections || [];
  const lines: string[] = ['"分组","字段","值"'];

  for (const section of sections) {
    for (const field of section.fields) {
      lines.push(`"${section.title}","${normalizeInitiationFieldLabel(field.label)}","${field.displayValue.replace(/"/g, '""')}"`);
    }
  }

  return ['\ufeff' + lines[0], ...lines.slice(1)].join('\n');
}

export async function downloadInitiationFormExcel(order: Order) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IPE 交付门户';
  workbook.created = new Date();

  const formSheet = workbook.addWorksheet('发起表单');
  formSheet.addRow(['分组', '字段', '值']);
  for (const section of order.initiationForm?.sections || []) {
    for (const field of section.fields) {
      formSheet.addRow([section.title, normalizeInitiationFieldLabel(field.label), field.displayValue]);
    }
  }

  const attachmentSheet = workbook.addWorksheet('附件摘要');
  attachmentSheet.addRow(['附件类型', '文件名', '大小', '上传时间', '来源']);
  for (const attachment of order.initiationStageDetail?.attachments || order.attachments || []) {
    attachmentSheet.addRow([
      attachment.kind,
      attachment.name,
      attachment.sizeLabel,
      attachment.uploadedAt,
      attachment.source,
    ]);
  }

  const aiSheet = workbook.addWorksheet('AI分析摘要');
  aiSheet.addRow(['项目', '内容']);
  if (order.initiationStageDetail?.aiAnalysisSummary) {
    aiSheet.addRow(['AI摘要', order.initiationStageDetail.aiAnalysisSummary.summary]);
    aiSheet.addRow(['AI亮点', order.initiationStageDetail.aiAnalysisSummary.highlights.join('；')]);
    aiSheet.addRow(['缺失项', order.initiationStageDetail.aiAnalysisSummary.missingItems.join('；')]);
    aiSheet.addRow(['风险提示', order.initiationStageDetail.aiAnalysisSummary.riskHints.join('；')]);
  } else {
    aiSheet.addRow(['说明', '当前工单暂无 AI 分析摘要']);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${order.id}_发起表单.xlsx`;
  link.click();
}
