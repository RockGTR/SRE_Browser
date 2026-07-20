import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { DataQuality, EmployerRecord, FilingRecord, Metadata, StateSummary } from '../types/data';

export interface DashboardData {
  employers: EmployerRecord[];
  filings: FilingRecord[];
  stateSummary: StateSummary[];
  quality: DataQuality;
  metadata: Metadata;
}

interface DataContextValue {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
}

const DataContext = createContext<DataContextValue>({ data: null, loading: true, error: null });

async function loadJson<T>(name: string): Promise<T> {
  const response = await fetch(`/data/${name}.json`);
  if (!response.ok) throw new Error(`${name}.json returned HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<DataContextValue>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      loadJson<EmployerRecord[]>('employers'),
      loadJson<FilingRecord[]>('filings'),
      loadJson<StateSummary[]>('state-summary'),
      loadJson<DataQuality>('data-quality'),
      loadJson<Metadata>('metadata'),
    ]).then(([employers, filings, stateSummary, quality, metadata]) => {
      if (!cancelled) {
        setValue({
          data: { employers, filings, stateSummary, quality, metadata },
          loading: false,
          error: null,
        });
      }
    }).catch((error: unknown) => {
      if (!cancelled) {
        setValue({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Unable to load dashboard data.',
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDashboardData(): DataContextValue {
  return useContext(DataContext);
}
