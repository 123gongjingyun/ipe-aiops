import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  RotateCcw,
  Save,
  Shield,
} from 'lucide-react';
import {
  Button,
  getRoleDefinitions,
  type PermissionMatrix,
  type PermissionGroup,
  type RoleKey,
  type RolePermissionMatrixEntry,
  ALL_PERMISSION_GROUPS,
  buildDefaultPermissionMatrix,
  getPermissionMatrix,
  setPermissionMatrix,
  clearPermissionMatrix,
  isMenuPermissionKey,
} from '@aiops/shared';

interface RoleOption {
  key: RoleKey;
  label: string;
  description: string;
}

function useRoleOptions(): RoleOption[] {
  const [roles, setRoles] = useState(() => getRoleDefinitions());

  useEffect(() => {
    function refresh() {
      setRoles(getRoleDefinitions());
    }
    refresh();
    window.addEventListener('ipe_role_definitions_updated', refresh);
    return () => window.removeEventListener('ipe_role_definitions_updated', refresh);
  }, []);

  return useMemo(
    () =>
      roles.map(role => ({
        key: role.key as RoleKey,
        label: role.name,
        description: role.summary,
      })),
    [roles]
  );
}

function buildEmptyEntry(role: RoleOption): RolePermissionMatrixEntry {
  return {
    roleKey: role.key,
    roleLabel: role.label,
    menuKeys: [],
    actionKeys: [],
  };
}

function cloneMatrix(matrix: PermissionMatrix): PermissionMatrix {
  return {
    ...matrix,
    entries: matrix.entries.map(entry => ({
      ...entry,
      menuKeys: [...entry.menuKeys],
      actionKeys: [...entry.actionKeys],
    })),
  };
}

