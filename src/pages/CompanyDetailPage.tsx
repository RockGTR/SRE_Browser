import { createColumnHelper } from '@tanstack/react-table';
import { Link, useParams } from 'react-router-dom';
import { BarChart } from '../components/BarChart';
import { DataTable } from '../components/DataTable';
import { EmptyState } from '../components/EmptyState';
import { FilingListingsTable } from '../components/FilingListingsTable';
import { KpiCard } from '../components/KpiCard';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { useDashboardData } from '../data/DashboardData';
import { externalLinkProps, formatCurrency, formatDate } from '../utils/format';
import { aggregateFilingListings } from '../utils/filings';

interface FilingTitleRow {
  title: string;
  filingCount: number;
  roles: string;
}

const titleColumn = createColumnHelper<FilingTitleRow>();

function careersSearchUrl(employerName: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${employerName} careers jobs`)}`;
}

function evidenceLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Verification evidence';
  }
}

export function CompanyDetailPage() {
  const { employerId } = useParams();
  const { data } = useDashboardData();
  if (!data) return null;

  const employer = data.employers.find((item) => item.employerId === employerId);
  if (!employer) {
    return <main className="page"><EmptyState title="Employer not found" message="The requested employer is not present in the FY2026 Q2 H-1B dataset." /></main>;
  }

  const filings = data.filings.filter((filing) => filing.employerId === employer.employerId);
  const filingListings = aggregateFilingListings(filings);
  const hasCareersPage = employer.careersStatus === 'Careers page verified';
  const hasOfficialWebsite = employer.officialWebsite !== 'NA';

  const casesByState = new Map<string, Set<string>>();
  const titleStats = new Map<string, { cases: Set<string>; roles: Set<string> }>();
  for (const filing of filings) {
    if (!casesByState.has(filing.worksiteState)) casesByState.set(filing.worksiteState, new Set());
    casesByState.get(filing.worksiteState)!.add(filing.caseNumber);

    if (!titleStats.has(filing.jobTitle)) titleStats.set(filing.jobTitle, { cases: new Set(), roles: new Set() });
    titleStats.get(filing.jobTitle)!.cases.add(filing.caseNumber);
    titleStats.get(filing.jobTitle)!.roles.add(filing.roleCategory);
  }

  const stateCounts = [...casesByState.entries()]
    .map(([label, caseNumbers]) => ({ label, value: caseNumbers.size }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
  const filingTitles: FilingTitleRow[] = employer.filingTitles.map((title) => {
    const stats = titleStats.get(title);
    return {
      title,
      filingCount: stats?.cases.size ?? 0,
      roles: [...(stats?.roles ?? [])].sort().join(', '),
    };
  });

  const titleColumns = [
    titleColumn.accessor('title', { header: 'Historical filing title' }),
    titleColumn.accessor('filingCount', { header: 'Filings with title' }),
    titleColumn.accessor('roles', { header: 'Role classification' }),
  ];

  return (
    <main className="page">
      <Link to="/companies" className="back-link">← Company browser</Link>
      <PageHeader
        eyebrow="Company overview"
        title={employer.employerName}
        description="Official careers-page verification alongside the employer’s complete H-1B SRE, DevOps, and platform filing context."
        actions={<StatusBadge value={employer.careersStatus} />}
      />

      <section className="panel" aria-labelledby="careers-destination-heading">
        <div className="panel-heading">
          <div><span className="eyebrow">Official destination</span><h2 id="careers-destination-heading">{hasCareersPage ? 'Verified careers page' : 'Careers page needs research'}</h2></div>
          <StatusBadge value={employer.careersStatus} />
        </div>
        <p className="panel-intro">{hasCareersPage
          ? 'This first-party careers destination is backed by the verification record below.'
          : 'No careers URL is presented as official until it has supporting first-party evidence.'}</p>
        <div className="action-row">
          {hasCareersPage && <a className="primary-button" href={employer.careersPage} {...externalLinkProps()}>Open official careers page ↗</a>}
          {!hasCareersPage && hasOfficialWebsite && <a className="primary-button" href={employer.officialWebsite} {...externalLinkProps()}>Visit official website ↗</a>}
          {!hasCareersPage && <a className="secondary-button" href={careersSearchUrl(employer.employerName)} {...externalLinkProps()}>Research careers page on Google ↗</a>}
        </div>
      </section>

      <section className="kpi-grid compact" aria-label="Employer H-1B filing summary">
        <KpiCard label="Distinct H-1B cases" value={employer.totalFilings} note="FY2026 Q2 cumulative" icon="01" />
        <KpiCard label="Historical filing titles" value={employer.filingTitles.length} note="Unique titles, not live openings" icon="02" />
        <KpiCard label="Filing states" value={employer.filingStates.length} note="A case may appear in multiple states" icon="03" />
        <KpiCard label="Annualized salary range" value={`${formatCurrency(employer.salaryFloor)}–${formatCurrency(employer.salaryCeiling)}`} icon="04" />
      </section>

      <section className="panel" aria-labelledby="verification-heading">
        <div className="panel-heading"><div><span className="eyebrow">Link record</span><h2 id="verification-heading">Careers-page verification</h2></div></div>
        <div className="link-row">
          <span>Careers page: {hasCareersPage ? <a href={employer.careersPage} {...externalLinkProps()}>{employer.careersPage} ↗</a> : 'Not verified'}</span>
          <span>Official website: {hasOfficialWebsite ? <a href={employer.officialWebsite} {...externalLinkProps()}>{employer.officialWebsite} ↗</a> : 'Not verified'}</span>
          <span>Verified on: {formatDate(employer.verifiedAt)}</span>
          <span>Verification source: {employer.verificationSource || 'Not recorded'}</span>
        </div>
        <p><strong>Verification notes:</strong> {employer.verificationNotes || 'No independent ownership evidence has been recorded yet.'}</p>
        {employer.evidenceUrls.length > 0 && (
          <div className="prose-panel">
            <strong>Verification evidence</strong>
            <ul>{employer.evidenceUrls.map((url, index) => <li key={`${url}-${index}`}><a href={url} {...externalLinkProps()}>{evidenceLabel(url)} ↗</a></li>)}</ul>
          </div>
        )}
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading"><div><span className="eyebrow">Distinct cases</span><h2>Role mix</h2></div></div>
          <BarChart title="Distinct H-1B cases" horizontal={false} data={[
            { label: 'SRE', value: employer.roleCounts['SRE / Site Reliability'] },
            { label: 'DevOps', value: employer.roleCounts.DevOps },
            { label: 'Platform', value: employer.roleCounts['Platform / Infrastructure'] },
          ]} />
        </section>
        <section className="panel">
          <div className="panel-heading"><div><span className="eyebrow">Case-state pairs</span><h2>Filing locations</h2></div></div>
          {stateCounts.length ? <BarChart title="Distinct H-1B cases by state" data={stateCounts.slice(0, 10)} /> : <EmptyState title="No filing locations" message="No worksite-state rows are available for this employer." />}
        </section>
      </div>

      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">Historical job-title evidence</span><h2>Titles found in H-1B filings</h2></div><span className="muted">{filingTitles.length} unique</span></div>
        <p className="panel-intro">These are historical titles from FY2026 Q2 H-1B filings. They describe sponsorship activity and are not live job openings.</p>
        <DataTable data={filingTitles} columns={titleColumns} emptyMessage="No filing titles are recorded for this employer." getRowId={(row) => row.title} />
      </section>

      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">Deduplicated filing detail</span><h2>H-1B filing listings</h2></div><span className="muted">{filingListings.length} unique displayed combinations</span></div>
        <p className="panel-intro">Multiple cases with the same employer, title, role, city, state, and salary values are shown once. The company filing count remains based on distinct filings.</p>
        <FilingListingsTable rows={filingListings} pageSize={15} emptyMessage="No H-1B filing listings are recorded for this employer." />
      </section>
    </main>
  );
}
