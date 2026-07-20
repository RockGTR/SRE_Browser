import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import XLSX from 'xlsx';
import type {
  DataQuality,
  EmployerRecord,
  FilingRecord,
  FilingRole,
  Metadata,
  ReconciliationCheck,
  StateSummary,
} from '../src/types/data';
import { classifyFilingRole, NA, normalizeEmployerName, slugify } from './lib/normalization';
import { loadEmployerRegistry } from './registry/io';

const root = process.cwd();
const publicDataDir = path.join(root, 'public', 'data');
const cacheDir = path.join(root, 'data-cache');
const employerWorkbookPath = path.join(root, 'H1B_SRE_DevOps_Employers_FY2026_Q2.xlsx');
const filingCsvPath = path.join(root, 'H1B_SRE_DevOps_Filtered_Filings_FY2026_Q2.csv');
const officialDisclosurePath = path.join(root, 'LCA_Dislclosure_Data_FY2026_Q2.xlsx');

const generatedFiles = new Set([
  'employers.json',
  'filings.json',
  'state-summary.json',
  'data-quality.json',
  'metadata.json',
]);

// Preserve the recovered state-browser index. HI and Unknown were present in
// the prior 38-row state projection but have no H-1B filing rows in this release,
// so their filing-only metrics are intentionally zero.
const retainedEmptyStateKeys = ['HI', 'Unknown'];

type SheetRow = Record<string, string | number | null | undefined>;

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

