export * from './types';
export * from './lib/utils';
export * from './lib/pricing-config';
export * from './lib/pricing-recommendation';
export * from './lib/simulation-assessment';
export * from './lib/workflow-timeline';
export * from './lib/export-sheet';
export * from './lib/apply-strategy';
export * from './lib/support-widget';
export * from './lib/initiation-snapshot';
export * from './lib/initiation-form-export';
export * from './lib/initiation-stage-export';
export * from './lib/delivery-export';
export * from './lib/request-review-export';
export * from './lib/request-review-export-sections';
export * from './lib/request-review-export-model';
export * from './lib/request-review-export-validation';
export * from './lib/request-requirement-definitions';
export * from './lib/order-stage-nodes';

// Spec 数据层
export { DOMAIN_META, groupSpecsByDomain } from './data/specs/domains';
export type { DomainInfo, GroupedDomain, GroupedCategory } from './data/specs/domains';
export { SERVICE_TYPE_META, AUTOMATION_LEVEL_META, deriveServiceType, deriveAutomationLevel } from './data/specs/capability-meta';
export { allAtomicSpecs } from './data/specs';
export { PRODUCTION_FIELD_DICTIONARY, APPROVAL_POLICIES, DELIVERY_STEP_SETS, ASSET_FIELD_MAPPINGS, SAMPLE_PRODUCTION_METAS } from './data/specs/production-meta';
export { allAssemblies } from './data/assemblies';
export { allComboSpecs } from './data/spec-combos';
export { SLA_PRESETS, STANDARD_FLOW } from './data/sla-presets';
export { STANDARD_DELIVERY_PROCESS } from './data/standard-delivery-process';
export { ASSET_FIELD_SCHEMAS, getAssetFieldSchema } from './data/asset-fields';
export { FIELD_DICTIONARY_SEED } from './data/field-dictionary';
export { mysqlConfigProfiles, redisConfigProfiles, mqConfigProfiles, kafkaConfigProfiles, vmConfigProfiles } from './data/config-profiles';
export { ROLE_DEFINITION_SEED } from './data/role-definitions';

// Mock 生成器
export {
  generateOrchestratedPlan,
  generateDeliveryDetail,
  generateInternetAppDetail,
  generateDefaultChainNodes,
} from './data/mock-delivery';

// Spec Store
export {
  getSpecs,
  getSpec,
  getAtomicSpecs,
  getComboSpecs,
  onSpecsSync,
  addSpec,
  updateSpec,
  deleteSpec,
  updateSpecStatus,
  getApprovalPolicies,
  getApprovalPolicy,
  getDeliveryStepSets,
  getDeliveryStepSet,
  getAssetFieldMappings,
  getAssetFieldMapping,
} from './store/service-specs';

export {
  getFieldDictionaryEntries,
  getFieldDictionaryEntry,
  onFieldDictionarySync,
  addFieldDictionaryEntry,
  updateFieldDictionaryEntry,
  deleteFieldDictionaryEntry,
  resetFieldDictionaryEntries,
} from './store/field-dictionary';

export {
  CONFIG_PROFILE_GROUP_SEED,
  getConfigProfileGroups,
  getConfigProfileGroup,
  getConfigProfileGroupBySpecId,
  getManagedConfigProfilesForSpec,
  addConfigProfileGroup,
  deleteConfigProfileGroup,
  updateConfigProfileGroup,
  saveConfigProfilesForSpec,
  resetConfigProfileGroups,
  onConfigProfileGroupsSync,
} from './store/config-profiles';

export {
  getRoleDefinitions,
  getRoleDefinition,
  updateRoleDefinition,
  resetRoleDefinitions,
  onRoleDefinitionsSync,
} from './store/role-definitions';

