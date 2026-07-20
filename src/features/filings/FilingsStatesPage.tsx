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
import { filterFilings } from './filingFilters';
import {
  aggregateFilingListings,
  countDistinctCases,
  countDistinctCasesBy,
} from './filingListings';
import { StateMap } from './StateMap';
import { useFilingFilters } from './useFilingFilters';

export function FilingsStatesPage() {
  const { data } = useDashboardData();
  const filters = useFilingFilters();
  if (!data) return null;

  const { state } = filters.values;
  const filteredFilings = filterFilings(data.filings, filters.values);

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
