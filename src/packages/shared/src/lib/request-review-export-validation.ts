import type { RequestRecord, RequestRecordDraftPayload } from '../store/request-records';
import {
  APPLICATION_INFO_FIELDS,
  USER_REQUIREMENT_FIELDS,
  type RequestReviewFieldDefinition,
} from './request-review-export-sections';
import { REQUEST_REQUIREMENT_CATEGORIES } from './request-requirement-definitions';

export type RequestReviewExportValidationLevel = 'blocking' | 'warning';

export interface RequestReviewExportValidationIssue {
  key: string;
  label: string;
  level: RequestReviewExportValidationLevel;
  reason: string;
}

export interface RequestReviewExportValidationResult {
  ready: boolean;
  issues: RequestReviewExportValidationIssue[];
  blockingIssues: RequestReviewExportValidationIssue[];
  warningIssues: RequestReviewExportValidationIssue[];
}

const WARNING_FIELD_KEYS: Array<keyof RequestRecordDraftPayload> = [
  'applicationName',
  'moduleName',
  'businessGoal',
  'integrationSystems',
  'accessScope',
  'resourceNeed',
  'slaRequirement',
  'architectureNote',
];

const EXPLICIT_NONE_VALUES = new Set(['无', 'none', 'n/a', 'na']);

function normalizeValue(value: string | undefined) {
  return value?.trim() || '';
}

function isExplicitNone(value: string) {
  return EXPLICIT_NONE_VALUES.has(value.trim().toLowerCase());
}

function containsForbiddenNoneText(value: string) {
  return /(^|[\s，。,；;：:（）()【】\[\]、])无($|[\s，。,；;：:（）()【】\[\]、])/.test(value.trim());
}

function shouldTreatAsMissing(
  value: string,
  definition: RequestReviewFieldDefinition,
) {
  if (!value) return true;
  if (isExplicitNone(value) && !definition.allowExplicitNone) return true;
  return false;
}

function buildBlockingReason(definition: RequestReviewFieldDefinition, value: string) {
  if (!value) {
    return `${definition.label} 未填写`;
  }
  if (isExplicitNone(value) && !definition.allowExplicitNone) {
    return `${definition.label} 不能填写“无”`;
  }
  return `${definition.label} 未满足导出要求`;
}

function validateBlockingFields(
  draft: RequestRecordDraftPayload,
): RequestReviewExportValidationIssue[] {
  const requiredDefinitions = [...USER_REQUIREMENT_FIELDS, ...APPLICATION_INFO_FIELDS]
    .filter(definition => definition.required);

  return requiredDefinitions.flatMap(definition => {
    const value = normalizeValue(draft[definition.key]);
    if (!shouldTreatAsMissing(value, definition)) return [];
    return [{
      key: String(definition.key),
      label: definition.label,
      level: 'blocking' as const,
      reason: buildBlockingReason(definition, value),
    }];
  });
}

function validateWarningFields(
  draft: RequestRecordDraftPayload,
): RequestReviewExportValidationIssue[] {
  return APPLICATION_INFO_FIELDS
    .filter(definition => WARNING_FIELD_KEYS.includes(definition.key))
    .flatMap(definition => {
      const value = normalizeValue(draft[definition.key]);
      if (value) return [];
      return [{
        key: String(definition.key),
        label: definition.label,
        level: 'warning' as const,
        reason: `${definition.label} 建议补充完整`,
      }];
    });
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

function validateRequirementProjects(
  draft: RequestRecordDraftPayload,
): RequestReviewExportValidationIssue[] {
  return REQUEST_REQUIREMENT_CATEGORIES.flatMap(category => {
    const answers = parseRequirementAnswers(normalizeValue(draft[category.field]));
    return category.projects.flatMap(project => {
      const value = answers.get(project.title) || '';
      if (
        value
        && (!isExplicitNone(value) || project.allowExplicitNone !== false)
        && !(project.forbidContainingNoneText && containsForbiddenNoneText(value))
      ) {
        return [];
      }
      const reason = !value
        ? `${project.title} 未填写`
        : `${project.title} 不能填写“无”`;
      return [{
        key: `${category.id}/${project.id}`,
        label: project.title,
        level: 'blocking' as const,
        reason,
      }];
    });
  });
}

export function validateRequestReviewExportDraft(
  draft: RequestRecordDraftPayload,
): RequestReviewExportValidationResult {
  const blockingIssues = [
    ...validateBlockingFields(draft),
    ...validateRequirementProjects(draft),
  ];
  const warningIssues = validateWarningFields(draft);
  const issues = [...blockingIssues, ...warningIssues];

  return {
    ready: blockingIssues.length === 0,
    issues,
    blockingIssues,
    warningIssues,
  };
}

export function validateRequestReviewExport(
  record: RequestRecord,
): RequestReviewExportValidationResult {
  return validateRequestReviewExportDraft(record.draft);
}
