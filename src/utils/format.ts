export function formatNumber(value: number | null | undefined): string {
  return value == null ? 'NA' : new Intl.NumberFormat('en-US').format(value);
}

export function formatCurrency(value: number | null | undefined): string {
  return value == null ? 'NA' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'NA';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

export function externalLinkProps() {
  return { target: '_blank', rel: 'noopener noreferrer' } as const;
}
