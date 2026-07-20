import { BarChart } from '../../components/BarChart';
import { EmptyState } from '../../components/EmptyState';
import {
  FilingListingsTable,
  filingListingCsvHeaders,
  filingListingCsvRows,
} from './FilingListingsTable';
import { PageHeader } from '../../components/PageHeader';
import { useDashboardData } from '../../data/DashboardData';
import { downloadCsv } from '../../utils/csv';
import { FilingFilterBar } from './FilingFilterBar';
import { ProportionalStateDotMap } from './ProportionalStateDotMap';
import { filterFilings } from './filingFilters';
import {
  aggregateFilingListings,
  countDistinctCases,
  countDistinctCasesBy,
} from './filingListings';
import { useFilingFilters } from './useFilingFilters';

export function FilingsCompaniesPage() {
  const { data } = useDashboardData();
  const filters = useFilingFilters();
  if (!data) return null;

  const { employerSearch, state } = filters.values;
  const filteredFilings = filterFilings(data.filings, filters.values);

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

      <FilingFilterBar
        values={filters.values}
        stateOptions={data.stateSummary.filter((item) => item.filingCount > 0).map((item) => item.state)}
        onSet={filters.set}
        onReset={filters.reset}
      />

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
