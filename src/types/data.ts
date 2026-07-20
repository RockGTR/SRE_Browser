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
  totalFilings: number;
  roleCounts: Record<FilingRole, number>;
  salaryFloor: number | null;
  salaryCeiling: number | null;
  filingStates: string[];
  filingTitles: string[];
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
  reconciliation: ReconciliationCheck[];
}

export interface Metadata {
  title: string;
  description: string;
  filingPeriod: string;
  generatedAt: string;
  nationalDistinctCaseCount: number;
  sourceFiles: string[];
}
