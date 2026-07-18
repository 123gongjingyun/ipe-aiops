import type { RequestRecord, RequestRecordDraftPayload } from '../store/request-records';
import {
  APPLICATION_INFO_FIELDS,
  REQUEST_REVIEW_APPROVAL_PLACEHOLDER,
  REQUEST_REVIEW_EMPTY_PLACEHOLDER,
  REQUEST_REVIEW_SECTION_TITLES,
  USER_REQUIREMENT_FIELDS,
  USER_REQUIREMENT_SECTION_HINTS,
  type RequestReviewFieldDefinition,
  type RequestReviewSectionKey,
} from './request-review-export-sections';
import { REQUEST_REQUIREMENT_CATEGORIES } from './request-requirement-definitions';

type VmComponentConfig = {
  deploymentMode?: string;
  specProfile?: string;
  configLabel?: string;
  cpu?: string;
  memory?: string;
  nodeCount?: string;
  diskType?: string;
  systemDisk?: string;
  dataDisk?: string;
  configReference?: string;
};

export interface RequestReviewExportField {
  key: string;
  label: string;
  value: string;
  placeholder: string;
  empty: boolean;
  required?: boolean;
  allowExplicitNone?: boolean;
  highlight?: 'pink';
}

export interface RequestReviewExportComponentSection {
  key: string;
  title: string;
  sheetName: string;
  fields: RequestReviewExportField[];
}

export interface RequestReviewExportSection {
  key: RequestReviewSectionKey;
  title: string;
  fields: RequestReviewExportField[];
  groups?: RequestReviewExportFieldGroup[];
  hints?: string[];
  placeholder?: string;
}

export interface RequestReviewExportFieldGroup {
  key: string;
  title: string;
  order: number;
  fields: RequestReviewExportField[];
}

export interface RequestReviewExportModel {
  recordId: string;
  title: string;
  stage: string;
  channel: string;
  owner: string;
  environment: string;
  updatedAt: string;
  summary: string;
  userRequirementsSection: RequestReviewExportSection;
  applicationInfoSection: RequestReviewExportSection;
  reviewSummaryOverviewSection: RequestReviewExportSection;
  approvalNoteSection: RequestReviewExportSection;
}

function normalizeValue(value: string | undefined): string {
  return value?.trim() || '';
}

function parseRequirementAnswers(raw: string) {
  const answers = new Map<string, string>();
  const sections = raw.split(/\n(?=【)/).filter(Boolean);
  sections.forEach(section => {
    const match = section.match(/^【([^】]+)】\n?([\s\S]*)$/);
    if (!match) return;
    answers.set(match[1].trim(), normalizeValue(match[2]));
  });
  return answers;
}

function createField(
  draft: RequestRecordDraftPayload,
  definition: RequestReviewFieldDefinition,
): RequestReviewExportField {
  const value = normalizeValue(draft[definition.key]);
  return {
    key: String(definition.key),
    label: definition.label,
    value,
    placeholder: definition.placeholder || REQUEST_REVIEW_EMPTY_PLACEHOLDER,
    empty: value.length === 0,
    required: definition.required,
    allowExplicitNone: definition.allowExplicitNone,
    highlight: definition.highlight,
  };
}

function buildSection(
  key: RequestReviewSectionKey,
  definitions: RequestReviewFieldDefinition[],
  draft: RequestRecordDraftPayload,
): RequestReviewExportSection {
  return {
    key,
    title: REQUEST_REVIEW_SECTION_TITLES[key],
    fields: definitions.map(definition => createField(draft, definition)),
  };
}

function buildUserRequirementSection(
  draft: RequestRecordDraftPayload,
): RequestReviewExportSection {
  const fields = REQUEST_REQUIREMENT_CATEGORIES.flatMap(category => {
    const answers = parseRequirementAnswers(normalizeValue(draft[category.field]));
    return category.projects.map(project => {
      const value = answers.get(project.title) || '';
      return {
        key: `${category.id}/${project.id}`,
        label: project.title,
        value,
        placeholder: `未填写 ${project.title}`,
        empty: value.length === 0,
        required: project.required,
        allowExplicitNone: project.allowExplicitNone,
        highlight: 'pink' as const,
      };
    });
  });

  const groups: RequestReviewExportFieldGroup[] = REQUEST_REQUIREMENT_CATEGORIES.map(category => {
    const answers = parseRequirementAnswers(normalizeValue(draft[category.field]));
    return {
      key: category.id,
      title: `${category.order} ${category.title}`,
      order: category.order,
      fields: category.projects.map(project => {
        const value = answers.get(project.title) || '';
        return {
          key: `${category.id}/${project.id}`,
          label: project.title,
          value,
          placeholder: `未填写 ${project.title}`,
          empty: value.length === 0,
          required: project.required,
          allowExplicitNone: project.allowExplicitNone,
          highlight: 'pink' as const,
        };
      }),
    };
  });

  return {
    key: 'userRequirements',
    title: REQUEST_REVIEW_SECTION_TITLES.userRequirements,
    fields,
    hints: [...USER_REQUIREMENT_SECTION_HINTS],
    groups,
  };
}

