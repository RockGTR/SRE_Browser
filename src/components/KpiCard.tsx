import type { ReactNode } from 'react';

export function KpiCard({ label, value, note, icon }: { label: string; value: string | number; note?: string; icon?: ReactNode }) {
  return (
    <article className="kpi-card">
      <div className="kpi-top"><span className="kpi-icon" aria-hidden="true">{icon ?? '↗'}</span><span className="eyebrow">{label}</span></div>
      <strong>{value}</strong>
      {note && <p>{note}</p>}
    </article>
  );
}
