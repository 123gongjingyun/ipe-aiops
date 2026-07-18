import { useEffect, useState } from 'react';
import { getRoleDefinitions, onRoleDefinitionsSync } from '../store/role-definitions';
import type { RoleDefinition } from '../types';

export function useRoleDefinitions() {
  const [roles, setRoles] = useState<RoleDefinition[]>(() => getRoleDefinitions());

  useEffect(() => {
    setRoles(getRoleDefinitions());
    return onRoleDefinitionsSync(() => setRoles(getRoleDefinitions()));
  }, []);

  return roles;
}
