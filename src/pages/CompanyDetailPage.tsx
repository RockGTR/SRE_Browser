import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { KpiCard } from '../components/KpiCard';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { useDirectoryData } from '../data/DirectoryData';
import type { FilingRole } from '../types/data';
import { careersSearchUrl } from '../utils/careers';
import { externalLinkProps, formatCurrency, formatDate } from '../utils/format';

const roles: Array<{ key: FilingRole; label: string }> = [
  { key: 'SRE / Site Reliability', label: 'SRE / Site Reliability' },
  { key: 'DevOps', label: 'DevOps' },
  { key: 'Platform / Infrastructure', label: 'Platform / Infrastructure' },
];

function evidenceLabel(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'Evidence link'; }
}

export function CompanyDetailPage() {
  const { employerId } = useParams();
  const { data } = useDirectoryData();
  if (!data) return null;
  const employer = data.employers.find((item) => item.employerId === employerId);
  if (!employer) {
    return <div className="page"><EmptyState title="Employer not found" message="This employer is not present in the FY2026 Q2 directory." /></div>;
  }

  const hasCareersPage = employer.careersPage !== 'NA';
  const hasOfficialWebsite = employer.officialWebsite !== 'NA';
  return (
    <div className="page company-page">
      <Link to="/" className="back-link">← Careers directory</Link>
      <PageHeader
        eyebrow="Company overview"
        title={employer.employerName}
        description="Verified careers-page information with supporting H-1B filing titles and role evidence."
        actions={<StatusBadge value={employer.careersStatus} />}
      />

      <section className="company-action-card">
        <div>
          <span className="eyebrow">Primary destination</span>
          <h2>{hasCareersPage ? 'Official careers page' : 'Careers page still needs research'}</h2>
          <p>{hasCareersPage
            ? 'This link is backed by recorded first-party ownership evidence.'
            : 'No careers URL has been verified yet, so the directory does not guess one.'}</p>
        </div>
        <div className="company-actions">
          {hasCareersPage && <a className="primary-button link-button" href={employer.careersPage} {...externalLinkProps()}>Open careers page ↗</a>}
          {!hasCareersPage && hasOfficialWebsite && <a className="primary-button link-button" href={employer.officialWebsite} {...externalLinkProps()}>Visit official website ↗</a>}
          {!hasCareersPage && <a className="secondary-button link-button" href={careersSearchUrl(employer.employerName)} {...externalLinkProps()}>Search careers on the web ↗</a>}
        </div>
      </section>

      <section className="kpi-grid compact" aria-label="Employer filing summary">
        <KpiCard label="Distinct H-1B cases" value={employer.totalFilings} note="FY2026 Q2 cumulative" icon="01" />
        <KpiCard label="SRE cases" value={employer.roleCounts['SRE / Site Reliability']} icon="02" />
        <KpiCard label="DevOps cases" value={employer.roleCounts.DevOps} icon="03" />
        <KpiCard label="Platform cases" value={employer.roleCounts['Platform / Infrastructure']} icon="04" />
      </section>

      <div className="detail-grid">
        <section className="panel verification-card">
          <div className="panel-heading"><div><span className="eyebrow">Link record</span><h2>Careers-page verification</h2></div><StatusBadge value={employer.careersStatus} /></div>
          <dl className="fact-list">
            <div><dt>Careers page</dt><dd>{hasCareersPage ? <a href={employer.careersPage} {...externalLinkProps()}>{employer.careersPage}</a> : 'Not verified'}</dd></div>
            <div><dt>Official website</dt><dd>{hasOfficialWebsite ? <a href={employer.officialWebsite} {...externalLinkProps()}>{employer.officialWebsite}</a> : 'Not verified'}</dd></div>
            <div><dt>Verified on</dt><dd>{formatDate(employer.verifiedAt)}</dd></div>
          </dl>
          <div className="verification-notes">
            <strong>Verification notes</strong>
            <p>{employer.verificationNotes || 'No independent ownership evidence has been recorded yet.'}</p>
          </div>
          {employer.evidenceUrls.length > 0 && <div className="evidence-links"><strong>Evidence</strong><ul>{employer.evidenceUrls.map((url) => <li key={url}><a href={url} {...externalLinkProps()}>{evidenceLabel(url)} ↗</a></li>)}</ul></div>}
        </section>

        <section className="panel filing-overview">
          <div className="panel-heading"><div><span className="eyebrow">Filing context</span><h2>Role and location overview</h2></div></div>
          <div className="role-bars">
            {roles.map(({ key, label }) => {
              const count = employer.roleCounts[key];
              const width = employer.totalFilings ? Math.max(count ? 5 : 0, (count / employer.totalFilings) * 100) : 0;
              return <div className="role-bar" key={key}><div><span>{label}</span><strong>{count}</strong></div><span className="bar-track"><span style={{ width: `${width}%` }} /></span></div>;
            })}
          </div>
          <dl className="fact-list compact-facts">
            <div><dt>Annualized salary range</dt><dd>{formatCurrency(employer.salaryFloor)} – {formatCurrency(employer.salaryCeiling)}</dd></div>
            <div><dt>Filing states</dt><dd>{employer.filingStates.join(', ')}</dd></div>
          </dl>
        </section>
      </div>

      <section className="panel title-panel">
        <div className="panel-heading"><div><span className="eyebrow">Job-title evidence</span><h2>Titles found in H-1B filings</h2></div><span className="count-pill">{employer.filingTitles.length} unique</span></div>
        <p className="panel-intro">These are filing titles from the FY2026 Q2 dataset. They provide employer context and are not live job openings.</p>
        <ul className="title-grid">{employer.filingTitles.map((title) => <li key={title}>{title}</li>)}</ul>
      </section>
    </div>
  );
}
