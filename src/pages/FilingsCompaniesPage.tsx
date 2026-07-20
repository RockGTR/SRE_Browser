import { BarChart } from '../components/BarChart';
import { EmptyState } from '../components/EmptyState';
import {
  FilingListingsTable,
  filingListingCsvHeaders,
  filingListingCsvRows,
} from '../components/FilingListingsTable';
import { FilterBar, SearchField, SelectField } from '../components/Filters';
import { PageHeader } from '../components/PageHeader';
import { ProportionalStateDotMap } from '../components/ProportionalStateDotMap';
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

export function FilingsCompaniesPage() {
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
  const employerCounts = countDistinctCasesBy(filteredFilings, (filing) => filing.employerId);
  const stateCounts = countDistinctCasesBy(filteredFilings, (filing) => filing.worksiteState);
  const roleCounts = countDistinctCasesBy(
    filteredFilings,
    (filing) => `${filing.employerId}\u001f${filing.roleCategory}`,
  );
  const employerNames = new Map(data.employers.map((employer) => [employer.employerId, employer.employerName]));
  const topEmployers = [...employerCounts.entries()]
    .map(([employerId, value]) => ({ employerId, label: employerNames.get(employerId) ?? employerId, value }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
    .slice(0, 15);
  const employerBars = topEmployers.map(({ label, value }) => ({ label, value }));
  const roleBars = topEmployers.map(({ employerId, label }) => ({
    label,
    value: roleCounts.get(`${employerId}\u001fSRE / Site Reliability`) ?? 0,
    secondary: roleCounts.get(`${employerId}\u001fDevOps`) ?? 0,
    tertiary: roleCounts.get(`${employerId}\u001fPlatform / Infrastructure`) ?? 0,
  }));
  const mapValues = Object.fromEntries(stateCounts);
  const distinctFilings = countDistinctCases(filteredFilings);

  const selectEmployer = (name: string) => {
    filters.set('employer', employerSearch === name ? '' : name);
  };
  const selectState = (nextState: string) => {
    filters.set('state', state === nextState ? '' : nextState);
  };

  return (
    <main className="page">
      <PageHeader
        eyebrow="H-1B filing evidence"
        title="Filings by employer"
        description="Explore unique historical filing listings by legal employer. The table, charts, and worksite-state dots all use the same active filters; repeated cases with identical displayed fields appear only once."
        actions={(
          <button
            type="button"
            className="primary-button"
            onClick={() => downloadCsv(
              'h1b-filing-listings-by-employer.csv',
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
          <div className="panel-heading">
            <div><span className="eyebrow">Filtered worksite evidence</span><h2>Filing locations</h2></div>
          </div>
          <ProportionalStateDotMap
            values={mapValues}
            selected={state}
            onSelect={selectState}
            label="Filtered distinct H-1B filings by worksite state"
            filteredFilingCount={distinctFilings}
          />
        </section>
        <section className="panel">
          <div className="panel-heading"><h2>Top matching employers</h2></div>
          {employerBars.length > 0
            ? <BarChart title="Distinct matching filings" data={employerBars} onSelect={selectEmployer} />
            : <EmptyState title="No matching employers" message="Change or reset the filters to restore employer results." />}
        </section>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Coordinated role view</span><h2>Role mix by employer</h2></div>
        </div>
        {roleBars.length > 0
          ? <BarChart title="Matching role mix" data={roleBars} stacked onSelect={selectEmployer} />
          : <EmptyState title="No role mix to display" message="No filings match the active filter combination." />}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Deduplicated drilldown</span><h2>Filtered filing listings</h2></div>
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
