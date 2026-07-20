import { describe, expect, it } from 'vitest';
import { classifyFilingRole, normalizeEmployerName, slugify } from './normalization';

describe('filing normalization and classification', () => {
  it('normalizes employer punctuation consistently', () => {
    expect(normalizeEmployerName('Oracle America, Inc.')).toBe('oracleamericainc');
    expect(slugify('Oracle America, Inc.')).toBe(slugify('Oracle America Inc'));
  });

  it('reproduces the filing role precedence', () => {
    expect(classifyFilingRole('Site Reliability Engineer')).toBe('SRE / Site Reliability');
    expect(classifyFilingRole('DevOps Engineer')).toBe('DevOps');
    expect(classifyFilingRole('Cloud Infrastructure Engineer')).toBe('Platform / Infrastructure');
  });
});
