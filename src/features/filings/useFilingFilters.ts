import { useUrlFilters } from '../../hooks/useUrlFilters';
import type { FilingFilterValues } from './filingFilters';

export type FilingFilterKey = 'employer' | 'title' | 'city' | 'role' | 'state' | 'minFilings';

export function useFilingFilters() {
  const urlFilters = useUrlFilters();
  const values: FilingFilterValues = {
    employerSearch: urlFilters.get('employer'),
    titleSearch: urlFilters.get('title'),
    citySearch: urlFilters.get('city'),
    role: urlFilters.get('role'),
    state: urlFilters.get('state'),
    minimumCompanyFilings: Number(urlFilters.get('minFilings', '0')) || 0,
  };

  return {
    values,
    set: (key: FilingFilterKey, value: string) => urlFilters.set(key, value),
    reset: urlFilters.reset,
  };
}
