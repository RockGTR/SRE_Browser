import fs from 'node:fs/promises';
import path from 'node:path';
import type { EmployerRegistryRecord } from '../../src/types/data';

function isPublicHttps(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
}

function isLinkedIn(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === 'linkedin.com' || hostname.endsWith('.linkedin.com');
  } catch {
    return false;
  }
}

export async function loadEmployerRegistry(root = process.cwd()): Promise<EmployerRegistryRecord[]> {
  const file = path.join(root, 'data', 'registry', 'employers.json');
  const employers = JSON.parse(await fs.readFile(file, 'utf8')) as EmployerRegistryRecord[];
  const ids = new Set<string>();

  for (const employer of employers) {
    if (!employer.employerId || !employer.legalName || !employer.normalizedName) {
      throw new Error('Every employer registry record requires an ID, legal name, and normalized name.');
    }
    if (ids.has(employer.employerId)) throw new Error(`Duplicate employer ID: ${employer.employerId}`);
    ids.add(employer.employerId);

    if (employer.officialWebsite && !isPublicHttps(employer.officialWebsite)) {
      throw new Error(`Employer ${employer.employerId} has an invalid official website.`);
    }
    if (employer.careersPage && !isPublicHttps(employer.careersPage)) {
      throw new Error(`Employer ${employer.employerId} has an invalid careers page.`);
    }
    if (employer.officialWebsite && isLinkedIn(employer.officialWebsite)) {
      throw new Error(`Employer ${employer.employerId} cannot use LinkedIn as its official website.`);
    }
    if (employer.careersPage && isLinkedIn(employer.careersPage)) {
      throw new Error(`Employer ${employer.employerId} cannot use LinkedIn as its careers page.`);
    }
    if ((employer.officialWebsite || employer.careersPage) && employer.verification.status !== 'Verified') {
      throw new Error(`Employer ${employer.employerId} has an official URL without verified ownership evidence.`);
    }
    if (employer.verification.status === 'Verified' && !employer.verification.evidenceUrls.length) {
      throw new Error(`Verified employer ${employer.employerId} requires at least one evidence URL.`);
    }
    for (const evidenceUrl of employer.verification.evidenceUrls) {
      if (!isPublicHttps(evidenceUrl)) {
        throw new Error(`Employer ${employer.employerId} has an invalid evidence URL.`);
      }
    }
  }

  return employers;
}
