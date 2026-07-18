// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import type { Order } from '../types';
import type { DeliveryDetail } from '../types';
import { buildInitiationFormCsv, downloadInitiationFormExcel } from './initiation-form-export';
import { buildInitiationStageCsv, downloadInitiationStageExcel } from './initiation-stage-export';
import { downloadDeliveryConfigExcel } from './delivery-export';

const addWorksheetMock = vi.fn();
const writeBufferMock = vi.fn(async () => new ArrayBuffer(8));

vi.mock('exceljs', () => {
  class Workbook {
    creator?: string;
    created?: Date;
    xlsx = {
      writeBuffer: writeBufferMock,
    };
    addWorksheet = addWorksheetMock;
  }

  return {
    Workbook,
  };
});

function buildOrder(): Order {
  return {
    id: 'ORD-TEST-001',
    comboId: 'cloud-vm-private',
    comboName: '云服务器开通（私有云）',
    services: ['云服务器开通（私有云）'],
    aiConfig: 'test',
    orchestratedPlan: {
      summary: 'test',
      estimatedTime: '1-2 工作日',
      resources: [],
      integrations: [],
    },
    answers: {},
    extras: {},
    serviceProgress: [],
    status: 'pending',
    createdAt: '2026-06-23 12:00:00',
    initiationForm: {
      schemaVersion: '1.0.0',
      submittedAt: '2026-06-23 12:00:00',
      workflowMode: 'atomic_service',
      sections: [
        {
          id: 'base_info',
          title: '基础信息',
          fields: [
            {
              key: 'systemCode',
              label: '所属系统',
              value: 'S-56',
              displayValue: 'S-56',
              group: 'base_info',
              required: true,
              source: 'user_input',
            },
            {
              key: 'environment',
              label: '所属环境',
              value: 'SIT',
              displayValue: 'SIT',
              group: 'base_info',
              required: true,
              source: 'user_input',
            },
            {
              key: 'bucketName',
              label: 'Bucket名称',
              value: 'gtmc-test-backup-service',
              displayValue: 'gtmc-test-backup-service',
              group: 'resource_spec',
              required: true,
              source: 'user_input',
            },
          ],
        },
      ],
    },
    attachments: [
      {
        id: 'att-1',
        kind: 'architecture',
        name: 'topology.png',
        fileType: 'png',
        sizeLabel: '128 KB',
        uploadedAt: '2026-06-23 12:01:00',
        source: 'user-upload',
        parseStatus: 'parsed',
      },
    ],
    initiationStageDetail: {
      inputMode: 'architecture_first',
      attachments: [
        {
          id: 'att-1',
          kind: 'architecture',
          name: 'topology.png',
          fileType: 'png',
          sizeLabel: '128 KB',
          uploadedAt: '2026-06-23 12:01:00',
          source: 'user-upload',
          parseStatus: 'parsed',
        },
      ],
      aiAnalysisSummary: {
        mode: 'architecture_first',
        summary: '已识别核心拓扑与存储诉求',
        highlights: ['识别到对象存储容量需求'],
        missingItems: ['缺少保留周期'],
        riskHints: ['生产环境需确认审计要求'],
      },
      missingItems: ['缺少保留周期'],
      riskHints: ['生产环境需确认审计要求'],
      reviewFocus: ['确认桶命名规范', '确认容量与使用时间'],
      steps: [
        {
          stepCode: 'input',
          stepName: '申请表单填写',
          status: 'completed',
          summary: '已完成发起表单填写',
          enteredAt: '2026-06-23 12:00:00',
          completedAt: '2026-06-23 12:03:00',
        },
      ],
      exportSummary: '发起时间：2026-06-23 12:00:00\n输入模式：architecture_first',
    },
  };
}

function buildDeliveryOrder(): Order {
  const deliveryDetail: DeliveryDetail = {
    type: 'db',
    asset: {
      assetId: 'DB-001',
      instance: 'mysql-prod-01',
    },
    connection: {
      host: '10.0.0.11',
      port: 3306,
      schema: 'orders',
      charset: 'utf8mb4',
    },
    ha: {
      mode: '主从',
      primary: 'db-a',
      secondary: 'db-b',
    },
    accounts: [
      { name: 'order_app', privilege: 'readwrite' },
    ],
    integrations: {
      pam: { status: 'active' },
      monitor: { status: 'active' },
      logging: { status: 'active' },
      backup: { status: 'active' },
      security: { status: 'active' },
    },
  };

  return {
    ...buildOrder(),
    status: 'completed',
    serviceProgress: [
      {
        name: 'MySQL部署',
        status: 'completed',
        deliveryDetail,
      },
    ],
  };
}

