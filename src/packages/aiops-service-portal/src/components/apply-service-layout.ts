import type {
  FieldSchema,
  FormLayoutConfig,
  ProductionFieldDefinition,
} from '@aiops/shared';

type TrialSectionConfig = {
  id: string;
  title: string;
  description: string;
  keys: readonly string[];
};

export function normalizeProductionFields(fields: ProductionFieldDefinition[]): FieldSchema[] {
  return fields.map(field => ({
    key: field.key,
    label: field.label,
    type: field.type,
    required: field.required ?? false,
    options: field.options,
    placeholder: field.placeholder,
  }));
}

export function mergeLayoutWithFields(
  layout: FormLayoutConfig,
  fields: FieldSchema[],
): FormLayoutConfig {
  const usedFieldKeys = new Set<string>();

  const sections = layout.sections
    .map(section => ({
      ...section,
      rows: section.rows
        .map(row => ({
          ...row,
          columns: row.columns.filter(column => {
            const exists = fields.some(field => field.key === column.fieldKey);
            if (exists) usedFieldKeys.add(column.fieldKey);
            return exists;
          }),
        }))
        .filter(row => row.columns.length > 0),
    }))
    .filter(section => section.rows.length > 0);

  const missingFields = fields.filter(field => !usedFieldKeys.has(field.key));
  if (missingFields.length === 0) {
    return sections.length > 0 ? { sections } : layout;
  }

  const fallbackSection = {
    id: 'section-application',
    title: '申请信息',
    description: '补全基础参数。',
    rows: missingFields.map((field, index) => ({
      id: `row-missing-${index + 1}-${field.key}`,
      columns: [{ fieldKey: field.key, span: (field.type === 'textarea' ? 2 : 1) as 1 | 2 }],
    })),
  };

  return {
    sections: [fallbackSection, ...sections],
  };
}

function buildBalancedRows(sectionId: string, fields: FieldSchema[]) {
  if (fields.length === 0) return [];

  if (fields.length === 2) {
    return [{
      id: `${sectionId}-row-1`,
      columns: fields.map(field => ({
        fieldKey: field.key,
        span: 1 as 1,
      })),
    }];
  }

  if (fields.length === 4) {
    return [
      {
        id: `${sectionId}-row-1`,
        columns: fields.slice(0, 2).map(field => ({
          fieldKey: field.key,
          span: 1 as 1,
        })),
      },
      {
        id: `${sectionId}-row-2`,
        columns: fields.slice(2, 4).map(field => ({
          fieldKey: field.key,
          span: 1 as 1,
        })),
      },
    ];
  }

  if (fields.length === 5) {
    return [
      {
        id: `${sectionId}-row-1`,
        columns: fields.slice(0, 3).map(field => ({
          fieldKey: field.key,
          span: 1 as 1,
        })),
      },
      {
        id: `${sectionId}-row-2`,
        columns: fields.slice(3, 5).map(field => ({
          fieldKey: field.key,
          span: 1 as 1,
        })),
      },
    ];
  }

  const rows: FormLayoutConfig['sections'][number]['rows'] = [];
  for (let index = 0; index < fields.length; index += 3) {
    rows.push({
      id: `${sectionId}-row-${rows.length + 1}`,
      columns: fields.slice(index, index + 3).map(field => ({
        fieldKey: field.key,
        span: 1 as 1,
      })),
    });
  }
  return rows;
}

