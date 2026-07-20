import type { FilingListingRecord, FilingRecord } from '../types/data';

type ListingDimension = string | number | null;

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareNullableNumber(left: number | null, right: number | null): number {
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left - right;
}

function listingDimensions(filing: FilingRecord): ListingDimension[] {
  return [
    filing.employerId,
    filing.employerName,
    filing.jobTitle,
    filing.roleCategory,
    filing.worksiteCity,
    filing.worksiteState,
    filing.salaryFloor,
    filing.salaryCeiling,
  ];
}

function createListingId(filing: FilingRecord): string {
  return `filing-listing:${JSON.stringify(listingDimensions(filing))}`;
}

function compareListings(left: FilingListingRecord, right: FilingListingRecord): number {
  return compareText(left.employerName, right.employerName)
    || compareText(left.employerId, right.employerId)
    || compareText(left.jobTitle, right.jobTitle)
    || compareText(left.roleCategory, right.roleCategory)
    || compareText(left.worksiteCity, right.worksiteCity)
    || compareText(left.worksiteState, right.worksiteState)
    || compareNullableNumber(left.salaryFloor, right.salaryFloor)
    || compareNullableNumber(left.salaryCeiling, right.salaryCeiling);
}

/** Count distinct H-1B cases in the provided (possibly filtered) filing rows. */
export function countDistinctCases(filings: readonly FilingRecord[]): number {
  return new Set(filings.map((filing) => filing.caseNumber)).size;
}

/** Count distinct cases independently for every selected group. */
export function countDistinctCasesBy<Key>(
  filings: readonly FilingRecord[],
  keySelector: (filing: FilingRecord) => Key,
): Map<Key, number> {
  const caseNumbersByKey = new Map<Key, Set<string>>();

  for (const filing of filings) {
    const key = keySelector(filing);
    const caseNumbers = caseNumbersByKey.get(key) ?? new Set<string>();
    caseNumbers.add(filing.caseNumber);
    caseNumbersByKey.set(key, caseNumbers);
  }

  return new Map(
    [...caseNumbersByKey].map(([key, caseNumbers]) => [key, caseNumbers.size]),
  );
}

/**
 * Collapse case/worksite rows to the exact case-free dimensions displayed in
 * drilldown tables. Company counts are recomputed from the supplied rows so
 * every consumer can pass its filtered filing subset and stay coordinated.
 */
export function aggregateFilingListings(
  filings: readonly FilingRecord[],
): FilingListingRecord[] {
  const companyFilingCounts = countDistinctCasesBy(filings, (filing) => filing.employerId);
  const listings = new Map<string, FilingListingRecord>();

  for (const filing of filings) {
    const listingId = createListingId(filing);
    if (listings.has(listingId)) continue;

    listings.set(listingId, {
      listingId,
      employerId: filing.employerId,
      employerName: filing.employerName,
      jobTitle: filing.jobTitle,
      roleCategory: filing.roleCategory,
      worksiteCity: filing.worksiteCity,
      worksiteState: filing.worksiteState,
      salaryFloor: filing.salaryFloor,
      salaryCeiling: filing.salaryCeiling,
      companyFilingCount: companyFilingCounts.get(filing.employerId) ?? 0,
    });
  }

  return [...listings.values()].sort(compareListings);
}
