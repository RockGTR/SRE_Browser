import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import usAtlas from 'us-atlas/states-10m.json';

const fipsToState: Record<string, string> = {
  '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE','11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA','20':'KS','21':'KY','22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT','31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND','39':'OH','40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD','47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA','54':'WV','55':'WI','56':'WY',
};

export function StateMap({ values, selected, onSelect, label }: { values: Record<string, number>; selected?: string; onSelect: (state: string) => void; label: string }) {
  const max = Math.max(1, ...Object.values(values));
  const rows = Object.entries(values).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  return (
    <div className="map-shell" role="group" aria-label={label}>
      <ComposableMap projection="geoAlbersUsa" width={800} height={490}>
        <Geographies geography={usAtlas as never}>
          {({ geographies }) => geographies.map((geography) => {
            const state = fipsToState[String(geography.id).padStart(2, '0')];
            const value = values[state] ?? 0;
            const intensity = value / max;
            const fill = value === 0 ? '#e7edf2' : `hsl(174 66% ${Math.round(83 - intensity * 52)}%)`;
            return <Geography key={geography.rsmKey} geography={geography} onClick={() => state && onSelect(state)} tabIndex={0} role="button" aria-label={`${state}: ${value}`} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && state) onSelect(state); }} style={{ default: { fill: selected === state ? '#d97706' : fill, stroke: '#fff', strokeWidth: 0.8, outline: 'none' }, hover: { fill: '#f59e0b', stroke: '#fff', strokeWidth: 0.8, outline: 'none', cursor: 'pointer' }, pressed: { fill: '#b45309', outline: 'none' } }} />;
          })}
        </Geographies>
      </ComposableMap>
      <div className="map-legend"><span>Lower</span><span className="gradient" aria-hidden="true" /><span>Higher</span></div>
      <details className="chart-table"><summary>View accessible state data table</summary><table><thead><tr><th>State or area</th><th>Value</th></tr></thead><tbody>{rows.map(([state, value]) => <tr key={state}><td>{state}</td><td>{value}</td></tr>)}</tbody></table></details>
    </div>
  );
}
