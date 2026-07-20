import { KpiCard } from '../components/KpiCard';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { useDirectoryData } from '../data/DirectoryData';
import { formatDate, formatNumber } from '../utils/format';

export function AboutDataPage() {
  const { data } = useDirectoryData();
  if (!data) return null;
  const careersPagesNeeded = data.quality.officialWebsiteOnly + data.quality.needsResearch;

  return (
    <div className="page about-page">
      <PageHeader
        eyebrow="Methodology"
        title="About the careers directory"
        description="The directory separates verified careers-page ownership from H-1B filing evidence and clearly marks the links that still need research."
        actions={<div className="generated-chip">Data generated {formatDate(data.metadata.generatedAt)}</div>}
      />

      <section className="kpi-grid compact" aria-label="Coverage summary">
        <KpiCard label="Verified careers pages" value={data.quality.verifiedCareersPages} note={`${data.quality.careersCoveragePercent}% of employers`} icon="01" />
        <KpiCard label="Official website only" value={data.quality.officialWebsiteOnly} note="Careers page still needed" icon="02" />
        <KpiCard label="Needs identity research" value={data.quality.needsResearch} note="No domain is guessed" icon="03" />
        <KpiCard label="Total careers pages needed" value={careersPagesNeeded} note="Website-only plus research queue" icon="04" />
      </section>

      <div className="about-grid">
        <section className="panel">
          <div className="panel-heading"><div><span className="eyebrow">Status rules</span><h2>Three simple directory states</h2></div></div>
          <div className="status-explanations">
            <article><StatusBadge value="Careers page verified" /><p>An evidence-backed official careers destination is recorded.</p></article>
            <article><StatusBadge value="Official website only" /><p>The company website is verified, but the careers page is not yet confirmed.</p></article>
            <article><StatusBadge value="Needs research" /><p>No official website or careers page is asserted without evidence.</p></article>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading"><div><span className="eyebrow">Product scope</span><h2>A directory, not a job scanner</h2></div></div>
          <ul className="plain-list">
            <li>The product links to official careers pages; it does not scrape or monitor live openings.</li>
            <li>There are no ATS adapters, refresh attempts, opening histories, closure rules, or failure retries.</li>
            <li>H-1B totals, job titles, filing states, and salary ranges remain as supporting employer context.</li>
            <li>Search links for unresolved employers are research aids and are never presented as verified destinations.</li>
          </ul>
        </section>
      </div>

      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">Reconciliation</span><h2>H-1B filing checks</h2></div><StatusBadge value={data.quality.reconciliation.every((check) => check.passed) ? 'All checks passed' : 'Review required'} /></div>
        <div className="method-table-wrap"><table className="method-table"><thead><tr><th>Check</th><th>Expected</th><th>Actual</th><th>Result</th><th>Method</th></tr></thead><tbody>{data.quality.reconciliation.map((check) => <tr key={check.name}><td>{check.name}</td><td>{formatNumber(check.expected)}</td><td>{formatNumber(check.actual)}</td><td><StatusBadge value={check.passed ? 'Passed' : 'Failed'} /></td><td>{check.note}</td></tr>)}</tbody></table></div>
      </section>

      <section className="clarification-card">
        <span className="eyebrow">Why the earlier number was 456</span>
        <h2>Missing workbook hints are not missing careers pages</h2>
        <p>The source workbook supplied 59 job-link hints and omitted them for 456 employers. That input count is not used as careers-page coverage. The directory’s current unresolved total is {careersPagesNeeded}: {data.quality.officialWebsiteOnly} with a verified company website and {data.quality.needsResearch} needing identity research.</p>
      </section>

      <section className="panel source-files">
        <div className="panel-heading"><div><span className="eyebrow">Provenance</span><h2>Local source snapshot</h2></div></div>
        <p>{data.metadata.filingPeriod}. National totals use distinct H-1B case numbers after the official Visa Class join.</p>
        <ul>{data.metadata.sourceFiles.map((file) => <li key={file}><code>{file}</code></li>)}</ul>
      </section>
    </div>
  );
}
