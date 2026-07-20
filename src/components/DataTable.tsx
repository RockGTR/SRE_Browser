import { flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from '@tanstack/react-table';
import { useState } from 'react';

export function DataTable<T>({ data, columns, emptyMessage = 'No rows match the active filters.', pageSize = 15, getRowId }: {
  data: T[];
  columns: ColumnDef<T, any>[];
  emptyMessage?: string;
  pageSize?: number;
  getRowId?: (row: T) => string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
    getRowId,
  });
  if (!data.length) return <div className="table-empty">{emptyMessage}</div>;
  return (
    <div className="table-shell">
      <div className="table-scroll" tabIndex={0} aria-label="Scrollable data table">
        <table>
          <thead>
            {table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => (
              <th key={header.id} scope="col" aria-sort={header.column.getIsSorted() === 'asc' ? 'ascending' : header.column.getIsSorted() === 'desc' ? 'descending' : 'none'}>
                <button type="button" className="sort-button" onClick={header.column.getToggleSortingHandler()} disabled={!header.column.getCanSort()}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  <span aria-hidden="true">{header.column.getIsSorted() === 'asc' ? ' ↑' : header.column.getIsSorted() === 'desc' ? ' ↓' : ''}</span>
                </button>
              </th>
            ))}</tr>)}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => <tr key={row.id}>{row.getVisibleCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
      <div className="pagination" aria-label="Table pagination">
        <span>Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())} · {data.length} rows</span>
        <div><button type="button" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</button><button type="button" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</button></div>
      </div>
    </div>
  );
}
