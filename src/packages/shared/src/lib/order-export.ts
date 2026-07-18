import type { Order } from '../types';
import type ExcelJS from 'exceljs';
import { getSpec, getComboSpecs } from '../store/service-specs';
import { buildWorkflowTimelineSlaSummary, buildWorkflowTimelineDurationSummary } from './workflow-timeline';

const DOMAIN_LABELS: Record<string, string> = {
  compute: '计算资源申请',
  database: '数据库申请',
  middleware: '中间件申请',
  network: '网络申请',
  paas: 'PaaS 申请',
  security: '安全合规申请',
  dc: '机房设施申请',
  other: '其他申请',
};

const STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  reviewing: '评审中',
  processing: '处理中',
  plan_confirming: '待确认方案',
  delivering: '交付中',
  completed: '待验收',
  confirmed: '已验收',
  archived: '已归档',
};

const FIXED_HEADERS = [
  '工单编号',
  '服务组合',
  '当前状态',
  '服务数量',
  '服务清单',
  '创建时间',
  '节点SLA摘要',
  '节点耗时摘要',
];

function getSheetKeyForOrder(order: Order): string {
  // Combo orders get their own sheet named after the combo
  const comboSpec = getComboSpecs().find(spec => spec.id === order.comboId);
  if (comboSpec) {
    return comboSpec.name;
  }

  // Atomic orders grouped by domain
  const spec = getSpec(order.sourceSpecId || order.comboId);
  if (spec?.type === 'atomic' && spec.domain) {
    return DOMAIN_LABELS[spec.domain] ?? spec.domain;
  }

  // Try to infer domain from the first service
  for (const serviceName of order.services ?? []) {
    const serviceSpec = getSpec(serviceName);
    if (serviceSpec?.type === 'atomic' && serviceSpec.domain) {
      return DOMAIN_LABELS[serviceSpec.domain] ?? serviceSpec.domain;
    }
  }

  return DOMAIN_LABELS.other;
}

export function groupOrdersBySheet(orders: Order[]): Record<string, Order[]> {
  const groups: Record<string, Order[]> = {};
  for (const order of orders) {
    const key = getSheetKeyForOrder(order);
    if (!groups[key]) groups[key] = [];
    groups[key].push(order);
  }
  return groups;
}

function buildFixedRow(order: Order): (string | number | undefined)[] {
  return [
    order.id,
    order.comboName,
    STATUS_LABELS[order.status] ?? order.status,
    order.services.length,
    order.services.join(' / '),
    order.createdAt,
    buildWorkflowTimelineSlaSummary(order.workflowTimeline ?? []),
    buildWorkflowTimelineDurationSummary(order.workflowTimeline ?? []),
  ];
}

function collectDynamicKeys(orders: Order[]): { answerKeys: string[]; extraKeys: string[] } {
  const answerKeysSet = new Set<string>();
  const extraKeysSet = new Set<string>();

  for (const order of orders) {
    if (order.answers) {
      Object.keys(order.answers).forEach(key => answerKeysSet.add(key));
    }
    if (order.extras) {
      Object.keys(order.extras).forEach(key => extraKeysSet.add(key));
    }
  }

  return {
    answerKeys: Array.from(answerKeysSet),
    extraKeys: Array.from(extraKeysSet),
  };
}

function buildDynamicRow(
  order: Order,
  answerKeys: string[],
  extraKeys: string[],
): (string | number | undefined)[] {
  const answerValues = answerKeys.map(key => order.answers?.[key] ?? '');
  const extraValues = extraKeys.map(key => {
    const value = order.extras?.[key];
    return value === true ? '是' : value === false ? '否' : value ?? '';
  });
  return [...answerValues, ...extraValues];
}

function formatCell(value: unknown): string | number | undefined {
  if (value === undefined || value === null) return '';
  if (typeof value === 'boolean') return value ? '是' : '否';
  return typeof value === 'number' ? value : String(value);
}

function buildSheetData(sheetName: string, orders: Order[]) {
  const { answerKeys, extraKeys } = collectDynamicKeys(orders);

  const dynamicHeaders = [
    ...answerKeys.map(key => `配置_${key}`),
    ...extraKeys.map(key => `附加_${key}`),
  ];

  const headers = [...FIXED_HEADERS, ...dynamicHeaders];

  const rows = orders.map(order => [
    ...buildFixedRow(order),
    ...buildDynamicRow(order, answerKeys, extraKeys),
  ]);

  return { name: sheetName, headers, rows };
}

function autoFitColumns(worksheet: ExcelJS.Worksheet) {
  worksheet.columns.forEach(column => {
    let maxLength = 10;
    if (column.header) {
      maxLength = Math.max(maxLength, String(column.header).length);
    }
    column.eachCell?.({ includeEmpty: false }, cell => {
      const cellValue = cell.value;
      const text = cellValue === null || cellValue === undefined ? '' : String(cellValue);
      maxLength = Math.max(maxLength, text.length);
    });
    column.width = Math.min(60, maxLength + 4);
  });
}

export async function downloadOrdersExcel({
  orders,
  filename,
  dashboardUrl,
}: {
  orders: Order[];
  filename?: string;
  dashboardUrl?: string;
}) {
  const ExcelJS = await import('exceljs');
  const groups = groupOrdersBySheet(orders);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'IPE 交付门户';
  workbook.created = new Date();

  const domainOrder = [
    '计算资源申请',
    '数据库申请',
    '中间件申请',
    '网络申请',
    'PaaS 申请',
    '安全合规申请',
    '机房设施申请',
    '其他申请',
  ];
  const sheetNames = Object.keys(groups).sort((a, b) => {
    const indexA = domainOrder.indexOf(a);
    const indexB = domainOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  for (const sheetName of sheetNames) {
    const { headers, rows } = buildSheetData(sheetName, groups[sheetName]);
    const worksheet = workbook.addWorksheet(sheetName);

    // Dashboard link row
    if (dashboardUrl) {
      worksheet.addRow(['数据来自 IPE 交付门户：', dashboardUrl]);
      worksheet.mergeCells(1, 2, 1, headers.length);
      const linkCell = worksheet.getCell(1, 2);
      linkCell.value = {
        text: dashboardUrl,
        hyperlink: dashboardUrl,
      } as ExcelJS.CellHyperlinkValue;
      linkCell.font = { color: { argb: 'FF0563C1' }, underline: true };
      worksheet.getCell(1, 1).font = { bold: true };
    }

    // Header row
    const headerRowIndex = dashboardUrl ? 2 : 1;
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD9E2F3' } },
        bottom: { style: 'thin', color: { argb: 'FFD9E2F3' } },
        left: { style: 'thin', color: { argb: 'FFD9E2F3' } },
        right: { style: 'thin', color: { argb: 'FFD9E2F3' } },
      };
    });

    // Data rows
    for (const row of rows) {
      const dataRow = worksheet.addRow(row.map(formatCell));
      dataRow.eachCell(cell => {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE7E6E6' } },
          bottom: { style: 'thin', color: { argb: 'FFE7E6E6' } },
          left: { style: 'thin', color: { argb: 'FFE7E6E6' } },
          right: { style: 'thin', color: { argb: 'FFE7E6E6' } },
        };
      });
    }

    // Auto-fit column widths
    autoFitColumns(worksheet);

    // Freeze header row
    worksheet.views = [{ state: 'frozen', ySplit: headerRowIndex }];
  }

  const finalFilename = filename ?? `我的申请_${new Date().toLocaleDateString('zh-CN')}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = finalFilename;
  link.click();
}
