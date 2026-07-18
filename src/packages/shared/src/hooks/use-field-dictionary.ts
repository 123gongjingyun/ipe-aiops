import { useEffect, useState } from 'react';
import { getFieldDictionaryEntries, onFieldDictionarySync } from '../store/field-dictionary';
import type { FieldDictionaryEntry } from '../types';

export function useFieldDictionary() {
  const [entries, setEntries] = useState<FieldDictionaryEntry[]>(() => getFieldDictionaryEntries());

  useEffect(() => {
    setEntries(getFieldDictionaryEntries());
    return onFieldDictionarySync(() => setEntries(getFieldDictionaryEntries()));
  }, []);

  return entries;
}