function parseVmComponentConfigs(raw: string | undefined): Record<string, VmComponentConfig> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, VmComponentConfig>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function buildComponentFields(component: string, config?: VmComponentConfig): RequestReviewExportField[] {
  const resolved = config || {};
  const fieldTuples: Array<[string, string, string | undefined, string]> = [
    ['componentName', '组件名称', component, '未识别组件名称'],
    ['deploymentMode', '部署方式', resolved.deploymentMode, `未填写 ${component} 部署方式`],
    ['configLabel', '配置名称', resolved.configLabel, `未填写 ${component} 配置名称`],
    ['specProfile', '规格档位', resolved.specProfile, `未填写 ${component} 规格档位`],
    ['nodeCount', '节点数', resolved.nodeCount, `未填写 ${component} 节点数`],
    ['cpu', 'CPU', resolved.cpu, `未填写 ${component} CPU`],
    ['memory', '内存', resolved.memory, `未填写 ${component} 内存`],
    ['diskType', '磁盘类型', resolved.diskType, `未填写 ${component} 磁盘类型`],
    ['systemDisk', '系统盘（GB）', resolved.systemDisk, `未填写 ${component} 系统盘`],
    ['dataDisk', '数据盘（GB）', resolved.dataDisk, `未填写 ${component} 数据盘`],
    ['configReference', '配置参考', resolved.configReference, `未填写 ${component} 配置参考`],
  ];

  return fieldTuples
    .map(([key, label, rawValue, placeholder]) => {
      const value = normalizeValue(rawValue);
      return {
        key,
        label,
        value,
        placeholder,
        empty: value.length === 0,
      };
    })
    .filter(field => !field.empty || field.key === 'componentName' || field.key === 'deploymentMode' || field.key === 'configLabel' || field.key === 'specProfile' || field.key === 'nodeCount' || field.key === 'cpu' || field.key === 'memory' || field.key === 'diskType' || field.key === 'systemDisk' || field.key === 'dataDisk' || field.key === 'configReference');
}

function buildComponentSections(draft: RequestRecordDraftPayload): RequestReviewExportComponentSection[] {
  const selectedComponents = normalizeValue(draft.vmComponentSelection)
    .split('、')
    .map(item => item.trim())
    .filter(Boolean);
  const componentConfigs = parseVmComponentConfigs(draft.vmComponentConfigs);

  return selectedComponents.map(component => ({
    key: component.toLowerCase(),
    title: `${component} 组件配置`,
    sheetName: component,
    fields: buildComponentFields(component, componentConfigs[component]),
  }));
}

function buildApplicationInfoSection(
  draft: RequestRecordDraftPayload,
): RequestReviewExportSection {
  const baseFields = APPLICATION_INFO_FIELDS.map(definition => createField(draft, definition));
  const componentSections = buildComponentSections(draft);
  const componentFields = componentSections.flatMap(section =>
    section.fields.map(field => ({
      ...field,
      key: `${section.key}/${field.key}`,
      label: `${section.title} - ${field.label}`,
    })),
  );

  const groups: RequestReviewExportFieldGroup[] = [
    {
      key: 'application-base',
      title: 'B1 基础信息',
      order: 1,
      fields: baseFields.filter(field =>
        ['systemCode', 'systemName', 'moduleName', 'owner'].includes(field.key),
      ),
    },
    {
      key: 'application-vm-base',
      title: 'B2 虚拟机底座配置',
      order: 2,
      fields: baseFields.filter(field =>
        ['vmResourceMode', 'vmDeploymentMode', 'vmSpecProfile', 'vmQuantity', 'vmDiskType', 'vmSystemDisk', 'vmDataDisk', 'vmComponentSelection', 'vmConfigReference'].includes(field.key),
      ),
    },
  ];

  if (componentFields.length > 0) {
    groups.push({
      key: 'application-components',
      title: 'B3 组件配置',
      order: 3,
      fields: componentFields,
    });
  }

  return {
    key: 'applicationInfo',
    title: REQUEST_REVIEW_SECTION_TITLES.applicationInfo,
    fields: [...baseFields, ...componentFields],
    groups,
  };
}

function buildReviewSummaryOverview(record: RequestRecord): RequestReviewExportSection {
  const overview = record.reviewSummaryOverview?.trim()
    || '待生成评审概要概览';

  return {
    key: 'reviewSummaryOverview',
    title: REQUEST_REVIEW_SECTION_TITLES.reviewSummaryOverview,
    fields: [
      {
        key: 'reviewSummaryOverview',
        label: '评审概要概览',
        value: overview,
        placeholder: '待生成评审概要概览',
        empty: overview.trim().length === 0,
      },
    ],
  };
}

function buildApprovalNoteSection(): RequestReviewExportSection {
  return {
    key: 'approvalNote',
    title: REQUEST_REVIEW_SECTION_TITLES.approvalNote,
    fields: [
      {
        key: 'approvalNote',
        label: '审批意见',
        value: '',
        placeholder: REQUEST_REVIEW_APPROVAL_PLACEHOLDER,
        empty: true,
      },
    ],
    placeholder: REQUEST_REVIEW_APPROVAL_PLACEHOLDER,
  };
}

export function buildRequestReviewExportModel(record: RequestRecord): RequestReviewExportModel {
  const { draft } = record;
  const userRequirementsSection = buildUserRequirementSection(draft);
  const applicationInfoSection = buildApplicationInfoSection(draft);
  const reviewSummaryOverviewSection = buildReviewSummaryOverview(record);
  const approvalNoteSection = buildApprovalNoteSection();

  return {
    recordId: record.id,
    title: record.title,
    stage: record.stage,
    channel: record.channel,
    owner: record.owner,
    environment: record.environment,
    updatedAt: record.updatedAt,
    summary: record.summary,
    userRequirementsSection,
    applicationInfoSection,
    reviewSummaryOverviewSection,
    approvalNoteSection,
  };
}
