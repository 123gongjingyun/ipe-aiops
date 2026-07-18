import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@aiops/shared';
import type { FieldSchema, FormLayoutColumn, FormLayoutConfig } from '@aiops/shared';

function columnSpanClass(span: number) {
  if (span >= 3) return 'md:col-span-2 xl:col-span-3';
  if (span >= 2) return 'md:col-span-2';
  return 'md:col-span-1';
}

function fieldWrapperClass(span: number) {
  return `space-y-2.5 ${columnSpanClass(span)}`;
}

function resolveRowGridClass(
  row: FormLayoutConfig['sections'][number]['rows'][number],
  textValues: Record<string, string>,
  booleanValues: Record<string, boolean> | undefined,
  defaultGridClass: string,
  hasCustomGridClass: boolean,
) {
  const visibleColumns = row.columns.filter(column => matchesVisibleWhen(column, textValues, booleanValues));
  if (visibleColumns.length <= 1) return 'grid gap-4';
  if (!hasCustomGridClass) {
    if (visibleColumns.length === 2) return 'grid gap-4 md:grid-cols-2';
    return 'grid gap-4 md:grid-cols-2 xl:grid-cols-3';
  }
  if (visibleColumns.length === 2) return 'grid gap-4 md:grid-cols-2';
  return defaultGridClass;
}

function matchesVisibleWhen(
  column: FormLayoutColumn,
  textValues: Record<string, string>,
  booleanValues?: Record<string, boolean>,
) {
  if (!column.visibleWhen) return true;
  const rawValue = booleanValues && column.visibleWhen.fieldKey in booleanValues
    ? String(booleanValues[column.visibleWhen.fieldKey])
    : String(textValues[column.visibleWhen.fieldKey] ?? '');
  const expected = String(column.visibleWhen.value ?? '');
  if (column.visibleWhen.operator === 'neq') return rawValue !== expected;
  return rawValue === expected;
}

function renderFieldInput(
  field: FieldSchema,
  textValues: Record<string, string>,
  setTextValues: (values: Record<string, string>) => void,
  booleanValues?: Record<string, boolean>,
  setBooleanValues?: (values: Record<string, boolean>) => void,
) {
  if (field.type === 'select' && field.options) {
    return (
      <Select value={textValues[field.key] || ''} onValueChange={value => setTextValues({ ...textValues, [field.key]: value })}>
        <SelectTrigger id={field.key} aria-label={field.label}>
          <SelectValue placeholder={field.placeholder || '请选择'} />
        </SelectTrigger>
        <SelectContent>
          {field.options.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === 'boolean') {
    const checked = booleanValues?.[field.key] ?? (field.defaultValue as boolean) ?? false;
    return (
      <div className="flex min-h-10 items-center justify-between rounded-lg border border-border bg-white px-3">
        <span className="text-sm text-muted-foreground">{checked ? '已开启' : '未开启'}</span>
        <Switch
          id={field.key}
          checked={checked}
          onCheckedChange={next => setBooleanValues?.({ ...(booleanValues ?? {}), [field.key]: next })}
        />
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <Textarea
        id={field.key}
        value={textValues[field.key] || ''}
        onChange={event => setTextValues({ ...textValues, [field.key]: event.target.value })}
        placeholder={field.placeholder || `请输入${field.label}`}
      />
    );
  }

  return (
    <Input
      id={field.key}
      type={field.type === 'integer' ? 'number' : 'text'}
      value={textValues[field.key] || ''}
      min={field.type === 'integer' ? field.min : undefined}
      max={field.type === 'integer' ? field.max : undefined}
      onChange={event => setTextValues({ ...textValues, [field.key]: event.target.value })}
      placeholder={field.placeholder || `请输入${field.label}`}
    />
  );
}

export function TemplateFormLayout({
  fields,
  layout,
  textValues,
  setTextValues,
  booleanValues,
  setBooleanValues,
  columns = 2,
  flat = false,
  gridClassName,
}: {
  fields: FieldSchema[];
  layout: FormLayoutConfig;
  textValues: Record<string, string>;
  setTextValues: (values: Record<string, string>) => void;
  booleanValues?: Record<string, boolean>;
  setBooleanValues?: (values: Record<string, boolean>) => void;
  columns?: 1 | 2;
  flat?: boolean;
  gridClassName?: string;
}) {
  const fieldMap = new Map(fields.map(field => [field.key, field]));
  const gridClass = gridClassName || (columns === 1 ? 'grid gap-4' : 'grid gap-4 md:grid-cols-2');
  const hasCustomGridClass = Boolean(gridClassName);
  const visibleRows = layout.sections.flatMap(section =>
    section.rows.map(row => ({ section, row })),
  );

  return (
    <div className={flat ? 'space-y-4' : 'space-y-5'}>
      {flat
        ? visibleRows.map(({ row }, index) => (
            <div key={`${row.id}-${index}`} className={resolveRowGridClass(row, textValues, booleanValues, gridClass, hasCustomGridClass)}>
              {row.columns.map(column => {
                if (!matchesVisibleWhen(column, textValues, booleanValues)) return null;
                const field = fieldMap.get(column.fieldKey);
                if (!field) return null;
                return (
                  <div key={column.fieldKey} className={fieldWrapperClass(column.span)}>
                    <Label htmlFor={field.key} className="text-[13px] font-medium text-slate-700">
                      {field.label}
                      {field.required ? ' *' : ''}
                    </Label>
                    {renderFieldInput(field, textValues, setTextValues, booleanValues, setBooleanValues)}
                  </div>
                );
              })}
            </div>
          ))
        : layout.sections.map(section => (
            <div
              key={section.id}
              className="rounded-2xl border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.92)_100%)] px-4 py-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{section.title}</div>
                  {section.description && <div className="mt-1 text-[11px] leading-5 text-slate-500">{section.description}</div>}
                </div>
                <div className="hidden rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400 md:block">
                  section
                </div>
              </div>
              <div className="space-y-4 pt-4">
                {section.rows.map(row => (
                  <div key={row.id} className={resolveRowGridClass(row, textValues, booleanValues, gridClass, hasCustomGridClass)}>
                    {row.columns.map(column => {
                      if (!matchesVisibleWhen(column, textValues, booleanValues)) return null;
                      const field = fieldMap.get(column.fieldKey);
                      if (!field) return null;
                      return (
                        <div key={column.fieldKey} className={fieldWrapperClass(column.span)}>
                          <Label htmlFor={field.key} className="text-[13px] font-medium text-slate-700">
                            {field.label}
                            {field.required ? ' *' : ''}
                          </Label>
                          {renderFieldInput(field, textValues, setTextValues, booleanValues, setBooleanValues)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
    </div>
  );
}