export function buildApplicantLayout(fields: FieldSchema[]): FormLayoutConfig {
  const fieldMap = new Map(fields.map(field => [field.key, field]));
  const fieldKeys = new Set(fields.map(field => field.key));
  const hasAny = (...keys: string[]) => keys.some(key => fieldKeys.has(key));

  const vmScenario = hasAny('configProfile', 'vmType', 'moduleName') || (hasAny('cpu', 'memory') && hasAny('vmType', 'systemCode'));
  const obsScenario = hasAny('bucketName', 'akSkCount', 'directoryName');
  const storageScenario = hasAny('sfsName') || (obsScenario && !fieldKeys.has('akSkCount'));

  let groups: Array<{ id: string; title: string; description: string; keys: string[] }>;
  let preferTripleColumns = false;

  if (vmScenario) {
    preferTripleColumns = true;
    groups = [
      {
        id: 'section-application',
        title: '申请信息',
        description: '与仿生产申请页保持一致的基础参数。',
        keys: ['systemCode', 'systemName', 'moduleName', 'assignee', 'environment', 'vmType'],
      },
      {
        id: 'section-spec',
        title: '配置信息',
        description: '配置选择与资源补充项。',
        keys: ['cpu', 'memory', 'dataDiskSize', 'resourcePool', 'ipAssignMode', 'region', 'vpc', 'subnet', 'configProfile'],
      },
      {
        id: 'section-policy',
        title: '风险与策略',
        description: '仅在需要时补充平台策略。',
        keys: ['securityLevel', 'haRequirement', 'publicAccess', 'certificateRequirement', 'auditRequirement'],
      },
    ];
  } else if (obsScenario || storageScenario) {
    groups = [
      {
        id: 'section-application',
        title: '申请信息',
        description: '与仿生产存储申请页保持一致的申请主体信息。',
        keys: ['environment', 'domainAccount', 'supplier', 'systemCode', 'assignee', 'businessCategory'],
      },
      {
        id: 'section-spec',
        title: '存储信息',
        description: '桶、目录、容量与使用时长。',
        keys: ['bucketName', 'sfsName', 'directoryName', 'dataDiskSize', 'akSkCount', 'usageDuration'],
      },
      {
        id: 'section-policy',
        title: '风险与策略',
        description: '访问控制与审计类配置。',
        keys: ['accessControl', 'securityLevel', 'auditRequirement', 'backupPolicy'],
      },
    ];
  } else {
    groups = [
      {
        id: 'section-application',
        title: '申请信息',
        description: '基础参数。',
        keys: ['applicationName', 'applicationEnglishName', 'applicationDescription', 'environment', 'businessPurpose', 'owner', 'resourcePool', 'region', 'vpc', 'subnet', 'ipAssignMode', 'domainName'],
      },
      {
        id: 'section-spec',
        title: '资源规格',
        description: '规格与容量。',
        keys: ['spec', 'os', 'count', 'purpose', 'dbVersion', 'deployMode', 'dataDiskSize', 'bucketName', 'accessControl', 'listenerProtocol', 'listenerPort'],
      },
      {
        id: 'section-policy',
        title: '风险与策略',
        description: '策略项。',
        keys: ['securityLevel', 'haRequirement', 'backupPolicy', 'publicAccess', 'certificateRequirement', 'auditRequirement'],
      },
    ];
  }

  const buildRows = (groupId: string, groupFields: FieldSchema[]) => {
    if (preferTripleColumns && groupFields.every(field => field.type !== 'textarea')) {
      return buildBalancedRows(groupId, groupFields);
    }

    const rows: FormLayoutConfig['sections'][number]['rows'] = [];
    let pendingFields: FieldSchema[] = [];

    const flushPending = () => {
      if (pendingFields.length === 0) return;
      rows.push({
        id: `${groupId}-row-${rows.length + 1}`,
        columns: pendingFields.map(field => ({
          fieldKey: field.key,
          span: 1 as 1,
        })),
      });
      pendingFields = [];
    };

    groupFields.forEach(field => {
      if (field.type === 'textarea') {
        flushPending();
        rows.push({
          id: `${groupId}-row-${rows.length + 1}`,
          columns: [{ fieldKey: field.key, span: 2 as 2 }],
        });
        return;
      }

      pendingFields.push(field);
      if (pendingFields.length === 2) {
        flushPending();
      }
    });

    flushPending();
    return rows;
  };

  const sections = groups
    .map(group => {
      const groupFields = group.keys.map(key => fieldMap.get(key)).filter(Boolean) as FieldSchema[];
      if (groupFields.length === 0) return null;
      return {
        id: group.id,
        title: group.title,
        description: group.description,
        rows: buildRows(group.id, groupFields),
      };
    })
    .filter(Boolean) as FormLayoutConfig['sections'];

  const groupedKeys = new Set(groups.flatMap(group => group.keys));
  const remainingFields = fields.filter(field => !groupedKeys.has(field.key));
  if (remainingFields.length > 0) {
    sections.push({
      id: 'section-more',
      title: '补充参数',
      description: '其他参数。',
      rows: buildRows('section-more', remainingFields),
    });
  }

  return { sections };
}

