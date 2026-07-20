import { buildRequestReviewExportModel } from './request-review-export-model';
import type {
  RequestReviewExportField,
  RequestReviewExportSection,
} from './request-review-export-model';
import type { RequestRecord } from '../store/request-records';
import { validateRequestReviewExport } from './request-review-export-validation';

function autoFitColumns(worksheet: import('exceljs').Worksheet) {
  worksheet.columns.forEach(column => {
    let maxLength = 12;
    if (column.header) {
      maxLength = Math.max(maxLength, String(column.header).length);
    }
    column.eachCell?.({ includeEmpty: false }, cell => {
      const text = cell.value === null || cell.value === undefined ? '' : String(cell.value);
      maxLength = Math.max(maxLength, text.length);
    });
    column.width = Math.min(80, maxLength + 4);
  });
}

function styleHeaderRow(row: import('exceljs').Row) {
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF315A8B' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD4DDEA' } },
      bottom: { style: 'thin', color: { argb: 'FFD4DDEA' } },
      left: { style: 'thin', color: { argb: 'FFD4DDEA' } },
      right: { style: 'thin', color: { argb: 'FFD4DDEA' } },
    };
  });
}

function styleDataRow(row: import('exceljs').Row) {
  row.eachCell(cell => {
    cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE7EAF0' } },
      bottom: { style: 'thin', color: { argb: 'FFE7EAF0' } },
      left: { style: 'thin', color: { argb: 'FFE7EAF0' } },
      right: { style: 'thin', color: { argb: 'FFE7EAF0' } },
    };
  });
}

function appendSectionRows(
  worksheet: import('exceljs').Worksheet,
  fields: RequestReviewExportField[],
) {
  const headerRow = worksheet.addRow(['字段', '内容', '说明']);
  styleHeaderRow(headerRow);

  for (const field of fields) {
    const row = worksheet.addRow([
      field.label,
      field.value || field.placeholder,
      field.empty ? '当前为空，导出时按占位提示保留' : '',
    ]);
    styleDataRow(row);
    if (field.highlight === 'pink') {
      row.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFE1EA' },
      };
      row.getCell(2).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF1F5' },
      };
    }
  }

  autoFitColumns(worksheet);
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
}

function buildSectionSheet(
  workbook: import('exceljs').Workbook,
  section: RequestReviewExportSection,
) {
  const worksheet = workbook.addWorksheet(section.title);
  if (section.hints && section.hints.length > 0) {
    worksheet.addRow(['填写规则']);
    for (const hint of section.hints) {
      const row = worksheet.addRow([hint]);
      row.getCell(1).alignment = { wrapText: true, vertical: 'top' };
    }
    worksheet.addRow([]);
  }
  appendSectionRows(worksheet, section.fields);
  return worksheet;
}

export async function downloadRequestReviewExcel(record: RequestRecord) {
  const validation = validateRequestReviewExport(record);
  if (!validation.ready) {
    throw new Error('当前申请材料未完成，暂不可导出正式评审材料');
  }

  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IPE 交付门户';
  workbook.created = new Date();

  const model = buildRequestReviewExportModel(record);

  buildSectionSheet(workbook, model.userRequirementsSection);
  buildSectionSheet(workbook, model.applicationInfoSection);
  buildSectionSheet(workbook, model.reviewSummaryOverviewSection);
  buildSectionSheet(workbook, model.approvalNoteSection);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `资源申请单_${record.id}_评审材料.xlsx`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function downloadRequestReviewPdf(record: RequestRecord, target: HTMLElement) {
  const validation = validateRequestReviewExport(record);
  if (!validation.ready) {
    throw new Error('当前申请材料未完成，暂不可导出正式评审材料');
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(target, {
    scale: Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1.5),
    useCORS: true,
    backgroundColor: '#ffffff',
    scrollX: 0,
    scrollY: typeof window !== 'undefined' ? -window.scrollY : 0,
    windowWidth: target.scrollWidth,
    windowHeight: target.scrollHeight,
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;
  const pageCanvasHeight = Math.max(1, Math.floor((contentHeight / contentWidth) * canvas.width));

  let sourceY = 0;
  let pageIndex = 0;

  while (sourceY < canvas.height) {
    const sliceHeight = Math.min(pageCanvasHeight, canvas.height - sourceY);
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;
    const pageContext = pageCanvas.getContext('2d');
    if (!pageContext) {
      throw new Error('PDF 页面生成失败');
    }
    pageContext.fillStyle = '#ffffff';
    pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    pageContext.drawImage(
      canvas,
      0,
      sourceY,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight,
    );

    const pageImageHeight = (sliceHeight * contentWidth) / canvas.width;
    const imageData = pageCanvas.toDataURL('image/png');

    if (pageIndex > 0) {
      pdf.addPage();
    }
    pdf.addImage(imageData, 'PNG', margin, margin, contentWidth, pageImageHeight, undefined, 'FAST');
    sourceY += sliceHeight;
    pageIndex += 1;
  }

  pdf.save(`资源申请单_${record.id}_评审材料.pdf`);
}
