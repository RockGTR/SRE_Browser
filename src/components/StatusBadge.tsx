export function StatusBadge({ value }: { value: string }) {
  const tone = /careers page verified|passed|all checks passed/i.test(value)
    ? 'positive'
    : /failed|error/i.test(value)
      ? 'negative'
      : /official website only/i.test(value)
        ? 'caution'
        : /needs research|review required/i.test(value)
          ? 'info'
          : 'neutral';
  return <span className={`status-badge ${tone}`}>{value}</span>;
}
