import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import XLSX from 'xlsx';
import type {
  DataQuality,
  EmployerRecord,
  FilingRole,
  Metadata,
  ReconciliationCheck,
} from '../src/types/data';
import { classifyFilingRole, NA, normalizeEmployerName, slugify } from './lib/normalization';
import { loadEmployerRegistry } from './registry/io';

const root = process.cwd();
const publicDataDir = path.join(root, 'public', 'data');
const cacheDir = path.join(root, 'data-cache');
const employerWorkbookPath = path.join(root, 'H1B_SRE_DevOps_Employers_FY2026_Q2.xlsx');
const filingCsvPath = path.join(root, 'H1B_SRE_DevOps_Filtered_Filings_FY2026_Q2.csv');
const officialDisclosurePath = path.join(root, 'LCA_Dislclosure_Data_FY2026_Q2.xlsx');

type SheetRow = Record<string, string | number | null | undefined>;

interface FilingSummaryRow {
  employerId: string;
  jobTitle: string;
  roleCategory: FilingRole;
  worksiteState: string;
  salaryFloor: number | null;
  salaryCeiling: number | null;
  caseNumber: string;
}

async function readJsonWithFallback<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(fileName: string, value: unknown): Promise<void> {
  await fs.writeFile(path.join(publicDataDir, fileName), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sheetRows(file: string, sheetName?: string): SheetRow[] {
  const workbook = XLSX.readFile(file, { cellDates: true });
  const selected = sheetName ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[selected];
  if (!sheet) throw new Error(`Sheet ${selected} was not found in ${path.basename(file)}.`);
  return XLSX.utils.sheet_to_json<SheetRow>(sheet, { defval: null, raw: true });
}

async function loadVisaClasses(caseNumbers: string[]): Promise<Record<string, string>> {
  const cachePath = path.join(cacheDir, 'visa-class-by-case.json');
  const cached = await readJsonWithFallback<Record<string, string>>(cachePath, {});
  if (caseNumbers.every((caseNumber) => cached[caseNumber])) return cached;

  if (!existsSync(officialDisclosurePath)) {
    throw new Error('The official DOL disclosure workbook is required to exclude non-H-1B records.');
  }
  const extraction = spawnSync(
    'python3',
    [path.join(root, 'scripts', 'extract-visa-class.py'), officialDisclosurePath],
    { cwd: root, input: JSON.stringify(caseNumbers), encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
  );
  if (extraction.status !== 0) {
    throw new Error(`Visa-class extraction failed: ${extraction.stderr || extraction.stdout}`);
  }
  const mapped = JSON.parse(extraction.stdout) as Record<string, string>;
  const missing = caseNumbers.filter((caseNumber) => !mapped[caseNumber]);
  if (missing.length) throw new Error(`${missing.length} cases were absent from the official disclosure workbook.`);
  await fs.writeFile(cachePath, `${JSON.stringify(mapped, null, 2)}\n`, 'utf8');
  return mapped;
}

function asString(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

function asNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function distinct<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function groupBy<T>(values: T[], key: (value: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const value of values) grouped.set(key(value), [...(grouped.get(key(value)) ?? []), value]);
  return grouped;
}

function check(name: string, expected: number, actual: number, note: string): ReconciliationCheck {
  return { name, expected, actual, passed: expected === actual, note };
}

async function main(): Promise<void> {
  await fs.mkdir(publicDataDir, { recursive: true });
  await fs.mkdir(cacheDir, { recursive: true });
  if (!existsSync(employerWorkbookPath) || !existsSync(filingCsvPath)) {
    throw new Error('The local employer workbook and filtered filing CSV are required to regenerate directory data.');
  }

  const employerRows = sheetRows(employerWorkbookPath, 'Employers');
  const filingRows = sheetRows(filingCsvPath);
  const registry = await loadEmployerRegistry(root);
  const registryById = new Map(registry.map((employer) => [employer.employerId, employer]));
  const displayByNormalized = new Map<string, string>();
  const employerIdByNormalized = new Map<string, string>();

  for (const row of employerRows) {
    const employerName = asString(row.Employer);
    if (!employerName) continue;
    const normalized = normalizeEmployerName(employerName);
    displayByNormalized.set(normalized, employerName);
    employerIdByNormalized.set(normalized, slugify(employerName));
  }

  const workbookEmployerIds = new Set(employerRows.map((row) => slugify(asString(row.Employer))));
  const missing = [...workbookEmployerIds].filter((employerId) => !registryById.has(employerId));
  const extra = registry.filter((employer) => !workbookEmployerIds.has(employer.employerId));
  if (missing.length || extra.length) {
    throw new Error(`Employer registry mismatch: ${missing.length} missing and ${extra.length} extra records.`);
  }

  const caseNumbers = distinct(filingRows.map((row) => asString(row['Case Number'])).filter(Boolean));
  const visaClassByCase = await loadVisaClasses(caseNumbers);
  const filings: FilingSummaryRow[] = filingRows
    .filter((row) => visaClassByCase[asString(row['Case Number'])] === 'H-1B')
    .map((row) => {
      const sourceEmployer = asString(row.Employer);
      const employerId = employerIdByNormalized.get(normalizeEmployerName(sourceEmployer));
      if (!employerId) throw new Error(`Filing employer is absent from the employer workbook: ${sourceEmployer}`);
      const jobTitle = asString(row['Job Title']);
      return {
        employerId,
        jobTitle,
        roleCategory: classifyFilingRole(jobTitle),
        worksiteState: asString(row['Worksite State']) || NA,
        salaryFloor: asNumber(row['Salary Floor']),
        salaryCeiling: asNumber(row['Salary Ceiling']),
        caseNumber: asString(row['Case Number']),
      };
    });

  const filingsByEmployer = groupBy(filings, (filing) => filing.employerId);
  const employers: EmployerRecord[] = employerRows.map((row) => {
    const employerName = asString(row.Employer);
    const employerId = slugify(employerName);
    const identity = registryById.get(employerId)!;
    const employerFilings = filingsByEmployer.get(employerId) ?? [];
    const cases = new Map(employerFilings.map((filing) => [filing.caseNumber, filing]));
    const roleCounts: Record<FilingRole, number> = {
      'SRE / Site Reliability': 0,
      DevOps: 0,
      'Platform / Infrastructure': 0,
    };
    for (const filing of cases.values()) roleCounts[filing.roleCategory] += 1;
    const salaryFloors = employerFilings.map((filing) => filing.salaryFloor).filter((value): value is number => value != null);
    const salaryValues = employerFilings.flatMap((filing) => [filing.salaryFloor, filing.salaryCeiling]).filter((value): value is number => value != null);
    const careersStatus = identity.careersPage
      ? 'Careers page verified' as const
      : identity.officialWebsite
        ? 'Official website only' as const
        : 'Needs research' as const;

    return {
      employerId,
      employerName,
      officialWebsite: identity.officialWebsite ?? NA,
      careersPage: identity.careersPage ?? NA,
      careersStatus,
      verificationSource: identity.verification.evidenceUrls[0] ?? NA,
      evidenceUrls: identity.verification.evidenceUrls,
      verifiedAt: identity.verification.verifiedAt,
      verificationNotes: identity.verification.notes,
      totalFilings: cases.size,
      roleCounts,
      salaryFloor: salaryFloors.length ? Math.min(...salaryFloors) : null,
      salaryCeiling: salaryValues.length ? Math.max(...salaryValues) : null,
      filingStates: distinct(employerFilings.map((filing) => filing.worksiteState)).sort(),
      filingTitles: distinct(employerFilings.map((filing) => filing.jobTitle)).sort(),
    };
  });

  const uniqueCases = new Map(filings.map((filing) => [filing.caseNumber, filing]));
  const roleTotals: Record<FilingRole, number> = {
    'SRE / Site Reliability': 0,
    DevOps: 0,
    'Platform / Infrastructure': 0,
  };
  for (const filing of uniqueCases.values()) roleTotals[filing.roleCategory] += 1;

  const verifiedCareersPages = employers.filter((employer) => employer.careersStatus === 'Careers page verified').length;
  const officialWebsiteOnly = employers.filter((employer) => employer.careersStatus === 'Official website only').length;
  const needsResearch = employers.filter((employer) => employer.careersStatus === 'Needs research').length;
  const verifiedOfficialWebsites = employers.filter((employer) => employer.officialWebsite !== NA).length;
  const reconciliation = [
    check('Employers', 515, employers.length, 'Legal employers from the FY2026 Q2 employer workbook.'),
    check('Distinct H-1B cases', 856, uniqueCases.size, 'Distinct case numbers after joining the official Visa Class field.'),
    check('SRE / Site Reliability cases', 258, roleTotals['SRE / Site Reliability'], 'Distinct H-1B case numbers.'),
    check('DevOps cases', 565, roleTotals.DevOps, 'Distinct H-1B case numbers.'),
    check('Platform / Infrastructure cases', 33, roleTotals['Platform / Infrastructure'], 'Distinct H-1B case numbers.'),
  ];
  const failed = reconciliation.filter((item) => !item.passed);
  if (failed.length) throw new Error(`Reconciliation failed: ${failed.map((item) => item.name).join(', ')}`);

  const generatedAt = new Date().toISOString();
  const quality: DataQuality = {
    generatedAt,
    totalEmployers: employers.length,
    verifiedOfficialWebsites,
    verifiedCareersPages,
    officialWebsiteOnly,
    needsResearch,
    careersCoveragePercent: Number(((verifiedCareersPages / employers.length) * 100).toFixed(1)),
    reconciliation,
  };
  const metadata: Metadata = {
    title: 'H-1B SRE Careers Directory',
    description: 'Verified official careers pages for employers with FY2026 Q2 SRE, DevOps, and platform H-1B filings.',
    filingPeriod: 'FY2026 Q2 cumulative — determinations from 2025-10-01 through 2026-03-31',
    generatedAt,
    nationalDistinctCaseCount: uniqueCases.size,
    sourceFiles: [path.basename(employerWorkbookPath), path.basename(filingCsvPath), path.basename(officialDisclosurePath)],
  };

  await Promise.all([
    writeJson('employers.json', employers),
    writeJson('data-quality.json', quality),
    writeJson('metadata.json', metadata),
  ]);
  console.log(`Built a careers directory for ${employers.length} employers: ${verifiedCareersPages} verified pages, ${officialWebsiteOnly} website-only, ${needsResearch} needing research.`);
  console.log(`H-1B evidence reconciled to ${uniqueCases.size} distinct cases (${roleTotals['SRE / Site Reliability']}/${roleTotals.DevOps}/${roleTotals['Platform / Infrastructure']}).`);
}

await main();
