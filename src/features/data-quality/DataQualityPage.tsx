import { DataTable } from '../../components/DataTable';
import { KpiCard } from '../../components/KpiCard';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { useDashboardData } from '../../data/DashboardData';
import { formatDate, formatNumber } from '../../utils/format';

export function DataQualityPage() {
  const { data } = useDashboardData();
  if (!data) return null;

  const q = data.quality;
  const checks = q.reconciliation.map((check) => ({ ...check, status: check.passed ? 'Passed' : 'Failed' }));
  const columns = [
    { accessorKey: 'name', header: 'Reconciliation check' },
    { accessorKey: 'expected', header: 'Expected', cell: (info: { getValue: () => unknown }) => formatNumber(Number(info.getValue())) },
    { accessorKey: 'actual', header: 'Actual', cell: (info: { getValue: () => unknown }) => formatNumber(Number(info.getValue())) },
    { accessorKey: 'status', header: 'Result', cell: (info: { getValue: () => unknown }) => <StatusBadge value={String(info.getValue())} /> },
    { accessorKey: 'note', header: 'Method' },
  ];
  const careersPagesNeeded = q.officialWebsiteOnly + q.needsResearch;

  return (
    <main className="page">
      <PageHeader
        eyebrow="Auditability"
        title="Data quality and coverage"
        description="Review H-1B filing reconciliation and official careers-page verification without conflating either dataset with live job availability."
        actions={<div className="refresh-chip">Data generated {formatDate(q.generatedAt)}</div>}
      />

      <section className="coverage-strip compact" aria-label="Careers-page verification coverage">
        <article>
          <StatusBadge value="Careers page verified" />
          <strong>{formatNumber(q.verifiedCareersPages)}</strong>
          <span>evidence-backed careers destinations</span>
        </article>
        <article>
          <StatusBadge value="Official website only" />
          <strong>{formatNumber(q.officialWebsiteOnly)}</strong>
          <span>verified company sites awaiting a careers link</span>
        </article>
        <article>
          <StatusBadge value="Needs research" />
          <strong>{formatNumber(q.needsResearch)}</strong>
          <span>employers awaiting official-site research</span>
        </article>
      </section>

      <section className="quality-grid" aria-label="Dataset quality metrics">
        <KpiCard label="Legal employers" value={formatNumber(q.totalEmployers)} note="Distinct employer identities" icon="01" />
        <KpiCard label="Careers-page coverage" value={`${q.careersCoveragePercent}%`} note={`${formatNumber(careersPagesNeeded)} pages still to verify`} icon="02" />
        <KpiCard label="Verified official websites" value={formatNumber(q.verifiedOfficialWebsites)} note="Evidence-backed company domains" icon="03" />
        <KpiCard label="Distinct H-1B cases" value={formatNumber(q.nationalDistinctCaseCount)} note="National total; not a sum of states" icon="04" />
        <KpiCard label="Case-worksite rows" value={formatNumber(q.filingWorksiteRowCount)} note="Used for state-level exploration" icon="05" />
        <KpiCard label="State index rows" value={formatNumber(q.stateCount)} note="36 observed; HI and Unknown retained" icon="06" />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div><span className="eyebrow">H-1B reconciliation</span><h2>Acceptance checks</h2></div>
          <StatusBadge value={checks.every((check) => check.status === 'Passed') ? 'All checks passed' : 'Review required'} />
        </div>
        <p className="panel-intro">These checks validate employer counts, filing totals, role totals, and case-worksite coverage against the source snapshot.</p>
        <DataTable data={checks} columns={columns} pageSize={15} />
      </section>

      <div className="dashboard-grid">
        <section className="panel prose-panel">
          <div className="panel-heading"><div><span className="eyebrow">Filing methodology</span><h2>How H-1B totals work</h2></div></div>
          <ul>
            <li>National totals count distinct Case Number values and are never calculated by adding state totals.</li>
            <li>State totals count distinct Case Number plus Worksite State, so a case associated with more than one state can appear in each relevant state.</li>
            <li>Visa Class is joined from the official DOL disclosure workbook; non-H-1B records are excluded.</li>
            <li>Historical filing titles, salary ranges, and worksite locations describe the filing snapshot, not current job openings.</li>
          </ul>
        </section>

        <section className="panel prose-panel">
          <div className="panel-heading"><div><span className="eyebrow">Careers coverage</span><h2>What verification means</h2></div></div>
          <ul>
            <li><strong>Careers page verified</strong> means an evidence-backed official careers destination is recorded.</li>
            <li><strong>Official website only</strong> means the company domain is verified but its careers destination still needs confirmation.</li>
            <li><strong>Needs research</strong> means no official destination is asserted without supporting evidence.</li>
            <li>Web-search links are research aids for unresolved records and are never presented as verified destinations.</li>
          </ul>
        </section>
      </div>

      <section className="method-note">
        <div><span className="eyebrow">Scope boundary</span><h2>Career discovery stops at the official page</h2></div>
        <p>The browser preserves its full H-1B employer, company, title, filing, and state views. The narrowed scope applies only to career discovery: it verifies official careers pages and does not scan or monitor live openings.</p>
      </section>
    </main>
  );
}
