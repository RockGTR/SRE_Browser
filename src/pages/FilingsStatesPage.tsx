import { BarChart } from '../components/BarChart';
import { EmptyState } from '../components/EmptyState';
import {
  FilingListingsTable,
  filingListingCsvHeaders,
  filingListingCsvRows,
} from '../components/FilingListingsTable';
import { FilterBar, SearchField, SelectField } from '../components/Filters';
import { PageHeader } from '../components/PageHeader';
import { StateMap } from '../components/StateMap';
import { useDashboardData } from '../data/DashboardData';
import { useUrlFilters } from '../hooks/useUrlFilters';
import type { FilingRole } from '../types/data';
import { downloadCsv } from '../utils/csv';
import {
  aggregateFilingListings,
  countDistinctCases,
  countDistinctCasesBy,
} from '../utils/filings';

const roles: FilingRole[] = ['SRE / Site Reliability', 'DevOps', 'Platform / Infrastructure'];

export function FilingsStatesPage() {
  const { data } = useDashboardData();
  const filters = useUrlFilters();
  if (!data) return null;

  const employerSearch = filters.get('employer');
  const titleSearch = filters.get('title');
  const citySearch = filters.get('city');
  const role = filters.get('role');
  const state = filters.get('state');
  const minimumCompanyFilings = Number(filters.get('minFilings', '0')) || 0;
  const normalizedEmployerSearch = employerSearch.trim().toLowerCase();
  const normalizedTitleSearch = titleSearch.trim().toLowerCase();
  const normalizedCitySearch = citySearch.trim().toLowerCase();

  const dimensionFilteredFilings = data.filings.filter((filing) => (
    (!normalizedEmployerSearch || filing.employerName.toLowerCase().includes(normalizedEmployerSearch))
    && (!normalizedTitleSearch || filing.jobTitle.toLowerCase().includes(normalizedTitleSearch))
    && (!normalizedCitySearch || filing.worksiteCity.toLowerCase().includes(normalizedCitySearch))
    && (!role || filing.roleCategory === role)
    && (!state || filing.worksiteState === state)
  ));
  const preThresholdCounts = countDistinctCasesBy(dimensionFilteredFilings, (filing) => filing.employerId);
  const filteredFilings = minimumCompanyFilings > 0
    ? dimensionFilteredFilings.filter((filing) => (
      (preThresholdCounts.get(filing.employerId) ?? 0) >= minimumCompanyFilings
    ))
    : dimensionFilteredFilings;

  const listings = aggregateFilingListings(filteredFilings);
  const distinctFilings = countDistinctCases(filteredFilings);
  const employerCounts = countDistinctCasesBy(filteredFilings, (filing) => filing.employerId);
  const stateCounts = countDistinctCasesBy(filteredFilings, (filing) => filing.worksiteState);
  const roleCounts = countDistinctCasesBy(
    filteredFilings,
    (filing) => `${filing.worksiteState}\u001f${filing.roleCategory}`,
  );
  const values = Object.fromEntries(data.stateSummary.map((item) => [item.state, stateCounts.get(item.state) ?? 0]));
  const rankedStates = [...stateCounts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
  const ranking = rankedStates.slice(0, 15);
  const stacked = rankedStates.slice(0, 12).map(({ label }) => ({
    label,
    value: roleCounts.get(`${label}\u001fSRE / Site Reliability`) ?? 0,
    secondary: roleCounts.get(`${label}\u001fDevOps`) ?? 0,
    tertiary: roleCounts.get(`${label}\u001fPlatform / Infrastructure`) ?? 0,
  }));
  const selectState = (nextState: string) => filters.set('state', state === nextState ? '' : nextState);

  return (
    <main className="page">
      <PageHeader
        eyebrow="H-1B filing evidence"
        title="Filings by worksite state"
        description="Explore unique filing listings by worksite state. Repeated cases with the same employer, title, role, city, state, and salary values are collapsed into one displayed row."
        actions={(
          <button
            type="button"
            className="primary-button"
            onClick={() => downloadCsv(
              'h1b-filing-listings-by-state.csv',
              filingListingCsvHeaders,
              filingListingCsvRows(listings),
            )}
          >
            Download filtered CSV
          </button>
        )}
      />

      <FilterBar onReset={filters.reset}>
        <SearchField
          label="Employer"
          value={employerSearch}
          onChange={(value) => filters.set('employer', value)}
          placeholder="Search legal employer"
        />
        <SearchField
          label="Job title"
          value={titleSearch}
          onChange={(value) => filters.set('title', value)}
          placeholder="Search filing title"
        />
        <SelectField
          label="Role category"
          value={role}
          onChange={(value) => filters.set('role', value)}
          options={[{ label: 'All roles', value: '' }, ...roles.map((value) => ({ label: value, value }))]}
        />
        <SearchField
          label="Worksite city"
          value={citySearch}
          onChange={(value) => filters.set('city', value)}
          placeholder="Search city"
        />
        <SelectField
          label="Worksite state"
          value={state}
          onChange={(value) => filters.set('state', value)}
          options={[
            { label: 'All states', value: '' },
            ...data.stateSummary
              .filter((item) => item.filingCount > 0)
              .map((item) => ({ label: item.state, value: item.state })),
          ]}
        />
        <SelectField
          label="Minimum matching filings"
          value={minimumCompanyFilings ? String(minimumCompanyFilings) : ''}
          onChange={(value) => filters.set('minFilings', value)}
          options={[
            { label: 'Any filing count', value: '' },
            { label: '2 or more', value: '2' },
            { label: '5 or more', value: '5' },
            { label: '10 or more', value: '10' },
            { label: '25 or more', value: '25' },
          ]}
        />
      </FilterBar>

      <p className="result-summary" role="status" aria-live="polite">
        <strong>{listings.length.toLocaleString()}</strong> unique listings ·{' '}
        <strong>{distinctFilings.toLocaleString()}</strong> distinct matching filings ·{' '}
        <strong>{employerCounts.size.toLocaleString()}</strong> employers
      </p>

      <div className="map-grid">
        <section className="panel">
          <div className="panel-heading"><h2>Distinct matching filings by worksite state</h2></div>
          <StateMap
            values={values}
            selected={state}
            onSelect={selectState}
            label="Filtered H-1B filings by worksite state"
          />
        </section>
        <section className="panel">
          <div className="panel-heading"><h2>Top matching states</h2></div>
          {ranking.length > 0
            ? <BarChart title="Distinct matching filings" data={ranking} onSelect={selectState} />
            : <EmptyState title="No matching states" message="Change or reset the filters to restore state results." />}
        </section>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Coordinated role view</span><h2>Role mix by worksite state</h2></div>
        </div>
        {stacked.length > 0
          ? <BarChart title="Matching role mix" data={stacked} stacked onSelect={selectState} />
          : <EmptyState title="No role mix to display" message="No filings match the active filter combination." />}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Deduplicated drilldown</span><h2>{state ? `${state} filing listings` : 'All filing listings'}</h2></div>
          <span className="muted">One row per unique displayed combination</span>
        </div>
        <FilingListingsTable
          rows={listings}
          emptyMessage="No filing listings match the active filters."
        />
      </section>
    </main>
  );
}
