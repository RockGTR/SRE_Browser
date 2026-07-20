import type { ReactNode } from 'react';

export function FilterBar({ children, onReset }: { children: ReactNode; onReset: () => void }) {
  return <div className="filter-bar">{children}<button type="button" className="secondary-button" onClick={onReset}>Reset filters</button></div>;
}

export function SearchField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="field"><span>{label}</span><input type="search" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

export function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ label: string; value: string }> }) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
