import fs from 'node:fs/promises';
import path from 'node:path';
import type { DataQuality, EmployerRecord, Metadata } from '../src/types/data';

const root = process.cwd();

async function read<T>(name: string): Promise<T> {
  return JSON.parse(await fs.readFile(path.join(root, 'public', 'data', name), 'utf8')) as T;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isPublicHttps(value: string): boolean {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

const [employers, quality, metadata] = await Promise.all([
  read<EmployerRecord[]>('employers.json'),
  read<DataQuality>('data-quality.json'),
  read<Metadata>('metadata.json'),
]);

assert(employers.length === 515, `Expected 515 employers, found ${employers.length}.`);
assert(new Set(employers.map((employer) => employer.employerId)).size === employers.length, 'Employer IDs must be unique.');
for (const employer of employers) {
  assert(employer.totalFilings > 0, `${employer.employerName} has no H-1B filing evidence.`);
  assert(Object.values(employer.roleCounts).reduce((total, count) => total + count, 0) === employer.totalFilings,
    `${employer.employerName} role counts do not equal its total filings.`);
  if (employer.officialWebsite !== 'NA') assert(isPublicHttps(employer.officialWebsite), `${employer.employerName} has an invalid official website.`);
  if (employer.careersPage !== 'NA') {
    assert(isPublicHttps(employer.careersPage), `${employer.employerName} has an invalid careers page.`);
    assert(!/linkedin\.com/i.test(employer.careersPage), `${employer.employerName} incorrectly uses LinkedIn as its careers page.`);
    assert(employer.evidenceUrls.length > 0, `${employer.employerName} has no careers-page evidence.`);
    assert(employer.careersStatus === 'Careers page verified', `${employer.employerName} has inconsistent careers status.`);
  }
}

const verifiedCareersPages = employers.filter((employer) => employer.careersPage !== 'NA').length;
const verifiedOfficialWebsites = employers.filter((employer) => employer.officialWebsite !== 'NA').length;
const roleTotals = employers.reduce((totals, employer) => ({
  sre: totals.sre + employer.roleCounts['SRE / Site Reliability'],
  devops: totals.devops + employer.roleCounts.DevOps,
  platform: totals.platform + employer.roleCounts['Platform / Infrastructure'],
}), { sre: 0, devops: 0, platform: 0 });

assert(verifiedCareersPages === 138, `Expected 138 verified careers pages, found ${verifiedCareersPages}.`);
assert(verifiedOfficialWebsites === 141, `Expected 141 verified official websites, found ${verifiedOfficialWebsites}.`);
assert(quality.needsResearch === 374, `Expected 374 employers needing identity research, found ${quality.needsResearch}.`);
assert(quality.officialWebsiteOnly === 3, `Expected 3 official-website-only employers, found ${quality.officialWebsiteOnly}.`);
assert(metadata.nationalDistinctCaseCount === 856, 'National H-1B case total must be 856.');
assert(roleTotals.sre === 258 && roleTotals.devops === 565 && roleTotals.platform === 33,
  `Role totals are ${roleTotals.sre}/${roleTotals.devops}/${roleTotals.platform}, expected 258/565/33.`);
assert(quality.reconciliation.every((item) => item.passed), 'All reconciliation checks must pass.');

console.log(`Directory validation passed: ${employers.length} employers, ${verifiedCareersPages} verified careers pages, ${verifiedOfficialWebsites} verified websites, and 856 H-1B cases.`);