export function isStackedSingleColumnLayout(layout: FormLayoutConfig) {
  const rows = layout.sections.flatMap(section => section.rows);
  if (rows.length === 0) return false;
  return rows.every(row => row.columns.length === 1 && row.columns[0]?.span === 1);
}

export function buildMysqlTrialLayout(fields: FieldSchema[]): FormLayoutConfig {
  const fieldMap = new Map(fields.map(field => [field.key, field]));
  const sectionsConfig: TrialSectionConfig[] = [
    {
      id: 'section-basic',
      title: '基础信息',
      description: '确认申请主体和目标环境。',
      keys: ['applicationName', 'applicationEnglishName', 'environment'],
    },
    {
      id: 'section-demand',
      title: '需求与目标',
      description: '说明应用背景、业务用途和业务重要程度。',
      keys: ['applicationDescription', 'businessPurpose', 'businessCriticality'],
    },
    {
      id: 'section-db',
      title: '数据库配置',
      description: '数据库版本、部署方式、容量与命名信息。',
      keys: ['dbVersion', 'deployMode', 'dataDiskSize', 'databaseName', 'charset'],
    },
    {
      id: 'section-policy',
      title: 'SLA 与安全策略',
      description: '高可用、备份和恢复目标。',
      keys: ['haRequirement', 'backupPolicy', 'securityLevel', 'rtoTarget', 'rpoTarget'],
    },
    {
      id: 'section-adjust',
      title: '用户调整与补充',
      description: '本轮先开放少量补充说明。',
      keys: ['resourceRemark'],
    },
  ];

  const buildRows = (sectionId: string, keys: readonly string[]) => {
    const sectionFields = keys.map(key => fieldMap.get(key)).filter(Boolean) as FieldSchema[];
    if (sectionFields.length === 0) return [];
    return buildBalancedRows(sectionId, sectionFields);
  };

  const sections = sectionsConfig
    .map(section => ({
      id: section.id,
      title: section.title,
      description: section.description,
      rows: buildRows(section.id, section.keys),
    }))
    .filter(section => section.rows.length > 0);

  const groupedKeys = new Set(sectionsConfig.flatMap(section => section.keys));
  const remainingFields = fields.filter(field => !groupedKeys.has(field.key));
  if (remainingFields.length > 0) {
    sections.push({
      id: 'section-more',
      title: '补充参数',
      description: '未纳入试点主路径的参数。',
      rows: remainingFields.map((field, index) => ({
        id: `section-more-row-${index + 1}`,
        columns: [{ fieldKey: field.key, span: field.type === 'textarea' ? 2 as 2 : 1 as 1 }],
      })),
    });
  }

  return { sections };
}

