import { createColumnHelper } from '@tanstack/react-table';
import { BarChart } from '../components/BarChart';
import { DataTable } from '../components/DataTable';
import { FilterBar, SelectField } from '../components/Filters';
import { PageHeader } from '../components/PageHeader';
import { StateMap } from '../components/StateMap';
import { useDashboardData } from '../data/DashboardData';
import { useUrlFilters } from '../hooks/useUrlFilters';
import type { FilingRecord } from '../types/data';
import { downloadCsv } from '../utils/csv';
import { formatCurrency } from '../utils/format';

const column = createColumnHelper<FilingRecord>();

export function FilingsStatesPage() {
  const { data } = useDashboardData(); const filters = useUrlFilters(); if (!data) return null;
  const selected = filters.get('state');
  const rows = selected ? data.filings.filter((filing)=>filing.worksiteState===selected) : data.filings;
  const values = Object.fromEntries(data.stateSummary.map((state)=>[state.state,state.filingCount]));
  const ranking = [...data.stateSummary].sort((a,b)=>b.filingCount-a.filingCount).slice(0,15).map((state)=>({label:state.state,value:state.filingCount}));
  const stacked = [...data.stateSummary].sort((a,b)=>b.filingCount-a.filingCount).slice(0,12).map((state)=>({label:state.state,value:state.roleCounts['SRE / Site Reliability'],secondary:state.roleCounts.DevOps,tertiary:state.roleCounts['Platform / Infrastructure']}));
  const columns = [column.accessor('employerName',{header:'Employer'}),column.accessor('jobTitle',{header:'Job title'}),column.accessor('roleCategory',{header:'Role category'}),column.accessor('worksiteCity',{header:'Worksite city'}),column.accessor('worksiteState',{header:'State'}),column.accessor('salaryFloor',{header:'Annualized salary floor',cell:(info)=>formatCurrency(info.getValue())}),column.accessor('salaryCeiling',{header:'Annualized salary ceiling',cell:(info)=>formatCurrency(info.getValue())}),column.accessor('caseStatus',{header:'Case status'}),column.accessor('caseNumber',{header:'Case number'}),column.accessor('socCode',{header:'SOC code'})];
  return <main className="page"><PageHeader eyebrow="H-1B filing evidence" title="Filings by worksite state" description="State counts use distinct Case Number + Worksite State. A multi-state filing appears once in each state, while the national total remains 856 distinct cases." actions={<button type="button" className="primary-button" onClick={()=>downloadCsv('h1b-filings-by-state.csv',['Employer','Job Title','Role','City','State','Salary Floor','Salary Ceiling','Status','Case Number','SOC Code'],rows.map((filing)=>[filing.employerName,filing.jobTitle,filing.roleCategory,filing.worksiteCity,filing.worksiteState,filing.salaryFloor,filing.salaryCeiling,filing.caseStatus,filing.caseNumber,filing.socCode]))}>Download filtered CSV</button>} />
    <FilterBar onReset={filters.reset}><SelectField label="Worksite state" value={selected} onChange={(value)=>filters.set('state',value)} options={[{label:'All states',value:''},...data.stateSummary.map((state)=>({label:`${state.state} · ${state.filingCount}`,value:state.state}))]} /></FilterBar>
    <div className="map-grid"><section className="panel"><div className="panel-heading"><h2>Distinct cases by worksite state</h2></div><StateMap values={values} selected={selected} onSelect={(state)=>filters.set('state',state)} label="H-1B cases by worksite state" /></section><section className="panel"><div className="panel-heading"><h2>Top states</h2></div><BarChart title="Distinct cases" data={ranking} onSelect={(state)=>filters.set('state',state)} /></section></div>
    <section className="panel"><div className="panel-heading"><div><span className="eyebrow">Role composition</span><h2>Top states by filing role</h2></div></div><BarChart title="Role breakdown" data={stacked} stacked onSelect={(state)=>filters.set('state',state)} /></section>
    <section className="panel"><div className="panel-heading"><h2>{selected ? `${selected} filing drilldown` : 'All filing-worksite records'}</h2><span className="muted">{rows.length} case-worksite rows</span></div><DataTable data={rows} columns={columns} pageSize={20} /></section>
  </main>;
}
