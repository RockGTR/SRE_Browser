export type FilingRole = 'SRE / Site Reliability' | 'DevOps' | 'Platform / Infrastructure';

export type CareersStatus =
  | 'Careers page verified'
  | 'Official website only'
  | 'Needs research';

export type RegistryVerificationStatus =
  | 'Unverified'
  | 'Candidate'
  | 'Verified'
  | 'Rejected'
  | 'Needs Review';

export interface RegistryVerification {
  status: RegistryVerificationStatus;
  evidenceUrls: string[];
  verifiedAt: string | null;
  notes: string;
}

export interface EmployerRegistryRecord {
  employerId: string;
  legalName: string;
  normalizedName: string;
  officialWebsite: string | null;
  careersPage: string | null;
  verification: RegistryVerification;
  provenance: {
    source: string;
    sourceFile: string;
  };
}

export interface FilingRecord {
  employerId: string;
  employerName: string;
  jobTitle: string;
  roleCategory: FilingRole;
  worksiteCity: string;
  worksiteState: string;
  salaryFloor: number | null;
  salaryCeiling: number | null;
  wageUnit: string;
  caseStatus: string;
  caseNumber: string;
  socCode: string;
  visaClass: 'H-1B';
}

/**
 * A case-free filing row at the exact grain shown in dashboard drilldowns.
 * Multiple cases with the same displayed dimensions collapse into one row.
 */
export interface FilingListingRecord {
  listingId: string;
  employerId: string;
  employerName: string;
  jobTitle: string;
  roleCategory: FilingRole;
  worksiteCity: string;
  worksiteState: string;
  salaryFloor: number | null;
  salaryCeiling: number | null;
  /** Distinct cases for this employer within the input/filter scope. */
  companyFilingCount: number;
}

export interface EmployerRecord {
  employerId: string;
  employerName: string;
  officialWebsite: string;
  careersPage: string;
  careersStatus: CareersStatus;
  verificationSource: string;
  evidenceUrls: string[];
  verifiedAt: string | null;
  verificationNotes: string;
  /** Distinct H-1B case count for this employer. */
  totalFilings: number;
  roleCounts: Record<FilingRole, number>;
  salaryFloor: number | null;
  salaryCeiling: number | null;
  filingStates: string[];
  filingTitles: string[];
}

export interface StateSummary {
  state: string;
  /** Distinct H-1B cases with at least one worksite in this state. */
  filingCount: number;
  roleCounts: Record<FilingRole, number>;
}

export interface ReconciliationCheck {
  name: string;
  expected: number;
  actual: number;
  passed: boolean;
  note: string;
}

export interface DataQuality {
  generatedAt: string;
  totalEmployers: number;
  verifiedOfficialWebsites: number;
  verifiedCareersPages: number;
  officialWebsiteOnly: number;
  needsResearch: number;
  careersCoveragePercent: number;
  filingWorksiteRowCount: number;
  nationalDistinctCaseCount: number;
  stateCount: number;
  reconciliation: ReconciliationCheck[];
}

export interface Metadata {
  title: string;
  description: string;
  filingPeriod: string;
  generatedAt: string;
  nationalDistinctCaseCount: number;
  filingWorksiteRowCount: number;
  stateTotalsAreNonAdditive: boolean;
  visaClassMethod: string;
  sourceFiles: string[];
}