export function buildCloudDbTrialLayout(fields: FieldSchema[]): FormLayoutConfig {
  const fieldMap = new Map(fields.map(field => [field.key, field]));
  const sectionsConfig: TrialSectionConfig[] = [
    {
      id: 'section-basic',
      title: '基础信息',
      description: '确认应用主体、英文名与目标环境。',
      keys: ['applicationName', 'applicationEnglishName', 'environment'],
    },
    {
      id: 'section-demand',
      title: '需求与目标',
      description: '说明业务背景和数据库使用场景。',
      keys: ['applicationDescription', 'businessPurpose'],
    },
    {
      id: 'section-db',
      title: '数据库配置',
      description: '引擎、版本、资源规格、高可用和数据库命名。',
      keys: ['engine', 'version', 'cpu', 'memory', 'haMode', 'databaseName'],
    },
    {
      id: 'section-policy',
      title: 'SLA 与安全策略',
      description: '容量、备份与安全等级。',
      keys: ['dataDiskSize', 'backupPolicy', 'securityLevel'],
    },
    {
      id: 'section-adjust',
      title: '用户调整与补充',
      description: '补充当前场景的特殊约束或交付说明。',
      keys: ['resourceRemark'],
    },
  ];

  const sections = sectionsConfig
    .map(section => {
      const sectionFields = section.keys.map(key => fieldMap.get(key)).filter(Boolean) as FieldSchema[];
      if (sectionFields.length === 0) return null;
      return {
        id: section.id,
        title: section.title,
        description: section.description,
        rows: buildBalancedRows(section.id, sectionFields),
      };
    })
    .filter(Boolean) as FormLayoutConfig['sections'];

  const groupedKeys = new Set(sectionsConfig.flatMap(section => section.keys));
  const remainingFields = fields.filter(field => !groupedKeys.has(field.key));
  if (remainingFields.length > 0) {
    sections.push({
      id: 'section-more',
      title: '补充参数',
      description: '未纳入当前试点主路径的参数。',
      rows: remainingFields.map((field, index) => ({
        id: `section-more-row-${index + 1}`,
        columns: [{ fieldKey: field.key, span: field.type === 'textarea' ? 2 as 2 : 1 as 1 }],
      })),
    });
  }

  return { sections };
}

export function buildNetworkLbTrialLayout(fields: FieldSchema[]): FormLayoutConfig {
  const fieldMap = new Map(fields.map(field => [field.key, field]));
  const sectionsConfig: TrialSectionConfig[] = [
    {
      id: 'section-basic',
      title: '基础信息',
      description: '确认应用主体、英文名与发布环境。',
      keys: ['applicationName', 'applicationEnglishName', 'environment'],
    },
    {
      id: 'section-demand',
      title: '需求与目标',
      description: '说明发布场景和负载用途。',
      keys: ['applicationDescription', 'businessPurpose'],
    },
    {
      id: 'section-lb',
      title: '负载配置',
      description: '补充后端地址、协议和监听端口。',
      keys: ['backendAddress', 'listenerProtocol', 'listenerPort'],
    },
    {
      id: 'section-policy',
      title: 'SLA 与安全策略',
      description: '确认高可用和安全等级要求。',
      keys: ['haRequirement', 'securityLevel'],
    },
    {
      id: 'section-adjust',
      title: '用户调整与补充',
      description: '补充当前网络入口的特殊说明。',
      keys: ['resourceRemark'],
    },
  ];

  const sections = sectionsConfig
    .map(section => {
      const sectionFields = section.keys.map(key => fieldMap.get(key)).filter(Boolean) as FieldSchema[];
      if (sectionFields.length === 0) return null;
      return {
        id: section.id,
        title: section.title,
        description: section.description,
        rows: buildBalancedRows(section.id, sectionFields),
      };
    })
    .filter(Boolean) as FormLayoutConfig['sections'];

  const groupedKeys = new Set(sectionsConfig.flatMap(section => section.keys));
  const remainingFields = fields.filter(field => !groupedKeys.has(field.key));
  if (remainingFields.length > 0) {
    sections.push({
      id: 'section-more',
      title: '补充参数',
      description: '未纳入当前试点主路径的参数。',
      rows: remainingFields.map((field, index) => ({
        id: `section-more-row-${index + 1}`,
        columns: [{ fieldKey: field.key, span: field.type === 'textarea' ? 2 as 2 : 1 as 1 }],
      })),
    });
  }

  return { sections };
}

