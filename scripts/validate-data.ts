import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  DataQuality,
  EmployerRecord,
  FilingRecord,
  FilingRole,
  Metadata,
  StateSummary,
} from '../src/types/data';
import { aggregateFilingListings } from '../src/features/filings/filingListings';
import { NA } from './lib/normalization';
import { loadEmployerRegistry } from './registry/io';

const root = process.cwd();
const dataDir = path.join(root, 'public', 'data');
const expectedGeneratedFiles = [
  'data-quality.json',
  'employers.json',
  'filings.json',
  'metadata.json',
  'state-summary.json',
];
const retainedEmptyStateKeys = ['HI', 'Unknown'];

async function read<T>(name: string): Promise<T> {
  return JSON.parse(await fs.readFile(path.join(dataDir, name), 'utf8')) as T;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertUnique(values: string[], label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    assert(Boolean(value.trim()), `${label} cannot be blank.`);
    assert(!seen.has(value), `Duplicate ${label}: ${value}.`);
    seen.add(value);
  }
}

function assertStringArraysEqual(actual: string[], expected: string[], message: string): void {
  assert(JSON.stringify(actual) === JSON.stringify(expected), message);
}

function isPublicHttps(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function emptyRoleCounts(): Record<FilingRole, number> {
  return {
    'SRE / Site Reliability': 0,
    DevOps: 0,
    'Platform / Infrastructure': 0,
  };
}

const generatedFiles = (await fs.readdir(dataDir))
  .filter((name) => name.endsWith('.json'))
  .sort();
assertStringArraysEqual(
  generatedFiles,
  expectedGeneratedFiles,
  `public/data must contain exactly ${expectedGeneratedFiles.join(', ')}; found ${generatedFiles.join(', ')}.`,
);

const [registry, employers, filings, stateSummary, quality, metadata] = await Promise.all([
  loadEmployerRegistry(root),
  read<EmployerRecord[]>('employers.json'),
  read<FilingRecord[]>('filings.json'),
  read<StateSummary[]>('state-summary.json'),
  read<DataQuality>('data-quality.json'),
  read<Metadata>('metadata.json'),
]);

assert(registry.length === 515, `Expected 515 canonical employers, found ${registry.length}.`);
assert(employers.length === 515, `Expected 515 employer records, found ${employers.length}.`);
assert(filings.length === 1221, `Expected 1221 H-1B case/worksite rows, found ${filings.length}.`);
assert(stateSummary.length === 38, `Expected 38 filing-state summaries, found ${stateSummary.length}.`);
assertUnique(employers.map((record) => record.employerId), 'employerId');
assertUnique(stateSummary.map((record) => record.state), 'state summary');

const registryById = new Map(registry.map((record) => [record.employerId, record]));
const employersById = new Map(employers.map((record) => [record.employerId, record]));
const filingsByEmployer = new Map<string, FilingRecord[]>();
for (const filing of filings) {
  assert(filing.visaClass === 'H-1B', `Non-H-1B row remains in filings.json: ${filing.caseNumber}.`);
  assert(!filing.caseNumber.startsWith('I-203-'), `E-3 case remains in filings.json: ${filing.caseNumber}.`);
  assert(Boolean(filing.caseNumber), 'A filing row has no case number.');
  assert(Boolean(filing.jobTitle), `Filing ${filing.caseNumber} has no job title.`);
  assert(registryById.has(filing.employerId), `Filing ${filing.caseNumber} references unknown employer ${filing.employerId}.`);
  filingsByEmployer.set(filing.employerId, [...(filingsByEmployer.get(filing.employerId) ?? []), filing]);
}

for (const canonical of registry) {
  const employer = employersById.get(canonical.employerId);
  assert(employer, `Canonical employer ${canonical.employerId} is missing from employers.json.`);
  assert(employer.employerName === canonical.legalName, `Employer name drifted for ${canonical.employerId}.`);
  assert(employer.officialWebsite === (canonical.officialWebsite ?? NA), `Official website drifted for ${canonical.employerId}.`);
  assert(employer.careersPage === (canonical.careersPage ?? NA), `Careers page drifted for ${canonical.employerId}.`);
  assertStringArraysEqual(
    employer.evidenceUrls,
    canonical.verification.evidenceUrls,
    `Verification evidence drifted for ${canonical.employerId}.`,
  );
  assert(employer.verifiedAt === canonical.verification.verifiedAt, `Verification date drifted for ${canonical.employerId}.`);
  assert(employer.verificationNotes === canonical.verification.notes, `Verification notes drifted for ${canonical.employerId}.`);

  const employerFilings = filingsByEmployer.get(canonical.employerId) ?? [];
  const employerCases = new Map(employerFilings.map((filing) => [filing.caseNumber, filing]));
  const roleCounts = emptyRoleCounts();
  for (const filing of employerCases.values()) roleCounts[filing.roleCategory] += 1;
  assert(employer.totalFilings === employerCases.size, `Distinct filing total drifted for ${canonical.employerId}.`);
  assert(
    JSON.stringify(employer.roleCounts) === JSON.stringify(roleCounts),
    `Role counts drifted for ${canonical.employerId}.`,
  );
  assertStringArraysEqual(
    employer.filingStates,
    [...new Set(employerFilings.map((filing) => filing.worksiteState))].sort(),
    `Filing states drifted for ${canonical.employerId}.`,
  );
  assertStringArraysEqual(
    employer.filingTitles,
    [...new Set(employerFilings.map((filing) => filing.jobTitle))].sort(),
    `Filing titles drifted for ${canonical.employerId}.`,
  );
  assertUnique(employer.filingTitles, `${canonical.employerId} filing title`);

  if (employer.officialWebsite !== NA) {
    assert(isPublicHttps(employer.officialWebsite), `${canonical.employerId} has an invalid official website.`);
  }
  if (employer.careersPage !== NA) {
    assert(isPublicHttps(employer.careersPage), `${canonical.employerId} has an invalid careers page.`);
    assert(!/linkedin\.com/i.test(employer.careersPage), `${canonical.employerId} incorrectly uses LinkedIn as its careers page.`);
    assert(employer.evidenceUrls.length > 0, `${canonical.employerId} has no careers-page evidence.`);
    assert(employer.careersStatus === 'Careers page verified', `${canonical.employerId} has inconsistent careers status.`);
  } else if (employer.officialWebsite !== NA) {
    assert(employer.careersStatus === 'Official website only', `${canonical.employerId} has inconsistent website-only status.`);
  } else {
    assert(employer.careersStatus === 'Needs research', `${canonical.employerId} has inconsistent research status.`);
  }
}

for (const employer of employers) {
  assert(registryById.has(employer.employerId), `employers.json contains unknown employer ${employer.employerId}.`);
}

const uniqueCases = new Map(filings.map((filing) => [filing.caseNumber, filing]));
assert(uniqueCases.size === 856, `Expected 856 distinct H-1B cases, found ${uniqueCases.size}.`);
const filingListings = aggregateFilingListings(filings);
assert(filingListings.length === 1120, `Expected 1120 unique filing listings, found ${filingListings.length}.`);
assertUnique(filingListings.map((listing) => listing.listingId), 'filing listing ID');
for (const listing of filingListings) {
  assert(
    listing.companyFilingCount === employersById.get(listing.employerId)?.totalFilings,
    `Company filing count drifted for listing ${listing.listingId}.`,
  );
}
const nationalRoleCounts = emptyRoleCounts();
for (const filing of uniqueCases.values()) nationalRoleCounts[filing.roleCategory] += 1;
assert(nationalRoleCounts['SRE / Site Reliability'] === 258,
  `Expected 258 SRE cases, found ${nationalRoleCounts['SRE / Site Reliability']}.`);
assert(nationalRoleCounts.DevOps === 565, `Expected 565 DevOps cases, found ${nationalRoleCounts.DevOps}.`);
assert(nationalRoleCounts['Platform / Infrastructure'] === 33,
  `Expected 33 platform cases, found ${nationalRoleCounts['Platform / Infrastructure']}.`);

const stateSummaryByState = new Map(stateSummary.map((record) => [record.state, record]));
const filingStates = [...new Set([
  ...filings.map((filing) => filing.worksiteState),
  ...retainedEmptyStateKeys,
])].sort();
assertStringArraysEqual(
  [...stateSummaryByState.keys()].sort(),
  filingStates,
  'State summaries do not match the states represented by filing rows.',
);
for (const state of filingStates) {
  const summary = stateSummaryByState.get(state)!;
  const stateFilings = filings.filter((filing) => filing.worksiteState === state);
  const stateCases = new Map(stateFilings.map((filing) => [filing.caseNumber, filing]));
  const roleCounts = emptyRoleCounts();
  for (const filing of stateCases.values()) roleCounts[filing.roleCategory] += 1;
  assert(summary.filingCount === stateCases.size, `Filing count drifted for state ${state}.`);
  assert(JSON.stringify(summary.roleCounts) === JSON.stringify(roleCounts), `Role counts drifted for state ${state}.`);
  assert(!('openingCount' in summary), `State ${state} still contains an opening count.`);
}

const verifiedCareersPages = employers.filter((employer) => employer.careersPage !== NA).length;
const verifiedOfficialWebsites = employers.filter((employer) => employer.officialWebsite !== NA).length;
const officialWebsiteOnly = employers.filter((employer) => employer.careersStatus === 'Official website only').length;
const needsResearch = employers.filter((employer) => employer.careersStatus === 'Needs research').length;
assert(verifiedCareersPages === 138, `Expected 138 verified careers pages, found ${verifiedCareersPages}.`);
assert(verifiedOfficialWebsites === 141, `Expected 141 verified official websites, found ${verifiedOfficialWebsites}.`);
assert(officialWebsiteOnly === 3, `Expected 3 official-website-only employers, found ${officialWebsiteOnly}.`);
assert(needsResearch === 374, `Expected 374 employers needing research, found ${needsResearch}.`);

assert(quality.totalEmployers === employers.length, 'Data-quality employer total drifted.');
assert(quality.verifiedCareersPages === verifiedCareersPages, 'Data-quality careers-page total drifted.');
assert(quality.verifiedOfficialWebsites === verifiedOfficialWebsites, 'Data-quality official-website total drifted.');
assert(quality.officialWebsiteOnly === officialWebsiteOnly, 'Data-quality website-only total drifted.');
assert(quality.needsResearch === needsResearch, 'Data-quality research total drifted.');
assert(quality.filingWorksiteRowCount === 1221, 'Data-quality filing/worksite row total must be 1221.');
assert(quality.nationalDistinctCaseCount === 856, 'Data-quality national case total must be 856.');
assert(quality.stateCount === 38, 'Data-quality state total must be 38.');
assert(quality.reconciliation.every((check) => check.passed), 'One or more reconciliation checks failed.');

assert(metadata.nationalDistinctCaseCount === 856, 'Metadata national case total must be 856.');
assert(metadata.filingWorksiteRowCount === 1221, 'Metadata filing/worksite row total must be 1221.');
assert(metadata.stateTotalsAreNonAdditive === true, 'Metadata must identify state totals as non-additive.');
assert(metadata.visaClassMethod.includes('Official DOL'), 'Metadata must document the official Visa Class join.');

console.log(
  `Data validation passed: ${employers.length} employers, ${uniqueCases.size} distinct H-1B cases, ` +
  `${filings.length} case/worksite rows, ${filingListings.length} unique filing listings, ` +
  `${stateSummary.length} filing-state summaries, and ` +
  `${verifiedCareersPages} verified careers pages.`,
);