async function removeObsoleteGeneratedJson(): Promise<void> {
  const entries = await fs.readdir(publicDataDir, { withFileTypes: true });
  await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json') && !generatedFiles.has(entry.name))
    .map((entry) => fs.unlink(path.join(publicDataDir, entry.name))));
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
    throw new Error(
      'The official DOL disclosure workbook is required because the filtered filing source omits Visa Class. ' +
      'Download LCA_Dislclosure_Data_FY2026_Q2.xlsx before running build-data.',
    );
  }

  const extraction = spawnSync(
    'python3',
    [path.join(root, 'scripts', 'extract-visa-class.py'), officialDisclosurePath],
    {
      cwd: root,
      input: JSON.stringify(caseNumbers),
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  if (extraction.status !== 0) {
    throw new Error(`Visa-class extraction failed: ${extraction.stderr || extraction.stdout}`);
  }

  const mapped = JSON.parse(extraction.stdout) as Record<string, string>;
  const missing = caseNumbers.filter((caseNumber) => !mapped[caseNumber]);
  if (missing.length) {
    throw new Error(`${missing.length} filtered case numbers were absent from the official DOL disclosure workbook.`);
  }
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

function emptyRoleCounts(): Record<FilingRole, number> {
  return {
    'SRE / Site Reliability': 0,
    DevOps: 0,
    'Platform / Infrastructure': 0,
  };
}

function makeCheck(name: string, expected: number, actual: number, note: string): ReconciliationCheck {
  return { name, expected, actual, passed: expected === actual, note };
}

async function main(): Promise<void> {
  await fs.mkdir(publicDataDir, { recursive: true });
  await fs.mkdir(cacheDir, { recursive: true });
  if (!existsSync(employerWorkbookPath) || !existsSync(filingCsvPath)) {
    throw new Error('Required employer XLSX and filtered filing CSV sources were not found in the project root.');
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
  const missingRegistryEmployers = [...workbookEmployerIds].filter((employerId) => !registryById.has(employerId));
  const extraRegistryEmployers = registry.filter((employer) => !workbookEmployerIds.has(employer.employerId));
  if (missingRegistryEmployers.length || extraRegistryEmployers.length) {
    throw new Error(
      `Employer registry mismatch: ${missingRegistryEmployers.length} missing and ` +
      `${extraRegistryEmployers.length} extra records.`,
    );
  }

  const allCaseNumbers = distinct(filingRows.map((row) => asString(row['Case Number'])).filter(Boolean));
  const visaClassByCase = await loadVisaClasses(allCaseNumbers);
  const h1bRows = filingRows.filter((row) => visaClassByCase[asString(row['Case Number'])] === 'H-1B');
  const filings: FilingRecord[] = h1bRows.map((row) => {
    const sourceEmployer = asString(row.Employer);
    const normalizedEmployer = normalizeEmployerName(sourceEmployer);
    const employerName = displayByNormalized.get(normalizedEmployer);
    const employerId = employerIdByNormalized.get(normalizedEmployer);
    if (!employerName || !employerId) {
      throw new Error(`Filing employer is absent from the employer workbook: ${sourceEmployer}`);
    }

    return {
      employerId,
      employerName,
      jobTitle: asString(row['Job Title']),
      roleCategory: classifyFilingRole(asString(row['Job Title'])),
      worksiteCity: asString(row['Worksite City']) || NA,
      worksiteState: asString(row['Worksite State']) || NA,
      salaryFloor: asNumber(row['Salary Floor']),
      salaryCeiling: asNumber(row['Salary Ceiling']),
      wageUnit: asString(row['Wage Unit']) || NA,
      caseStatus: asString(row['Case Status']) || NA,
      caseNumber: asString(row['Case Number']),
      socCode: asString(row['SOC Code']) || NA,
      visaClass: 'H-1B',
    };
  });

  const uniqueCases = new Map<string, FilingRecord>();
  for (const filing of filings) uniqueCases.set(filing.caseNumber, filing);
  const nationalRoleCounts = emptyRoleCounts();
  for (const filing of uniqueCases.values()) nationalRoleCounts[filing.roleCategory] += 1;

  const filingsByEmployer = groupBy(filings, (filing) => filing.employerId);
  const employers: EmployerRecord[] = employerRows.map((row) => {
    const employerName = asString(row.Employer);
    const employerId = slugify(employerName);
    const identity = registryById.get(employerId)!;
    const employerFilings = filingsByEmployer.get(employerId) ?? [];
    const employerCases = new Map(employerFilings.map((filing) => [filing.caseNumber, filing]));
    const roleCounts = emptyRoleCounts();
    for (const filing of employerCases.values()) roleCounts[filing.roleCategory] += 1;
    const salaryFloors = employerFilings
      .map((filing) => filing.salaryFloor)
      .filter((value): value is number => value != null);
    const salaryValues = employerFilings
      .flatMap((filing) => [filing.salaryFloor, filing.salaryCeiling])
      .filter((value): value is number => value != null);
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
      totalFilings: employerCases.size,
      roleCounts,
      salaryFloor: salaryFloors.length ? Math.min(...salaryFloors) : null,
      salaryCeiling: salaryValues.length ? Math.max(...salaryValues) : null,
      filingStates: distinct(employerFilings.map((filing) => filing.worksiteState)).sort(),
      filingTitles: distinct(employerFilings.map((filing) => filing.jobTitle)).sort(),
    };
  });

  const filingsByState = groupBy(filings, (filing) => filing.worksiteState);
  const stateKeys = distinct([...filingsByState.keys(), ...retainedEmptyStateKeys]).sort();
  const stateSummary: StateSummary[] = stateKeys
    .map((state) => {
      const stateFilings = filingsByState.get(state) ?? [];
      const stateCases = new Map(stateFilings.map((filing) => [filing.caseNumber, filing]));
      const roleCounts = emptyRoleCounts();
      for (const filing of stateCases.values()) roleCounts[filing.roleCategory] += 1;
      return { state, filingCount: stateCases.size, roleCounts };
    });

  const reconciliation = [
    makeCheck('Employers', 515, employers.length, 'Legal employers come from the FY2026 Q2 Employers worksheet.'),
    makeCheck('Filing/worksite rows', 1221, filings.length, 'H-1B case/worksite rows retained for browsing and state views.'),
    makeCheck('Distinct H-1B cases', 856, uniqueCases.size, 'National totals use distinct Case Number after the official Visa Class join.'),
    makeCheck('State summaries', 38, stateSummary.length, 'The index contains 36 observed locations plus zero-row HI and Unknown entries; every metric is filing-derived.'),
    makeCheck('SRE / Site Reliability cases', 258, nationalRoleCounts['SRE / Site Reliability'], 'Role totals use distinct Case Number.'),
    makeCheck('DevOps cases', 565, nationalRoleCounts.DevOps, 'Role totals use distinct Case Number.'),
    makeCheck('Platform / Infrastructure cases', 33, nationalRoleCounts['Platform / Infrastructure'], 'Role totals use distinct Case Number.'),
  ];
  const failedChecks = reconciliation.filter((check) => !check.passed);
  if (failedChecks.length) {
    throw new Error(
      `Reconciliation failed: ${failedChecks.map((check) => `${check.name} expected ${check.expected}, got ${check.actual}`).join('; ')}`,
    );
  }

  const verifiedCareersPages = employers.filter((employer) => employer.careersStatus === 'Careers page verified').length;
  const officialWebsiteOnly = employers.filter((employer) => employer.careersStatus === 'Official website only').length;
  const needsResearch = employers.filter((employer) => employer.careersStatus === 'Needs research').length;
  const verifiedOfficialWebsites = employers.filter((employer) => employer.officialWebsite !== NA).length;
  const generatedAt = new Date().toISOString();
  const quality: DataQuality = {
    generatedAt,
    totalEmployers: employers.length,
    verifiedOfficialWebsites,
    verifiedCareersPages,
    officialWebsiteOnly,
    needsResearch,
    careersCoveragePercent: Number(((verifiedCareersPages / employers.length) * 100).toFixed(1)),
    filingWorksiteRowCount: filings.length,
    nationalDistinctCaseCount: uniqueCases.size,
    stateCount: stateSummary.length,
    reconciliation,
  };
  const metadata: Metadata = {
    title: 'H-1B SRE Browser',
    description: 'FY2026 Q2 H-1B SRE, DevOps, and platform filing data with verified official company careers pages.',
    filingPeriod: 'FY2026 Q2 cumulative — determinations from 2025-10-01 through 2026-03-31',
    generatedAt,
    nationalDistinctCaseCount: uniqueCases.size,
    filingWorksiteRowCount: filings.length,
    stateTotalsAreNonAdditive: true,
    visaClassMethod: 'Official DOL disclosure workbook joined on Case Number',
    sourceFiles: [
      path.basename(employerWorkbookPath),
      path.basename(filingCsvPath),
      path.basename(officialDisclosurePath),
      'data/registry/employers.json',
    ],
  };

  await Promise.all([
    writeJson('employers.json', employers),
    writeJson('filings.json', filings),
    writeJson('state-summary.json', stateSummary),
    writeJson('data-quality.json', quality),
    writeJson('metadata.json', metadata),
  ]);
  await removeObsoleteGeneratedJson();

  console.log(
    `Built ${employers.length} employers, ${uniqueCases.size} distinct H-1B cases, ` +
    `${filings.length} case/worksite rows, and ${stateSummary.length} filing-state summaries.`,
  );
  console.log(
    `Careers coverage: ${verifiedCareersPages} verified careers pages, ` +
    `${officialWebsiteOnly} official websites only, ${needsResearch} needing research.`,
  );
}

await main();
