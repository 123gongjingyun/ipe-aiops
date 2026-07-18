import { useEffect, useState } from 'react';
import { getConfigProfileGroups, onConfigProfileGroupsSync } from '../store/config-profiles';
import type { ConfigProfileGroup } from '../types';

export function useConfigProfileGroups() {
  const [groups, setGroups] = useState<ConfigProfileGroup[]>(() => getConfigProfileGroups());

  useEffect(() => {
    setGroups(getConfigProfileGroups());
    return onConfigProfileGroupsSync(() => setGroups(getConfigProfileGroups()));
  }, []);

  return groups;
}
