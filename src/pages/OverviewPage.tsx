import { useNavigate } from 'react-router-dom';
import { BarChart } from '../components/BarChart';
import { KpiCard } from '../components/KpiCard';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { useDashboardData } from '../data/DashboardData';
import { formatDate, formatNumber } from '../utils/format';

const filingRoles = [
  'SRE / Site Reliability',
  'DevOps',
  'Platform / Infrastructure',
] as const;

export function OverviewPage() {
  const { data } = useDashboardData();
  const navigate = useNavigate();
  if (!data) return null;

  const roleTotals = filingRoles.map((role) => ({
    label: role,
    value: data.employers.reduce((total, employer) => total + employer.roleCounts[role], 0),
  }));
  const topStates = [...data.stateSummary]
    .sort((left, right) => right.filingCount - left.filingCount)
    .slice(0, 10)
    .map((state) => ({ label: state.state, value: state.filingCount }));
  const topEmployers = [...data.employers]
    .sort((left, right) => right.totalFilings - left.totalFilings)
    .slice(0, 10)
    .map((employer) => ({ label: employer.employerName, value: employer.totalFilings }));
  const careersPagesNeeded = data.quality.officialWebsiteOnly + data.quality.needsResearch;

  return (
    <main className="page">
      <PageHeader
        eyebrow="FY2026 Q2 H-1B intelligence"
        title="Explore SRE sponsorship evidence by employer and state"
        description="Browse H-1B filings for SRE, DevOps, and platform roles, then continue to each employer’s verified official careers page when one is available."
        actions={<div className="refresh-chip">Dataset generated {formatDate(data.metadata.generatedAt)}</div>}
      />

      <section className="kpi-grid" aria-label="H-1B summary">
        <KpiCard
          label="Employers"
          value={formatNumber(data.employers.length)}
          note="Distinct legal employers"
          icon="⌂"
        />
        <KpiCard
          label="Distinct H-1B cases"
          value={formatNumber(data.metadata.nationalDistinctCaseCount)}
          note="E-3 records excluded"
          icon="◎"
        />
        <KpiCard
          label="Careers pages verified"
          value={formatNumber(data.quality.verifiedCareersPages)}
          note={`${data.quality.careersCoveragePercent}% employer coverage`}
          icon="↗"
        />
        <KpiCard
          label="Careers pages to research"
          value={formatNumber(careersPagesNeeded)}
          note={`${data.quality.officialWebsiteOnly} have an official website only`}
          icon="?"
        />
      </section>

      <section className="role-strip" aria-label="Distinct H-1B cases by filing role">
        <div>
          <span>Filing role mix</span>
          <strong>{formatNumber(data.metadata.nationalDistinctCaseCount)} distinct cases</strong>
        </div>
        {roleTotals.map((role) => (
          <article key={role.label}>
            <span>{role.label}</span>
            <strong>{formatNumber(role.value)}</strong>
          </article>
        ))}
      </section>

      <section className="coverage-strip" aria-label="Official careers-page coverage">
        <article>
          <StatusBadge value="Careers page verified" />
          <strong>{formatNumber(data.quality.verifiedCareersPages)}</strong>
          <span>official careers pages ready to open</span>
        </article>
        <article>
          <StatusBadge value="Official website only" />
          <strong>{formatNumber(data.quality.officialWebsiteOnly)}</strong>
          <span>official website verified; careers page still needed</span>
        </article>
        <article>
          <StatusBadge value="Needs research" />
          <strong>{formatNumber(data.quality.needsResearch)}</strong>
          <span>official careers destination not yet verified</span>
        </article>
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div><span className="eyebrow">Filing concentration</span><h2>Top H-1B worksite states</h2></div>
            <button type="button" className="text-button" onClick={() => navigate('/filings/states')}>Explore all states →</button>
          </div>
          <BarChart
            title="Distinct H-1B cases"
            data={topStates}
            onSelect={(state) => navigate(`/filings/states?state=${state}`)}
          />
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div><span className="eyebrow">Employer concentration</span><h2>Top filing employers</h2></div>
            <button type="button" className="text-button" onClick={() => navigate('/filings/companies')}>Explore all employers →</button>
          </div>
          <BarChart
            title="Distinct H-1B cases"
            data={topEmployers}
            onSelect={(employer) => navigate(`/filings/companies?search=${encodeURIComponent(employer)}`)}
          />
        </section>
      </div>

      <aside className="method-note">
        <div><span className="eyebrow">Coverage note</span><h2>Filing totals remain the foundation</h2></div>
        <p>
          {data.metadata.filingPeriod}. National totals use distinct case numbers. State totals count a case once per worksite state and are intentionally non-additive. Careers coverage reports verified official destinations only; it does not represent live job availability.
        </p>
      </aside>
    </main>
  );
}