describe('initiation export label normalization', () => {
  const createElementOriginal = document.createElement.bind(document);
  const createObjectUrlOriginal = URL.createObjectURL;
  const revokeObjectUrlOriginal = URL.revokeObjectURL;

  beforeEach(() => {
    addWorksheetMock.mockReset();
    writeBufferMock.mockClear();
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = createObjectUrlOriginal;
    URL.revokeObjectURL = revokeObjectUrlOriginal;
    document.createElement = createElementOriginal;
    vi.restoreAllMocks();
  });

  it('normalizes aliases in form csv export', () => {
    const csv = buildInitiationFormCsv(buildOrder());

    expect(csv).toContain('"基础信息","系统编号","S-56"');
    expect(csv).toContain('"基础信息","环境","SIT"');
    expect(csv).toContain('"基础信息","桶名称","gtmc-test-backup-service"');
    expect(csv).not.toContain('所属系统');
    expect(csv).not.toContain('所属环境');
    expect(csv).not.toContain('Bucket名称');
  });

  it('normalizes aliases in form excel export', async () => {
    const rowsBySheet = new Map<string, Array<Array<string>>>();
    addWorksheetMock.mockImplementation((name: string) => {
      const rows: Array<Array<string>> = [];
      rowsBySheet.set(name, rows);
      return {
        addRow: (row: Array<string>) => rows.push(row),
      };
    });

    const clickMock = vi.fn();
    document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'a') {
        return {
          href: '',
          download: '',
          click: clickMock,
        } as unknown as HTMLAnchorElement;
      }
      return createElementOriginal(tagName);
    });

    await downloadInitiationFormExcel(buildOrder());

    const formRows = rowsBySheet.get('发起表单') || [];
    expect(formRows).toEqual(
      expect.arrayContaining([
        ['分组', '字段', '值'],
        ['基础信息', '系统编号', 'S-56'],
        ['基础信息', '环境', 'SIT'],
        ['基础信息', '桶名称', 'gtmc-test-backup-service'],
      ]),
    );
    expect(writeBufferMock).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
  });

  it('exports stage csv overview content', () => {
    const csv = buildInitiationStageCsv(buildOrder());

    expect(csv).toContain('"输入模式","architecture_first"');
    expect(csv).toContain('"导出摘要","发起时间：2026-06-23 12:00:00');
  });

  it('exports stage excel sheets with overview, steps, risks and attachments', async () => {
    const rowsBySheet = new Map<string, Array<Array<string>>>();
    addWorksheetMock.mockImplementation((name: string) => {
      const rows: Array<Array<string>> = [];
      rowsBySheet.set(name, rows);
      return {
        addRow: (row: Array<string>) => rows.push(row),
      };
    });

    const clickMock = vi.fn();
    document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'a') {
        return {
          href: '',
          download: '',
          click: clickMock,
        } as unknown as HTMLAnchorElement;
      }
      return createElementOriginal(tagName);
    });

    await downloadInitiationStageExcel(buildOrder());

    expect(rowsBySheet.get('发起阶段总览')).toEqual(
      expect.arrayContaining([
        ['项目', '内容'],
        ['输入模式', 'architecture_first'],
        ['评审关注点', '确认桶命名规范；确认容量与使用时间'],
      ]),
    );
    expect(rowsBySheet.get('阶段步骤')).toEqual(
      expect.arrayContaining([
        ['步骤编码', '步骤名称', '状态', '摘要', '开始时间', '完成时间'],
        ['input', '申请表单填写', 'completed', '已完成发起表单填写', '2026-06-23 12:00:00', '2026-06-23 12:03:00'],
      ]),
    );
    expect(rowsBySheet.get('缺失项与风险')).toEqual(
      expect.arrayContaining([
        ['类型', '内容'],
        ['缺失项', '缺少保留周期'],
        ['风险提示', '生产环境需确认审计要求'],
        ['AI亮点', '识别到对象存储容量需求'],
      ]),
    );
    expect(rowsBySheet.get('附件')).toEqual(
      expect.arrayContaining([
        ['附件类型', '文件名', '大小', '上传时间', '来源'],
        ['architecture', 'topology.png', '128 KB', '2026-06-23 12:01:00', 'user-upload'],
      ]),
    );
    expect(writeBufferMock).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
  });

  it('exports delivery config excel with service delivery details', async () => {
    const rowsBySheet = new Map<string, Array<Array<string>>>();
    addWorksheetMock.mockImplementation((name: string) => {
      const rows: Array<Array<string>> = [];
      rowsBySheet.set(name, rows);
      return {
        addRow: (row: Array<string>) => rows.push(row),
      };
    });

    const clickMock = vi.fn();
    document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'a') {
        return {
          href: '',
          download: '',
          click: clickMock,
        } as unknown as HTMLAnchorElement;
      }
      return createElementOriginal(tagName);
    });

    await downloadDeliveryConfigExcel(buildDeliveryOrder());

    expect(rowsBySheet.get('交付总览')).toEqual(
      expect.arrayContaining([
        ['项目', '内容'],
        ['工单号', 'ORD-TEST-001'],
      ]),
    );
    expect(rowsBySheet.get('服务交付明细')).toEqual(
      expect.arrayContaining([
        ['服务', '状态', '模块', '字段', '值'],
        ['MySQL部署', 'completed', '资产信息', 'assetId', 'DB-001'],
        ['MySQL部署', 'completed', '连接信息', 'host', '10.0.0.11'],
        ['MySQL部署', 'completed', '高可用信息', 'mode', '主从'],
      ]),
    );
    expect(writeBufferMock).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
  });
});
