import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { DataTable } from '../components/DataTable';
import { FilterBar, SearchField, SelectField } from '../components/Filters';
import { KpiCard } from '../components/KpiCard';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { useDirectoryData } from '../data/DirectoryData';
import { useUrlFilters } from '../hooks/useUrlFilters';
import type { CareersStatus, EmployerRecord, FilingRole } from '../types/data';
import { careersSearchUrl } from '../utils/careers';
import { downloadCsv } from '../utils/csv';
import { externalLinkProps, formatNumber } from '../utils/format';

const column = createColumnHelper<EmployerRecord>();

export function DirectoryPage() {
  const { data } = useDirectoryData();
  const filters = useUrlFilters();
  if (!data) return null;

  const search = filters.get('search');
  const status = filters.get('status');
  const role = filters.get('role');
  const state = filters.get('state');
  const minimum = Number(filters.get('min', '0')) || 0;
  const rows = data.employers.filter((employer) => {
    if (search && !`${employer.employerName} ${employer.filingTitles.join(' ')}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (status && employer.careersStatus !== status) return false;
    if (role && employer.roleCounts[role as FilingRole] === 0) return false;
    if (state && !employer.filingStates.includes(state)) return false;
    return employer.totalFilings >= minimum;
  });

  const columns = [
    column.accessor('employerName', {
      header: 'Employer',
      cell: (info) => <Link className="employer-link" to={`/companies/${info.row.original.employerId}`}>{info.getValue()}</Link>,
    }),
    column.accessor('careersStatus', {
      header: 'Careers status',
      cell: (info) => <StatusBadge value={info.getValue()} />,
    }),
    column.accessor('careersPage', {
      header: 'Careers page',
      enableSorting: false,
      cell: (info) => info.getValue() === 'NA'
        ? <a className="search-link" href={careersSearchUrl(info.row.original.employerName)} {...externalLinkProps()}>Search the web ↗</a>
        : <a className="careers-link" href={info.getValue()} {...externalLinkProps()}>Open careers ↗</a>,
    }),
    column.accessor('totalFilings', { header: 'H-1B cases' }),
    column.display({
      id: 'roleMix',
      header: 'Filing role mix',
      cell: (info) => {
        const counts = info.row.original.roleCounts;
        return <span className="role-mix">SRE {counts['SRE / Site Reliability']} · DevOps {counts.DevOps} · Platform {counts['Platform / Infrastructure']}</span>;
      },
    }),
    column.accessor('filingTitles', {
      header: 'Filing titles',
      enableSorting: false,
      cell: (info) => {
        const titles = info.getValue();
        return <span className="title-summary">{titles.slice(0, 2).join(' · ')}{titles.length > 2 ? ` +${titles.length - 2}` : ''}</span>;
      },
    }),
    column.accessor('filingStates', {
      header: 'Filing states',
      enableSorting: false,
      cell: (info) => info.getValue().join(', '),
    }),
    column.accessor('officialWebsite', {
      header: 'Official website',
      enableSorting: false,
      cell: (info) => info.getValue() === 'NA' ? <span className="muted">Not verified</span> : <a href={info.getValue()} {...externalLinkProps()}>Visit ↗</a>,
    }),
  ];

  const statuses: CareersStatus[] = ['Careers page verified', 'Official website only', 'Needs research'];
  const states = [...new Set(data.employers.flatMap((employer) => employer.filingStates))].sort();
  const exportRows = () => downloadCsv(
    'h1b-sre-careers-directory.csv',
    ['Employer', 'Careers Status', 'Careers Page', 'Official Website', 'H-1B Cases', 'SRE', 'DevOps', 'Platform / Infrastructure', 'Filing Titles', 'Filing States', 'Salary Floor', 'Salary Ceiling', 'Verified At', 'Verification Source'],
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

  const careersPagesNeeded = data.quality.officialWebsiteOnly + data.quality.needsResearch;
  return (
    <div className="page directory-page">
      <PageHeader
        eyebrow="FY2026 Q2 employer directory"
        title="Official careers pages for H-1B SRE employers"
        description="Browse 515 employers with SRE, DevOps, or platform H-1B filing evidence. Open a verified careers page or identify the companies that still need research."
        actions={<button type="button" className="primary-button" onClick={exportRows}>Download directory</button>}
      />

      <section className="kpi-grid" aria-label="Careers-page coverage">
        <KpiCard label="Employers" value={formatNumber(data.quality.totalEmployers)} note="Distinct legal employers" icon="01" />
        <KpiCard label="Careers pages verified" value={formatNumber(data.quality.verifiedCareersPages)} note={`${data.quality.careersCoveragePercent}% coverage`} icon="02" />
        <KpiCard label="Careers pages to find" value={formatNumber(careersPagesNeeded)} note={`${data.quality.officialWebsiteOnly} already have an official website`} icon="03" />
        <KpiCard label="H-1B cases" value={formatNumber(data.metadata.nationalDistinctCaseCount)} note="SRE, DevOps, and platform roles" icon="04" />
      </section>

      <section className="directory-panel" aria-labelledby="directory-heading">
        <div className="directory-heading">
          <div><span className="eyebrow">Careers directory</span><h2 id="directory-heading">Find a company</h2></div>
          <p><strong>{formatNumber(rows.length)}</strong> matching employers</p>
        </div>
        <FilterBar onReset={filters.reset}>
          <SearchField label="Company or filing title" value={search} onChange={(value) => filters.set('search', value)} placeholder="Try Equifax or Site Reliability Engineer" />
          <SelectField label="Careers status" value={status} onChange={(value) => filters.set('status', value)} options={[{ label: 'Any status', value: '' }, ...statuses.map((value) => ({ label: value, value }))]} />
          <SelectField label="Filing role" value={role} onChange={(value) => filters.set('role', value)} options={[{ label: 'Any role', value: '' }, { label: 'SRE / Site Reliability', value: 'SRE / Site Reliability' }, { label: 'DevOps', value: 'DevOps' }, { label: 'Platform / Infrastructure', value: 'Platform / Infrastructure' }]} />
          <SelectField label="Filing state" value={state} onChange={(value) => filters.set('state', value)} options={[{ label: 'Any state', value: '' }, ...states.map((value) => ({ label: value, value }))]} />
          <label className="field"><span>Minimum H-1B cases</span><input type="number" min="0" value={minimum} onChange={(event) => filters.set('min', event.target.value)} /></label>
        </FilterBar>
        <DataTable data={rows} columns={columns} pageSize={20} getRowId={(row) => row.employerId} />
      </section>
    </div>
  );
}
