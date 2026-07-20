import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { FilterBar, SearchField, SelectField } from '../components/Filters';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { useDashboardData } from '../data/DashboardData';
import { useUrlFilters } from '../hooks/useUrlFilters';
import type { CareersStatus, EmployerRecord, FilingRole } from '../types/data';
import { downloadCsv } from '../utils/csv';
import { externalLinkProps, formatNumber } from '../utils/format';

const column = createColumnHelper<EmployerRecord>();

const careersStatuses: CareersStatus[] = [
  'Careers page verified',
  'Official website only',
  'Needs research',
];

function careersSearchUrl(employerName: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${employerName} careers jobs`)}`;
}

function CareersDestination({ employer }: { employer: EmployerRecord }) {
  if (employer.careersStatus === 'Careers page verified') {
    return <a className="primary-link" href={employer.careersPage} {...externalLinkProps()}>Open careers page ↗</a>;
  }

  return (
    <div className="action-stack">
      {employer.careersStatus === 'Official website only' && (
        <a href={employer.officialWebsite} {...externalLinkProps()}>Official website ↗</a>
      )}
      <a href={careersSearchUrl(employer.employerName)} {...externalLinkProps()}>Research careers page ↗</a>
    </div>
  );
}

export function CompaniesPage() {
  const { data } = useDashboardData();
  const filters = useUrlFilters();
  if (!data) return null;

  const search = filters.get('search');
  const status = filters.get('status');
  const role = filters.get('role');
  const state = filters.get('state');
  const minimum = Number(filters.get('min', '0')) || 0;
  const normalizedSearch = search.trim().toLowerCase();

  const rows = data.employers.filter((employer) => {
    if (normalizedSearch && !`${employer.employerName} ${employer.filingTitles.join(' ')}`.toLowerCase().includes(normalizedSearch)) return false;
    if (status && employer.careersStatus !== status) return false;
    if (role && employer.roleCounts[role as FilingRole] === 0) return false;
    if (state && !employer.filingStates.includes(state)) return false;
    return employer.totalFilings >= minimum;
  });

  const columns = [
    column.accessor('employerName', {
      header: 'Employer',
      cell: (info) => <Link className="primary-link" to={`/companies/${info.row.original.employerId}`}>{info.getValue()}</Link>,
    }),
    column.accessor('careersStatus', {
      header: 'Careers-page status',
      cell: (info) => <StatusBadge value={info.getValue()} />,
    }),
    column.display({
      id: 'careersDestination',
      header: 'Official careers destination',
      cell: (info) => <CareersDestination employer={info.row.original} />,
    }),
    column.accessor('totalFilings', { header: 'H-1B cases' }),
    column.accessor((row) => row.roleCounts['SRE / Site Reliability'], { id: 'sre', header: 'SRE' }),
    column.accessor((row) => row.roleCounts.DevOps, { id: 'devops', header: 'DevOps' }),
    column.accessor((row) => row.roleCounts['Platform / Infrastructure'], { id: 'platform', header: 'Platform' }),
    column.accessor('filingTitles', {
      header: 'Historical filing titles',
      enableSorting: false,
      cell: (info) => {
        const titles = info.getValue();
        return <span title={titles.join(' · ')}>{titles.slice(0, 2).join(' · ')}{titles.length > 2 ? ` +${titles.length - 2}` : ''}</span>;
      },
    }),
    column.accessor('filingStates', {
      header: 'Filing states',
      enableSorting: false,
      cell: (info) => info.getValue().join(', '),
    }),
  ];

  const exportRows = () => downloadCsv(
    'h1b-sre-employers.csv',
    ['Employer', 'Careers Status', 'Careers Page', 'Official Website', 'H-1B Cases', 'SRE', 'DevOps', 'Platform / Infrastructure', 'Historical Filing Titles', 'Filing States', 'Salary Floor', 'Salary Ceiling', 'Verified At', 'Verification Source'],
    rows.map((employer) => [
      employer.employerName,
      employer.careersStatus,
      employer.careersPage,
      employer.officialWebsite,
      employer.totalFilings,
      employer.roleCounts['SRE / Site Reliability'],
      employer.roleCounts.DevOps,
      employer.roleCounts['Platform / Infrastructure'],
      employer.filingTitles.join('; '),
      employer.filingStates.join('; '),
      employer.salaryFloor,
      employer.salaryCeiling,
      employer.verifiedAt,
      employer.verificationSource,
    ]),
  );

  const states = [...new Set(data.employers.flatMap((employer) => employer.filingStates))].sort();
  const statusCounts = Object.fromEntries(careersStatuses.map((value) => [
    value,
    data.employers.filter((employer) => employer.careersStatus === value).length,
  ])) as Record<CareersStatus, number>;

  return (
    <main className="page">
      <PageHeader
        eyebrow="FY2026 Q2 employer universe"
        title="H-1B company browser"
        description="Browse employers by H-1B filing history, role, state, and historical filing title, with a verified official careers destination where available."
        actions={<button type="button" className="primary-button" onClick={exportRows}>Download filtered CSV</button>}
      />

      <section className="coverage-strip compact" aria-label="Careers-page coverage">
        {careersStatuses.map((value) => (
          <article key={value}>
            <StatusBadge value={value} />
            <strong>{formatNumber(statusCounts[value])}</strong>
            <span>{value === 'Careers page verified' ? 'official careers destinations' : value === 'Official website only' ? 'company sites awaiting a careers link' : 'employers awaiting official-site research'}</span>
          </article>
        ))}
      </section>

      <FilterBar onReset={filters.reset}>
        <SearchField label="Company or historical filing title" value={search} onChange={(value) => filters.set('search', value)} placeholder="Try Equifax or Site Reliability Engineer" />
        <SelectField label="Careers status" value={status} onChange={(value) => filters.set('status', value)} options={[{ label: 'Any status', value: '' }, ...careersStatuses.map((value) => ({ label: value, value }))]} />
        <SelectField label="Filing role" value={role} onChange={(value) => filters.set('role', value)} options={[{ label: 'Any role', value: '' }, { label: 'SRE / Site Reliability', value: 'SRE / Site Reliability' }, { label: 'DevOps', value: 'DevOps' }, { label: 'Platform / Infrastructure', value: 'Platform / Infrastructure' }]} />
        <SelectField label="Filing state" value={state} onChange={(value) => filters.set('state', value)} options={[{ label: 'Any state', value: '' }, ...states.map((value) => ({ label: value, value }))]} />
        <label className="field"><span>Minimum H-1B cases</span><input type="number" min="0" value={minimum} onChange={(event) => filters.set('min', event.target.value)} /></label>
      </FilterBar>
      <div className="result-count"><strong>{formatNumber(rows.length)}</strong> employers match</div>
      <DataTable data={rows} columns={columns} pageSize={20} getRowId={(row) => row.employerId} />
    </main>
  );
}
