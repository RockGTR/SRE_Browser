export function LoadingState({ error }: { error?: string | null }) {
  return (
    <main className="state-page" aria-live="polite">
      <div className={error ? 'state-card error' : 'state-card'}>
        <span className="eyebrow">H-1B SRE Browser</span>
        <h1>{error ? 'The dashboard data could not be loaded' : 'Loading the H-1B dataset'}</h1>
        <p>{error ?? 'Preparing filings, employer summaries, state views, and careers-page coverage.'}</p>
      </div>
    </main>
  );
}