export function PermissionMatrixPanel() {
  const roles = useRoleOptions();
  const [activeRoleKey, setActiveRoleKey] = useState<RoleKey | null>(roles[0]?.key ?? null);
  const [matrix, setMatrix] = useState<PermissionMatrix>(() => {
    const stored = getPermissionMatrix();
    return stored ? cloneMatrix(stored) : buildDefaultPermissionMatrix();
  });
  const [saved, setSaved] = useState(false);

  const activeRole = useMemo(
    () => roles.find(r => r.key === activeRoleKey) ?? roles[0],
    [roles, activeRoleKey]
  );

  const activeEntry = useMemo(() => {
    if (!activeRole) return null;
    return (
      matrix.entries.find(e => e.roleKey === activeRole.key) ?? buildEmptyEntry(activeRole)
    );
  }, [matrix, activeRole]);

  function updateEntry(next: RolePermissionMatrixEntry) {
    setMatrix(prev => {
      const entries = prev.entries.filter(e => e.roleKey !== next.roleKey);
      return { ...prev, entries: [...entries, next] };
    });
    setSaved(false);
  }

  function toggleKey(key: string, checked: boolean) {
    if (!activeEntry) return;
    const isMenu = isMenuPermissionKey(key);
    const next: RolePermissionMatrixEntry = {
      ...activeEntry,
      menuKeys: isMenu
        ? checked
          ? [...activeEntry.menuKeys, key as import('@aiops/shared').MenuPermissionKey]
          : activeEntry.menuKeys.filter(k => k !== key)
        : [...activeEntry.menuKeys],
      actionKeys: !isMenu
        ? checked
          ? [...activeEntry.actionKeys, key as import('@aiops/shared').ActionPermissionKey]
          : activeEntry.actionKeys.filter(k => k !== key)
        : [...activeEntry.actionKeys],
    };
    updateEntry(next);
  }

  function handleSave() {
    setPermissionMatrix({
      ...matrix,
      version: (matrix.version || 0) + 1,
      updatedAt: new Date().toISOString(),
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    if (!window.confirm('确定恢复为默认权限矩阵吗？当前自定义配置将被覆盖。')) return;
    const defaults = buildDefaultPermissionMatrix();
    setMatrix(cloneMatrix(defaults));
    setPermissionMatrix({
      ...defaults,
      version: (defaults.version || 0) + 1,
      updatedAt: new Date().toISOString(),
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  function handleClear() {
    if (!window.confirm('确定清除本地权限矩阵覆盖吗？恢复为代码默认权限。')) return;
    clearPermissionMatrix();
    const defaults = buildDefaultPermissionMatrix();
    setMatrix(cloneMatrix(defaults));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  const isDirty = useMemo(() => {
    const stored = getPermissionMatrix();
    if (!stored) return matrix.entries.length > 0;
    return JSON.stringify(stored) !== JSON.stringify(matrix);
  }, [matrix]);

  if (roles.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        暂无可配置角色
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 顶部说明 */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">前端 Mock 阶段权限配置</p>
            <p className="mt-1 text-amber-700">
              当前权限矩阵保存在浏览器本地存储中，刷新页面或重新登录后生效。后续接入后端后会改为数据库存储。
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[240px,1fr]">
        {/* 角色列表 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Shield className="h-4 w-4 text-primary" />
            选择角色
          </h3>
          <div className="space-y-1">
            {roles.map(role => (
              <button
                key={role.key}
                onClick={() => setActiveRoleKey(role.key)}
                className={`flex w-full flex-col items-start rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  activeRole?.key === role.key
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="font-medium">{role.label}</span>
                <span className="mt-0.5 text-xs text-slate-500 line-clamp-2">{role.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 权限矩阵 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {activeRole && activeEntry ? (
            <>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{activeRole.label}</h3>
                  <p className="text-sm text-slate-500">{activeRole.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClear}
                    className="gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    清除覆盖
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="gap-1.5"
                  >
                    恢复默认
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!isDirty && saved}
                    className="gap-1.5 bg-[#C8102E] text-white hover:bg-[#9F1027]"
                  >
                    {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                    {saved ? '已保存' : '保存权限'}
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                {ALL_PERMISSION_GROUPS.map(group => (
                  <PermissionGroupSection
                    key={group.key}
                    group={group}
                    selectedKeys={[...activeEntry.menuKeys, ...activeEntry.actionKeys]}
                    onToggle={toggleKey}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-slate-500">请选择左侧角色</div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PermissionGroupSectionProps {
  group: PermissionGroup;
  selectedKeys: string[];
  onToggle: (key: string, checked: boolean) => void;
}

function PermissionGroupSection({ group, selectedKeys, onToggle }: PermissionGroupSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const allSelected = group.items.every(item => selectedKeys.includes(item.key));
  const someSelected = group.items.some(item => selectedKeys.includes(item.key)) && !allSelected;

  function toggleAll(checked: boolean) {
    group.items.forEach(item => onToggle(item.key, checked));
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={allSelected}
            ref={el => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={e => {
              e.stopPropagation();
              toggleAll(e.target.checked);
            }}
            className="h-4 w-4 rounded border-slate-300 text-[#C8102E] focus:ring-[#C8102E]/20"
          />
          <span className="font-medium text-slate-900">{group.label}</span>
          <span className="text-xs text-slate-500">
            {group.items.filter(item => selectedKeys.includes(item.key)).length}/{group.items.length}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div className="grid gap-2 border-t border-slate-200 px-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
          {group.items.map(item => {
            const checked = selectedKeys.includes(item.key);
            return (
              <label
                key={item.key}
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors ${
                  checked
                    ? 'border-[#C8102E]/30 bg-[#FFF5F6]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={e => onToggle(item.key, e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#C8102E] focus:ring-[#C8102E]/20"
                />
                <div className="min-w-0">
                  <div className={`text-sm font-medium ${checked ? 'text-[#9F1027]' : 'text-slate-700'}`}>
                    {item.label}
                  </div>
                  {item.description && (
                    <div className="mt-0.5 text-xs text-slate-500">{item.description}</div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
