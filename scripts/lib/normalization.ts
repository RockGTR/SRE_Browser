import { createHash } from 'node:crypto';
import type { FilingRole } from '../../src/types/data';

export const NA = 'NA';

export function normalizeEmployerName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
  const hash = createHash('sha1').update(normalizeEmployerName(value)).digest('hex').slice(0, 7);
  return `${base || 'employer'}-${hash}`;
}

export function classifyFilingRole(title: string): FilingRole {
  if (/site\s*reliab|\bsre\b/i.test(title)) return 'SRE / Site Reliability';
  if (/dev\s*ops/i.test(title)) return 'DevOps';
  return 'Platform / Infrastructure';
}
