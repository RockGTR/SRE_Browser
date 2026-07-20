import { createColumnHelper } from '@tanstack/react-table';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DataTable } from './DataTable';

type Row = { name: string; count: number };
const helper = createColumnHelper<Row>();

describe('DataTable', () => {
  it('renders, sorts, and paginates accessibly', async () => {
    const rows = Array.from({length:18},(_,index)=>({name:`Employer ${String(index).padStart(2,'0')}`,count:18-index}));
    render(<DataTable data={rows} columns={[helper.accessor('name',{header:'Employer'}),helper.accessor('count',{header:'Count'})]} pageSize={10} />);
    expect(screen.getByText('Page 1 of 2 · 18 rows')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button',{name:/Next/i}));
    expect(screen.getByText('Page 2 of 2 · 18 rows')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button',{name:/Employer/i}));
    expect(screen.getByRole('columnheader',{name:/Employer/i})).toHaveAttribute('aria-sort','ascending');
  });
});
