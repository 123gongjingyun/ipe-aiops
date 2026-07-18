import type { Order } from '../types';

export function buildInitiationStageCsv(order: Order) {
  const stageDetail = order.initiationStageDetail;
  const lines: string[] = ['"模块","内容"'];

  if (!stageDetail) {
    lines.push('"说明","当前工单暂无发起阶段详情快照"');
    return ['\ufeff' + lines[0], ...lines.slice(1)].join('\n');
  }

  lines.push(`"输入模式","${stageDetail.inputMode}"`);
  lines.push(`"导出摘要","${stageDetail.exportSummary.replace(/"/g, '""')}"`);

  return ['\ufeff' + lines[0], ...lines.slice(1)].join('\n');
}

export async function downloadInitiationStageExcel(order: Order) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IPE 交付门户';
  workbook.created = new Date();

  const stageDetail = order.initiationStageDetail;

  const overviewSheet = workbook.addWorksheet('发起阶段总览');
  overviewSheet.addRow(['项目', '内容']);
  if (!stageDetail) {
    overviewSheet.addRow(['说明', '当前工单暂无发起阶段详情快照']);
  } else {
    overviewSheet.addRow(['输入模式', stageDetail.inputMode]);
    overviewSheet.addRow(['导出摘要', stageDetail.exportSummary]);
    overviewSheet.addRow(['评审关注点', stageDetail.reviewFocus.join('；')]);
  }

  const stepsSheet = workbook.addWorksheet('阶段步骤');
  stepsSheet.addRow(['步骤编码', '步骤名称', '状态', '摘要', '开始时间', '完成时间']);
  for (const step of stageDetail?.steps || []) {
    stepsSheet.addRow([
      step.stepCode,
      step.stepName,
      step.status,
      step.summary,
      step.enteredAt || '',
      step.completedAt || '',
    ]);
  }

  const riskSheet = workbook.addWorksheet('缺失项与风险');
  riskSheet.addRow(['类型', '内容']);
  for (const item of stageDetail?.missingItems || []) {
    riskSheet.addRow(['缺失项', item]);
  }
  for (const item of stageDetail?.riskHints || []) {
    riskSheet.addRow(['风险提示', item]);
  }
  if (stageDetail?.aiAnalysisSummary) {
    for (const item of stageDetail.aiAnalysisSummary.highlights) {
      riskSheet.addRow(['AI亮点', item]);
    }
  }

  const attachmentSheet = workbook.addWorksheet('附件');
  attachmentSheet.addRow(['附件类型', '文件名', '大小', '上传时间', '来源']);
  for (const attachment of stageDetail?.attachments || order.attachments || []) {
    attachmentSheet.addRow([
      attachment.kind,
      attachment.name,
      attachment.sizeLabel,
      attachment.uploadedAt,
      attachment.source,
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${order.id}_发起阶段详情.xlsx`;
  link.click();
}
