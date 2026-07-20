import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { BarChart } from '../components/BarChart';
import { DataTable } from '../components/DataTable';
import { FilterBar, SearchField } from '../components/Filters';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { useDashboardData } from '../data/DashboardData';
import { useUrlFilters } from '../hooks/useUrlFilters';
import type { EmployerRecord } from '../types/data';
import { downloadCsv } from '../utils/csv';
import { externalLinkProps, formatCurrency } from '../utils/format';

const column = createColumnHelper<EmployerRecord>();

export function FilingsCompaniesPage() {
  const { data } = useDashboardData(); const filters = useUrlFilters(); if (!data) return null;
  const search = filters.get('search');
  const rows = data.employers.filter((employer) => !search
    || `${employer.employerName} ${employer.filingTitles.join(' ')}`.toLowerCase().includes(search.toLowerCase()));
  const top = [...rows].sort((a,b)=>b.totalFilings-a.totalFilings).slice(0,15);
  const bars = top.map((employer)=>({label:employer.employerName,value:employer.totalFilings}));
  const stacked = top.map((employer)=>({label:employer.employerName,value:employer.roleCounts['SRE / Site Reliability'],secondary:employer.roleCounts.DevOps,tertiary:employer.roleCounts['Platform / Infrastructure']}));
  const columns = [column.accessor('employerName',{header:'Employer',cell:(info)=><Link className="primary-link" to={`/companies/${info.row.original.employerId}`}>{info.getValue()}</Link>}),column.accessor('totalFilings',{header:'Distinct H-1B cases'}),column.accessor((row)=>row.roleCounts['SRE / Site Reliability'],{id:'sre',header:'SRE'}),column.accessor((row)=>row.roleCounts.DevOps,{id:'devops',header:'DevOps'}),column.accessor((row)=>row.roleCounts['Platform / Infrastructure'],{id:'platform',header:'Platform'}),column.accessor('salaryFloor',{header:'Annualized salary floor',cell:(info)=>formatCurrency(info.getValue())}),column.accessor('salaryCeiling',{header:'Annualized salary ceiling',cell:(info)=>formatCurrency(info.getValue())}),column.accessor('filingStates',{header:'Worksite states',cell:(info)=>info.getValue().join(', ')}),column.accessor('filingTitles',{header:'Filing titles',enableSorting:false,cell:(info)=>{const titles=info.getValue();return `${titles.slice(0,2).join(' · ')}${titles.length>2?` +${titles.length-2}`:''}`;}}),column.accessor('careersStatus',{header:'Careers status',cell:(info)=><StatusBadge value={info.getValue()} />}),column.accessor('careersPage',{header:'Careers page',cell:(info)=>info.getValue()==='NA'?'Not verified':<a href={info.getValue()} {...externalLinkProps()}>Open ↗</a>})];
  return <main className="page"><PageHeader eyebrow="H-1B filing evidence" title="Filings by employer" description="Compare distinct legal employers, their filing-title history, and verified careers destinations without merging related entities merely because they share a brand." actions={<button type="button" className="primary-button" onClick={()=>downloadCsv('h1b-filings-by-employer.csv',['Employer','Distinct Cases','SRE','DevOps','Platform','Salary Floor','Salary Ceiling','States','Filing Titles','Careers Status','Careers Page'],rows.map((employer)=>[employer.employerName,employer.totalFilings,employer.roleCounts['SRE / Site Reliability'],employer.roleCounts.DevOps,employer.roleCounts['Platform / Infrastructure'],employer.salaryFloor,employer.salaryCeiling,employer.filingStates.join('; '),employer.filingTitles.join('; '),employer.careersStatus,employer.careersPage]))}>Download filtered CSV</button>} />
    <FilterBar onReset={filters.reset}><SearchField label="Employer search" value={search} onChange={(value)=>filters.set('search',value)} /></FilterBar>
    <div className="dashboard-grid"><section className="panel"><div className="panel-heading"><h2>Top employers</h2></div><BarChart title="Distinct H-1B cases" data={bars} /></section><section className="panel"><div className="panel-heading"><h2>Role mix by employer</h2></div><BarChart title="Role mix" data={stacked} stacked /></section></div>
    <section className="panel"><div className="panel-heading"><h2>Employer drilldown</h2></div><DataTable data={rows} columns={columns} /></section>
  </main>;
}
