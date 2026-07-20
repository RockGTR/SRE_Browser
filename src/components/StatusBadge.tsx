export function StatusBadge({ value }: { value: string }) {
  const tone = /careers page verified|all checks passed|passed/i.test(value)
    ? 'positive'
    : /failed|error|missing/i.test(value)
      ? 'negative'
      : /official website only|needs research|review required|not verified/i.test(value)
        ? 'caution'
        : 'neutral';
  return <span className={`status-badge ${tone}`}>{value}</span>;
}