export function buildNetworkPublicLbTrialLayout(fields: FieldSchema[]): FormLayoutConfig {
  const fieldMap = new Map(fields.map(field => [field.key, field]));
  const sectionsConfig: TrialSectionConfig[] = [
    {
      id: 'section-basic',
      title: '基础信息',
      description: '确认应用主体、英文名与发布环境。',
      keys: ['applicationName', 'applicationEnglishName', 'environment'],
    },
    {
      id: 'section-demand',
      title: '需求与目标',
      description: '说明公网发布场景和业务用途。',
      keys: ['applicationDescription', 'businessPurpose'],
    },
    {
      id: 'section-public',
      title: '公网发布配置',
      description: '补充域名、后端地址、协议和监听端口。',
      keys: ['domainName', 'backendAddress', 'listenerProtocol', 'listenerPort'],
    },
    {
      id: 'section-policy',
      title: 'SLA 与安全策略',
      description: '确认安全等级与证书协助需求。',
      keys: ['securityLevel', 'certificateRequirement'],
    },
    {
      id: 'section-adjust',
      title: '用户调整与补充',
      description: '补充当前公网入口的特殊说明。',
      keys: ['resourceRemark'],
    },
  ];

  const sections = sectionsConfig
    .map(section => {
      const sectionFields = section.keys.map(key => fieldMap.get(key)).filter(Boolean) as FieldSchema[];
      if (sectionFields.length === 0) return null;
      return {
        id: section.id,
        title: section.title,
        description: section.description,
        rows: buildBalancedRows(section.id, sectionFields),
      };
    })
    .filter(Boolean) as FormLayoutConfig['sections'];

  const groupedKeys = new Set(sectionsConfig.flatMap(section => section.keys));
  const remainingFields = fields.filter(field => !groupedKeys.has(field.key));
  if (remainingFields.length > 0) {
    sections.push({
      id: 'section-more',
      title: '补充参数',
      description: '未纳入当前试点主路径的参数。',
      rows: remainingFields.map((field, index) => ({
        id: `section-more-row-${index + 1}`,
        columns: [{ fieldKey: field.key, span: field.type === 'textarea' ? 2 as 2 : 1 as 1 }],
      })),
    });
  }

  return { sections };
}

export function buildContainerTrialLayout(fields: FieldSchema[]): FormLayoutConfig {
  const fieldMap = new Map(fields.map(field => [field.key, field]));
  const sectionsConfig: TrialSectionConfig[] = [
    {
      id: 'section-basic',
      title: '基础信息',
      description: '确认申请环境、资源分区和系统归属。',
      keys: ['environment', 'resourcePartition', 'systemCode', 'systemName'],
    },
    {
      id: 'section-tenant',
      title: '租户信息',
      description: '与容器申请配套的供应商和申请人信息。',
      keys: ['supplierName', 'supplierShortName', 'supplierId', 'contactName', 'contactAccount', 'contactEmail'],
    },
    {
      id: 'section-container',
      title: '容器资源',
      description: '按应用维度填写英文名称、用途与实例规格。',
      keys: ['applicationEnglishName', 'businessDomain', 'namespace', 'instanceCount', 'cpuPerInstance', 'memoryPerInstance', 'applicationDescription'],
    },
    {
      id: 'section-platform',
      title: '平台集成',
      description: '补充流水线和日志权限开通项。',
      keys: ['requiresPipelineAccess', 'requiresEfkAccess'],
    },
    {
      id: 'section-adjust',
      title: '用户调整与补充',
      description: '补充当前容器场景的特殊交付说明。',
      keys: ['resourceRemark'],
    },
  ];

  const sections = sectionsConfig
    .map(section => {
      const sectionFields = section.keys.map(key => fieldMap.get(key)).filter(Boolean) as FieldSchema[];
      if (sectionFields.length === 0) return null;
      return {
        id: section.id,
        title: section.title,
        description: section.description,
        rows: buildBalancedRows(section.id, sectionFields),
      };
    })
    .filter(Boolean) as FormLayoutConfig['sections'];

  const groupedKeys = new Set(sectionsConfig.flatMap(section => section.keys));
  const remainingFields = fields.filter(field => !groupedKeys.has(field.key));
  if (remainingFields.length > 0) {
    sections.push({
      id: 'section-more',
      title: '补充参数',
      description: '未纳入当前试点主路径的参数。',
      rows: remainingFields.map((field, index) => ({
        id: `section-more-row-${index + 1}`,
        columns: [{ fieldKey: field.key, span: field.type === 'textarea' ? 2 as 2 : 1 as 1 }],
      })),
    });
  }

  return { sections };
}

