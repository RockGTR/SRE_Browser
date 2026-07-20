import { describe, expect, it } from 'vitest';
import type { FilingRecord } from '../../types/data';
import { aggregateFilingListings, countDistinctCases, countDistinctCasesBy } from './filingListings';

function filing(overrides: Partial<FilingRecord> = {}): FilingRecord {
  return {
    employerId: 'example-inc-a1',
    employerName: 'Example Inc.',
    jobTitle: 'DevOps Engineer',
    roleCategory: 'DevOps',
    worksiteCity: 'Austin',
    worksiteState: 'TX',
    salaryFloor: 120_000,
    salaryCeiling: 150_000,
    wageUnit: 'Year',
    caseStatus: 'Certified',
    caseNumber: 'CASE-001',
    socCode: '15-1252.00',
    visaClass: 'H-1B',
    ...overrides,
  };
}

describe('filing listing aggregation', () => {
  it('collapses distinct cases with identical displayed dimensions', () => {
    const first = filing({ caseNumber: 'CASE-001' });
    const second = filing({ caseNumber: 'CASE-002', caseStatus: 'Withdrawn' });

    const listings = aggregateFilingListings([first, second]);

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      employerName: 'Example Inc.',
      jobTitle: 'DevOps Engineer',
      roleCategory: 'DevOps',
      worksiteCity: 'Austin',
      worksiteState: 'TX',
      salaryFloor: 120_000,
      salaryCeiling: 150_000,
      companyFilingCount: 2,
    });
    expect(listings[0]).not.toHaveProperty('caseNumber');
    expect(listings[0]).not.toHaveProperty('caseStatus');
  });

  it('does not inflate counts when the same case row is repeated', () => {
    const repeated = filing();
    const listings = aggregateFilingListings([repeated, { ...repeated }]);

    expect(listings).toHaveLength(1);
    expect(listings[0].companyFilingCount).toBe(1);
    expect(countDistinctCases([repeated, { ...repeated }])).toBe(1);
  });

  it('keeps every changed display dimension as a separate listing', () => {
    const rows = [
      filing(),
      filing({ caseNumber: 'CASE-002', jobTitle: 'Platform Engineer' }),
      filing({ caseNumber: 'CASE-003', roleCategory: 'Platform / Infrastructure' }),
      filing({ caseNumber: 'CASE-004', worksiteCity: 'Dallas' }),
      filing({ caseNumber: 'CASE-005', worksiteState: 'CA' }),
      filing({ caseNumber: 'CASE-006', salaryFloor: 125_000 }),
      filing({ caseNumber: 'CASE-007', salaryCeiling: null }),
    ];

    const listings = aggregateFilingListings(rows);

    expect(listings).toHaveLength(rows.length);
    expect(new Set(listings.map((listing) => listing.listingId)).size).toBe(rows.length);
    expect(listings.every((listing) => listing.companyFilingCount === rows.length)).toBe(true);
  });

  it('never merges different legal employers that share a display name', () => {
    const rows = [
      filing({ employerId: 'example-inc-a1', caseNumber: 'CASE-001' }),
      filing({ employerId: 'example-inc-b2', caseNumber: 'CASE-002' }),
    ];

    const listings = aggregateFilingListings(rows);

    expect(listings).toHaveLength(2);
    expect(new Set(listings.map((listing) => listing.employerId))).toEqual(
      new Set(['example-inc-a1', 'example-inc-b2']),
    );
    expect(new Set(listings.map((listing) => listing.listingId)).size).toBe(2);
  });

  it('recomputes employer counts from the filtered input scope', () => {
    const allRows = [
      filing({ caseNumber: 'CASE-001', worksiteState: 'TX' }),
      filing({ caseNumber: 'CASE-002', worksiteState: 'TX', worksiteCity: 'Dallas' }),
      filing({ caseNumber: 'CASE-003', worksiteState: 'CA', worksiteCity: 'Oakland' }),
    ];
    const texasRows = allRows.filter((row) => row.worksiteState === 'TX');

    expect(aggregateFilingListings(allRows)[0].companyFilingCount).toBe(3);
    expect(aggregateFilingListings(texasRows).every((row) => row.companyFilingCount === 2)).toBe(true);
  });

  it('counts distinct cases by arbitrary keys', () => {
    const multiStateCase = filing({ caseNumber: 'CASE-001', worksiteState: 'TX' });
    const rows = [
      multiStateCase,
      { ...multiStateCase, worksiteState: 'CA', worksiteCity: 'Oakland' },
      filing({ caseNumber: 'CASE-002', worksiteState: 'TX' }),
    ];

    expect(countDistinctCases(rows)).toBe(2);
    expect(countDistinctCasesBy(rows, (row) => row.employerId)).toEqual(
      new Map([['example-inc-a1', 2]]),
    );
    expect(countDistinctCasesBy(rows, (row) => row.worksiteState)).toEqual(
      new Map([['TX', 2], ['CA', 1]]),
    );
  });

  it('returns the same deterministic ordering and IDs for any input order', () => {
    const rows = [
      filing({ caseNumber: 'CASE-001', employerName: 'Zulu Inc.' }),
      filing({ caseNumber: 'CASE-002', employerId: 'alpha-inc-b2', employerName: 'Alpha Inc.' }),
      filing({ caseNumber: 'CASE-003', employerName: 'Example Inc.', worksiteCity: 'Boston' }),
    ];

    const forward = aggregateFilingListings(rows);
    const reversed = aggregateFilingListings([...rows].reverse());

    expect(reversed).toEqual(forward);
    expect(forward.map((row) => row.employerName)).toEqual(['Alpha Inc.', 'Example Inc.', 'Zulu Inc.']);
  });
});
