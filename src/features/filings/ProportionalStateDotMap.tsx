import { useId, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import usAtlas from 'us-atlas/states-10m.json';
import { stateForFips } from './usStates';

interface ProportionalStateDotMapProps {
  values: Record<string, number>;
  selected?: string;
  onSelect: (state: string) => void;
  label: string;
  filteredFilingCount: number;
}

interface StateDot {
  state: string;
  value: number;
  x: number;
  y: number;
}

export function scaledStateDotRadius(value: number, maxValue: number): number {
  if (value <= 0 || maxValue <= 0) return 0;
  return 4 + 18 * Math.sqrt(value / maxValue);
}

export function ProportionalStateDotMap({
  values,
  selected,
  onSelect,
  label,
  filteredFilingCount,
}: ProportionalStateDotMapProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [focusedState, setFocusedState] = useState<string>();
  const rows = Object.entries(values)
    .filter(([, value]) => value > 0)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  const maxValue = rows[0]?.[1] ?? 0;
  const largestState = rows[0];

  const selectState = (state: string) => onSelect(state);

  return (
    <div className="map-shell" role="group" aria-label={label}>
      <p className="result-count" aria-live="polite">
        <strong>{filteredFilingCount.toLocaleString()}</strong> distinct filtered filings
        {' · '}
        <strong>{rows.length.toLocaleString()}</strong> worksite states or areas represented
        {largestState ? ` · Largest dot: ${largestState[0]} (${largestState[1].toLocaleString()})` : ''}
      </p>
      <ComposableMap
        projection="geoAlbersUsa"
        width={800}
        height={490}
        aria-labelledby={`${titleId} ${descriptionId}`}
      >
        <title id={titleId}>{label}</title>
        <desc id={descriptionId}>
          State-centroid dots show distinct H-1B filing counts after all active filters. Larger dots represent more filings.
        </desc>
        <Geographies geography={usAtlas as never}>
          {({ geographies, path }) => {
            const dots = geographies.flatMap((geography): StateDot[] => {
              const state = stateForFips(geography.id);
              if (!state) return [];
              const value = values[state] ?? 0;
              if (value <= 0) return [];
              const [x, y] = path.centroid(geography);
              if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
              return [{ state, value, x, y }];
            }).sort((left, right) => right.value - left.value || left.state.localeCompare(right.state));

            return (
              <>
                {geographies.map((geography) => (
                  <Geography
                    key={geography.rsmKey}
                    geography={geography}
                    tabIndex={-1}
                    aria-hidden="true"
                    pointerEvents="none"
                    style={{
                      default: { fill: '#edf2f5', stroke: '#c3d0d8', strokeWidth: 0.8, outline: 'none' },
                      hover: { fill: '#edf2f5', stroke: '#c3d0d8', strokeWidth: 0.8, outline: 'none' },
                      pressed: { fill: '#edf2f5', stroke: '#c3d0d8', strokeWidth: 0.8, outline: 'none' },
                    }}
                  />
                ))}
                {dots.map(({ state, value, x, y }) => {
                  const radius = scaledStateDotRadius(value, maxValue);
                  const isSelected = selected === state;
                  const isFocused = focusedState === state;
                  const accessibleLabel = `${state}: ${value.toLocaleString()} distinct H-1B filings. Filter to ${state}.`;
                  return (
                    <g
                      key={state}
                      className="state-dot"
                      transform={`translate(${x} ${y})`}
                      role="button"
                      tabIndex={0}
                      aria-label={accessibleLabel}
                      aria-pressed={isSelected}
                      onClick={() => selectState(state)}
                      onFocus={() => setFocusedState(state)}
                      onBlur={() => setFocusedState(undefined)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          selectState(state);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <title>{accessibleLabel}</title>
                      {(isSelected || isFocused) && (
                        <circle
                          r={radius + 4}
                          fill="none"
                          stroke={isSelected ? '#7c2d12' : '#0b5f59'}
                          strokeWidth={2.5}
                          pointerEvents="none"
                        />
                      )}
                      <circle
                        r={radius}
                        fill={isSelected ? '#d97706' : '#0f766e'}
                        fillOpacity={0.78}
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                    </g>
                  );
                })}
              </>
            );
          }}
        </Geographies>
      </ComposableMap>
      <p className="panel-intro">
        Dots are placed at state centroids, not exact worksite coordinates. Dot radius uses a square-root scale relative to the largest state in the current filtered results. A filing with worksites in multiple states contributes once to each applicable state dot.
      </p>
      {rows.length > 0 ? (
        <details className="chart-table">
          <summary>View exact state counts and select a state</summary>
          <table>
            <thead><tr><th>Worksite state or area</th><th>Distinct filings</th></tr></thead>
            <tbody>
              {rows.map(([state, value]) => (
                <tr key={state}>
                  <td>
                    <button
                      type="button"
                      className="text-button"
                      aria-pressed={selected === state}
                      onClick={() => selectState(state)}
                    >
                      {state}
                    </button>
                  </td>
                  <td>{value.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : (
        <p className="muted">No worksite states match the active filters.</p>
      )}
    </div>
  );
}
