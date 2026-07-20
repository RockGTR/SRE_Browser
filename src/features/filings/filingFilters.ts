import type { FilingRecord, FilingRole } from '../../types/data';
import { countDistinctCasesBy } from './filingListings';

export const FILING_ROLES: FilingRole[] = [
  'SRE / Site Reliability',
  'DevOps',
  'Platform / Infrastructure',
];

export interface FilingFilterValues {
  employerSearch: string;
  titleSearch: string;
  citySearch: string;
  role: string;
  state: string;
  minimumCompanyFilings: number;
}

export function filterFilings(
  filings: readonly FilingRecord[],
  filters: FilingFilterValues,
): FilingRecord[] {
  const employerSearch = filters.employerSearch.trim().toLowerCase();
  const titleSearch = filters.titleSearch.trim().toLowerCase();
  const citySearch = filters.citySearch.trim().toLowerCase();
  const dimensionFiltered = filings.filter((filing) => (
    (!employerSearch || filing.employerName.toLowerCase().includes(employerSearch))
    && (!titleSearch || filing.jobTitle.toLowerCase().includes(titleSearch))
    && (!citySearch || filing.worksiteCity.toLowerCase().includes(citySearch))
    && (!filters.role || filing.roleCategory === filters.role)
    && (!filters.state || filing.worksiteState === filters.state)
  ));

  if (filters.minimumCompanyFilings <= 0) return dimensionFiltered;

  const companyCounts = countDistinctCasesBy(dimensionFiltered, (filing) => filing.employerId);
  return dimensionFiltered.filter((filing) => (
    (companyCounts.get(filing.employerId) ?? 0) >= filters.minimumCompanyFilings
  ));
}