export {
  bootstrapSchemaTemplatesFromSpecs,
  getSchemaTemplates,
  getSchemaTemplate,
  getSchemaTemplateVersions,
  getSchemaTemplateVersion,
  getCurrentSchemaTemplateVersion,
  getResolvedTemplateFields,
  getResolvedTemplateLayout,
  getResolvedSpecSchemaFields,
  getResolvedSpecSchemaLayout,
  onSchemaTemplatesSync,
  addSchemaTemplateVersion,
  createDraftFromTemplateVersion,
  updateSchemaTemplateVersion,
  publishSchemaTemplateVersion,
} from './store/schema-templates';

export {
  getSchemaTemplateConfigProfileBindings,
  getSchemaTemplateConfigProfileBinding,
  saveSchemaTemplateConfigProfileBinding,
  onSchemaTemplateConfigProfileBindingsSync,
} from './store/schema-template-config-profiles';

export {
  initDevConfigRemoteSync,
  pullDevConfigFromRemote,
} from './store/dev-config-sync';

export * from './hooks/use-schema-template-config-profiles';

// Order Store
export {
  getOrders, getOrder, createOrder, updateOrderStatus,
  updateServiceStatus, completeServiceDelivery, confirmOrder,
  submitOrderForReview, approveReview, rejectReview,
  submitPlanForConfirmation, confirmPlan, rejectPlan,
  updateItsmTicketInfo, updateDeliveryAcceptance,
  deleteOrder,
  onOrdersSync, resetServiceDelivery,
  updateChainNodeStatus, completeAllChainNodes,
  startCurrentDeliveryStep, completeCurrentDeliveryStep,
  getOrderIntegrations,
  archiveOrder,
  getArchivedOrders, getDeliveredAssets, getDeliveredAssetsByOrderId,
} from './store/orders';

export {
  getRequestRecords,
  getRequestRecord,
  saveRequestRecord,
  updateRequestRecordApprovalNote,
  markRequestRecordsExported,
  deleteRequestRecord,
  onRequestRecordsSync,
} from './store/request-records';
export type {
  RequestRecord,
  RequestRecordDraftPayload,
  RequestRecordMode,
  RequestRecordStage,
} from './store/request-records';

// Hooks
export * from './hooks/use-orders';
export * from './hooks/use-order';
export * from './hooks/use-request-records';
export * from './hooks/use-specs';
export * from './hooks/use-field-dictionary';
export * from './hooks/use-config-profiles';
export * from './hooks/use-role-definitions';
export * from './hooks/use-schema-templates';
export * from './services/itsm-service';

// UI Components
export { Button, buttonVariants } from './components/ui/button';
export type { ButtonProps } from './components/ui/button';
export { Input } from './components/ui/input';
export type { InputProps } from './components/ui/input';
export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem } from './components/ui/select';
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './components/ui/card';
export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './components/ui/table';
export { Progress } from './components/ui/progress';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
export { Badge } from './components/ui/badge';
export { Separator } from './components/ui/separator';
export { Checkbox } from './components/ui/checkbox';
export { Textarea } from './components/ui/textarea';
export type { TextareaProps } from './components/ui/textarea';
export { Label } from './components/ui/label';
export { Switch } from './components/ui/switch';
export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from './components/ui/dialog';
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './components/ui/tooltip';
export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from './components/ui/sheet';

// Business Components
export { ServiceProgressCard } from './components/service-progress-card';
export { DeliveryDetailPanel } from './components/delivery-detail-panel';
export { AIConfigPanel } from './components/ai-config-panel';
export { OrderCard } from './components/order-card';
export { IntegrationStatus } from './components/integration-status';
export { StatusBadge } from './components/status-badge';
export { NetworkChainProgress } from './components/network-chain-progress';
export { WorkflowShell } from './components/workflow-shell';
export type {
  WorkflowShellStageCard,
  WorkflowShellNodeCard,
  WorkflowShellAction,
  WorkflowShellContextBadge,
  WorkflowShellStageStatus,
} from './components/workflow-shell';
