export function LoadingState({ error }: { error?: string | null }) {
  return (
    <main className="state-page" aria-live="polite">
      <div className={error ? 'state-card error' : 'state-card'}>
        <span className="eyebrow">H-1B SRE Careers Directory</span>
        <h1>{error ? 'The directory data could not be loaded' : 'Loading the careers directory'}</h1>
        <p>{error ?? 'Preparing verified careers links and employer filing summaries.'}</p>
      </div>
    </main>
  );
}
