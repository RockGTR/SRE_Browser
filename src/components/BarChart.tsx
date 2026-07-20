import ReactECharts from 'echarts-for-react';

export function BarChart({ title, data, onSelect, horizontal = true, stacked }: {
  title: string;
  data: Array<{ label: string; value: number; secondary?: number; tertiary?: number }>;
  onSelect?: (label: string) => void;
  horizontal?: boolean;
  stacked?: boolean;
}) {
  const categories = data.map((item) => item.label);
  const series = [
    { name: stacked ? 'SRE / Site Reliability' : title, data: data.map((item) => item.value), type: 'bar', stack: stacked ? 'total' : undefined, itemStyle: { color: '#0f766e', borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0] } },
    ...(stacked ? [
      { name: 'DevOps', data: data.map((item) => item.secondary ?? 0), type: 'bar', stack: 'total', itemStyle: { color: '#d97706' } },
      { name: 'Platform / Infrastructure', data: data.map((item) => item.tertiary ?? 0), type: 'bar', stack: 'total', itemStyle: { color: '#667085' } },
    ] : []),
  ];
  const option = {
    aria: {
      enabled: true,
      description: `${title}. ${data.map((item) => stacked
        ? `${item.label}: SRE ${item.value}, DevOps ${item.secondary ?? 0}, Platform ${item.tertiary ?? 0}`
        : `${item.label}: ${item.value}`).join(', ')}`,
    },
    animationDuration: 350,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { show: Boolean(stacked), bottom: 0 },
    grid: { left: horizontal ? 120 : 48, right: 20, top: 18, bottom: stacked ? 56 : 38, containLabel: false },
    xAxis: horizontal ? { type: 'value', minInterval: 1 } : { type: 'category', data: categories, axisLabel: { rotate: data.length > 7 ? 35 : 0 } },
    yAxis: horizontal ? { type: 'category', data: categories, inverse: true, axisLabel: { width: 108, overflow: 'truncate' } } : { type: 'value', minInterval: 1 },
    series,
  };
  return (
    <div className="chart-block">
      <ReactECharts option={option} style={{ height: Math.max(280, data.length * (horizontal ? 32 : 22)) }} onEvents={onSelect ? { click: (params: { name: string }) => onSelect(params.name) } : undefined} />
      <details className="chart-table"><summary>View accessible data table</summary><table><thead><tr><th>Category</th><th>{stacked ? 'SRE / Site Reliability' : 'Value'}</th>{stacked && <><th>DevOps</th><th>Platform / Infrastructure</th></>}</tr></thead><tbody>{data.map((item) => <tr key={item.label}><td>{item.label}</td><td>{item.value}</td>{stacked && <><td>{item.secondary ?? 0}</td><td>{item.tertiary ?? 0}</td></>}</tr>)}</tbody></table></details>
    </div>
  );
}
