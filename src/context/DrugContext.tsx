'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Drug } from '@/lib/types';
import { getCachedDrugs } from '@/lib/drugStorage';

interface DrugContextValue {
  drugs: Drug[];
}

const DrugContext = createContext<DrugContextValue | undefined>(undefined);

export function DrugProvider({ children }: { children: React.ReactNode }) {
  const [drugs, setDrugs] = useState<Drug[]>([]);

  useEffect(() => {
    setDrugs(getCachedDrugs());

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'ctms_cached_drugs_v1') setDrugs(getCachedDrugs());
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return <DrugContext.Provider value={{ drugs }}>{children}</DrugContext.Provider>;
}

export function useDrugs() {
  const context = useContext(DrugContext);
  if (!context) throw new Error('useDrugs must be used within a DrugProvider');
  return context;
}