export function resolveSummaryFieldKeys(fields: FieldSchema[]): string[] {
  const fieldKeys = new Set(fields.map(field => field.key));
  const hasAny = (...keys: string[]) => keys.some(key => fieldKeys.has(key));

  if (hasAny('domainName', 'backendAddress') && hasAny('listenerProtocol', 'listenerPort')) {
    return ['applicationName', 'applicationEnglishName', 'environment', 'domainName', 'backendAddress', 'listenerProtocol', 'listenerPort'];
  }

  if (hasAny('backendAddress', 'listenerProtocol', 'listenerPort')) {
    return ['applicationName', 'applicationEnglishName', 'environment', 'backendAddress', 'listenerProtocol', 'listenerPort', 'haRequirement'];
  }

  if (hasAny('engine', 'haMode') && (hasAny('version', 'spec') || hasAny('cpu', 'memory'))) {
    return ['applicationName', 'applicationEnglishName', 'environment', 'engine', 'version', 'cpu', 'memory', 'haMode', 'dataDiskSize'];
  }

  if (hasAny('configProfile', 'vmType', 'moduleName') || (hasAny('cpu', 'memory') && hasAny('vmType', 'systemCode'))) {
    return ['systemCode', 'systemName', 'moduleName', 'assignee', 'environment', 'vmType', 'cpu', 'memory', 'dataDiskSize', 'resourcePool', 'ipAssignMode', 'securityLevel', 'haRequirement'];
  }

  if (hasAny('bucketName', 'akSkCount', 'directoryName', 'sfsName')) {
    return ['environment', 'supplier', 'systemCode', 'assignee', 'businessCategory', 'bucketName', 'sfsName', 'dataDiskSize', 'akSkCount', 'usageDuration'];
  }

  if (hasAny('applicationEnglishName', 'namespace') && hasAny('instanceCount', 'cpuPerInstance', 'memoryPerInstance')) {
    return ['environment', 'resourcePartition', 'systemCode', 'systemName', 'applicationEnglishName', 'namespace', 'instanceCount', 'cpuPerInstance'];
  }

  return ['applicationName', 'environment', 'spec', 'dbVersion', 'deployMode', 'domainName', 'listenerProtocol', 'listenerPort', 'dataDiskSize', 'bucketName', 'accessControl'];
}

export function suppressDuplicateScenarioFields(
  productionFields: FieldSchema[],
  resolvedFields: FieldSchema[],
): FieldSchema[] {
  const productionKeys = new Set(productionFields.map(field => field.key));
  const hasProductionField = (key: string) => productionKeys.has(key);

  const hiddenKeys = new Set<string>();

  if (hasProductionField('configProfile')) {
    ['spec', 'os', 'count', 'purpose'].forEach(key => hiddenKeys.add(key));
  }

  if (hasProductionField('cpu') && hasProductionField('memory')) {
    ['spec', 'os', 'count', 'purpose', 'configProfile'].forEach(key => hiddenKeys.add(key));
  }

  if (hasProductionField('bucketName') || hasProductionField('sfsName')) {
    ['description', 'urgency', 'deadline'].forEach(key => hiddenKeys.add(key));
  }

  if (hasProductionField('applicationDescription') || hasProductionField('businessPurpose')) {
    ['description', 'urgency', 'deadline'].forEach(key => hiddenKeys.add(key));
  }

  if (hasProductionField('instanceCount') && hasProductionField('cpuPerInstance')) {
    ['scale', 'nodeSpec'].forEach(key => hiddenKeys.add(key));
  }

  return resolvedFields.filter(field => !hiddenKeys.has(field.key));
}
