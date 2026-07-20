import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DataQuality, EmployerRecord, Metadata } from '../types/data';

export interface DirectoryData {
  employers: EmployerRecord[];
  quality: DataQuality;
  metadata: Metadata;
}

interface DirectoryDataState {
  data: DirectoryData | null;
  loading: boolean;
  error: string | null;
}

const DirectoryDataContext = createContext<DirectoryDataState>({ data: null, loading: true, error: null });

async function loadJson<T>(name: string): Promise<T> {
  const response = await fetch(`/data/${name}.json`);
  if (!response.ok) throw new Error(`${name}.json returned HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

export function DirectoryDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DirectoryDataState>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadJson<EmployerRecord[]>('employers'),
      loadJson<DataQuality>('data-quality'),
      loadJson<Metadata>('metadata'),
    ]).then(([employers, quality, metadata]) => {
      if (!cancelled) setState({ data: { employers, quality, metadata }, loading: false, error: null });
    }).catch((error: unknown) => {
      if (!cancelled) setState({ data: null, loading: false, error: error instanceof Error ? error.message : 'Unable to load directory data.' });
    });
    return () => { cancelled = true; };
  }, []);

  return <DirectoryDataContext.Provider value={state}>{children}</DirectoryDataContext.Provider>;
}

export function useDirectoryData(): DirectoryDataState {
  return useContext(DirectoryDataContext);
}

export function useEmployerMap(): Map<string, EmployerRecord> {
  const { data } = useDirectoryData();
  return useMemo(() => new Map(data?.employers.map((employer) => [employer.employerId, employer]) ?? []), [data]);
}
