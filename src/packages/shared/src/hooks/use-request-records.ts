import { useCallback, useEffect, useState } from 'react';
import { getRequestRecords, onRequestRecordsSync } from '../store/request-records';
import type { RequestRecord } from '../store/request-records';

export function useRequestRecords() {
  const [records, setRecords] = useState<RequestRecord[]>([]);

  const refresh = useCallback(() => {
    setRecords(getRequestRecords());
  }, []);

  useEffect(() => {
    refresh();
    return onRequestRecordsSync(refresh);
  }, [refresh]);

  return { records, refresh };
}
