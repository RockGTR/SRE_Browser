import fs from 'node:fs/promises';
import path from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';

const dataDirectory = path.resolve(process.cwd(), 'public', 'data');

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const pathname = new URL(String(input), 'http://local.test').pathname;
    const fileName = pathname.startsWith('/data/') ? pathname.slice('/data/'.length) : '';
    if (!fileName || fileName.includes('/') || !fileName.endsWith('.json')) return new Response('', { status: 404 });
    try {
      return new Response(await fs.readFile(path.join(dataDirectory, fileName), 'utf8'), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
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

describe.each([
  ['/', 'Official careers pages for H-1B SRE employers'],
  ['/companies', 'Official careers pages for H-1B SRE employers'],
  ['/companies/google-llc-3ed386f', 'Google LLC'],
  ['/companies/equifax-inc-c5971ae', 'Equifax Inc.'],
  ['/about', 'About the careers directory'],
] as const)('route smoke check: %s', (route, heading) => {
  it(`renders ${heading} from the directory datasets`, async () => {
    render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: heading, level: 1 })).toBeInTheDocument();
    expect(screen.queryByText(/job fetching|collection attempt|tracked current openings/i)).not.toBeInTheDocument();
    for (const link of document.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]')) {
      expect(link.rel.split(/\s+/)).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
    }
  });
});

it('shows Equifax as a verified careers page rather than a scanner review state', async () => {
  render(<MemoryRouter initialEntries={['/companies/equifax-inc-c5971ae']}><App /></MemoryRouter>);
  expect((await screen.findAllByText('Careers page verified')).length).toBeGreaterThan(0);
  expect(screen.getByRole('link', { name: 'Open careers page ↗' })).toHaveAttribute('href', 'https://careers.equifax.com/');
  expect(screen.queryByText(/manual only|needs review|collection/i)).not.toBeInTheDocument();
});

it('renders a safe not-found state', async () => {
  render(<MemoryRouter initialEntries={['/not-a-real-route']}><App /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Return to the directory' })).toHaveAttribute('href', '/');
});

it('shows a clear failure state when a required dataset cannot load', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })));
  render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'The directory data could not be loaded' })).toBeInTheDocument();
  expect(screen.getByText(/returned HTTP 503/i)).toBeInTheDocument();
});
