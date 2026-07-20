import fs from 'node:fs/promises';
import path from 'node:path';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CSSProperties, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';

vi.mock('echarts-for-react', () => ({
  default: ({ style }: { style?: CSSProperties }) => (
    <div data-testid="chart-smoke-stub" style={style}>Chart</div>
  ),
}));

vi.mock('react-simple-maps', () => ({
  ComposableMap: ({ children }: { children: ReactNode }) => <svg>{children}</svg>,
  Geographies: ({ children }: { children: (value: { geographies: never[] }) => ReactNode }) => (
    <>{children({ geographies: [] })}</>
  ),
  Geography: () => null,
}));

const dataDirectory = path.resolve(process.cwd(), 'public', 'data');

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const pathname = new URL(String(input), 'http://local.test').pathname;
    const fileName = pathname.startsWith('/data/') ? pathname.slice('/data/'.length) : '';
    if (!fileName || fileName.includes('/') || !fileName.endsWith('.json')) {
      return new Response('', { status: 404 });
    }
    try {
      const body = await fs.readFile(path.join(dataDirectory, fileName), 'utf8');
      return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Response('', { status: 404 });
      throw error;
    }
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const routes = [
  ['/', 'Explore SRE sponsorship evidence by employer and state'],
  ['/companies', 'H-1B company browser'],
  ['/companies/google-llc-3ed386f', 'Google LLC'],
  ['/companies/equifax-inc-c5971ae', 'Equifax Inc.'],
  ['/filings/states', 'Filings by worksite state'],
  ['/filings/companies', 'Filings by employer'],
  ['/data-quality', 'Data quality and coverage'],
] as const;

describe.each(routes)('route smoke check: %s', (route, heading) => {
  it(`renders ${heading} from the generated datasets`, async () => {
    render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: heading, level: 1 })).toBeInTheDocument();
    expect(screen.queryByText(/Unable to load dashboard data/i)).not.toBeInTheDocument();
    for (const link of document.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]')) {
      expect(link.rel.split(/\s+/)).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
    }
  });
});

it('shows Equifax careers verification and historical filing titles', async () => {
  render(<MemoryRouter initialEntries={['/companies/equifax-inc-c5971ae']}><App /></MemoryRouter>);

  expect(await screen.findByRole('heading', { name: 'Equifax Inc.', level: 1 })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open official careers page ↗' })).toHaveAttribute('href', 'https://careers.equifax.com/');
  expect(screen.getByRole('heading', { name: 'Titles found in H-1B filings' })).toBeInTheDocument();
  expect(screen.getByText(/not live job openings/i)).toBeInTheDocument();
});

it('coordinates employer filing filters across the drilldown and worksite map', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/filings/companies']}><App /></MemoryRouter>);

  expect(await screen.findByRole('heading', { name: 'Filings by employer', level: 1 })).toBeInTheDocument();
  const listingPanel = screen.getByRole('heading', { name: 'Filtered filing listings' }).closest('section');
  expect(listingPanel).not.toBeNull();
  const listingTable = within(listingPanel!);
  for (const header of [
    'Employer',
    'Job title',
    'Role category',
    'Worksite city',
    'State',
    'Annualized salary floor',
    'Annualized salary ceiling',
    'Matching filings for company',
  ]) {
    expect(listingTable.getByRole('columnheader', { name: header })).toBeInTheDocument();
  }
  expect(listingTable.queryByRole('columnheader', { name: 'Case number' })).not.toBeInTheDocument();
  expect(listingTable.queryByRole('columnheader', { name: 'Case status' })).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(
    '1,120 unique listings · 856 distinct matching filings · 515 employers',
  );

  await user.selectOptions(screen.getByLabelText('Role category'), 'DevOps');
  expect(screen.getByRole('status')).toHaveTextContent(
    '754 unique listings · 565 distinct matching filings · 399 employers',
  );

  await user.selectOptions(screen.getByLabelText('Worksite state'), 'TX');
  expect(screen.getByRole('status')).toHaveTextContent(
    '230 unique listings · 194 distinct matching filings · 146 employers',
  );
  expect(screen.getByRole('group', { name: 'Filtered distinct H-1B filings by worksite state' }))
    .toHaveTextContent('194 distinct filtered filings · 1 worksite states or areas represented');
});

it('does not expose removed scanner routes', async () => {
  render(<MemoryRouter initialEntries={['/openings/companies']}><App /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
});

it('renders a safe not-found state', async () => {
  render(<MemoryRouter initialEntries={['/not-a-real-route']}><App /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Return to overview' })).toHaveAttribute('href', '/');
});

it('shows a clear partial-data failure when a required dataset cannot load', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })));
  render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>);

  expect(await screen.findByRole('heading', { name: 'The dashboard data could not be loaded' })).toBeInTheDocument();
  expect(screen.getByText(/returned HTTP 503/i)).toBeInTheDocument();
});
