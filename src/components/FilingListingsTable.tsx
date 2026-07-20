import { createColumnHelper } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import type { FilingListingRecord } from '../types/data';
import { formatCurrency } from '../utils/format';
import { DataTable } from './DataTable';

const column = createColumnHelper<FilingListingRecord>();

const columns = [
  column.accessor('employerName', {
    header: 'Employer',
    cell: (info) => (
      <Link className="primary-link" to={`/companies/${info.row.original.employerId}`}>
        {info.getValue()}
      </Link>
    ),
  }),
  column.accessor('jobTitle', { header: 'Job title' }),
  column.accessor('roleCategory', { header: 'Role category' }),
  column.accessor('worksiteCity', { header: 'Worksite city' }),
  column.accessor('worksiteState', { header: 'State' }),
  column.accessor('salaryFloor', {
    header: 'Annualized salary floor',
    cell: (info) => formatCurrency(info.getValue()),
  }),
  column.accessor('salaryCeiling', {
    header: 'Annualized salary ceiling',
    cell: (info) => formatCurrency(info.getValue()),
  }),
  column.accessor('companyFilingCount', { header: 'Matching filings for company' }),
];

export const filingListingCsvHeaders = [
  'Employer',
  'Job Title',
  'Role Category',
  'Worksite City',
  'State',
  'Annualized Salary Floor',
  'Annualized Salary Ceiling',
  'Matching Filings for Company',
];

export function filingListingCsvRows(rows: FilingListingRecord[]) {
  return rows.map((row) => [
    row.employerName,
    row.jobTitle,
    row.roleCategory,
    row.worksiteCity,
    row.worksiteState,
    row.salaryFloor,
    row.salaryCeiling,
    row.companyFilingCount,
  ]);
}

export function FilingListingsTable({
  rows,
  pageSize = 20,
  emptyMessage,
}: {
  rows: FilingListingRecord[];
  pageSize?: number;
  emptyMessage?: string;
}) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      pageSize={pageSize}
      emptyMessage={emptyMessage}
      getRowId={(row) => row.listingId}
    />
  );
}
