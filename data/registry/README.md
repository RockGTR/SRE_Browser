# Employer and careers-page registry

`employers.json` is the sole editable source of truth for employer identity and careers-page verification. The H-1B filing data continues to come from the FY2026 Q2 source datasets; this registry adds independently verified company destinations to those filing records.

Each record contains the legal employer name from the FY2026 Q2 workbook, an optional official website, an optional careers page, and the evidence used to verify the relationship. Leave an unresolved value as `null`; never infer a domain from the legal name.

A careers page may be recorded only when:

- the URL is public HTTPS;
- the company’s own website, legal footer, privacy page, or equivalent first-party evidence establishes the relationship; and
- at least one supporting URL is stored in `verification.evidenceUrls`.

LinkedIn, search-result pages, and individual job postings are not verified careers-page records. They may help a researcher locate an official destination, but the application does not store or scan live openings.

After changing `employers.json`, regenerate and validate the browser-facing data with:

```sh
npm run build-data
npm run validate-data
```

The generated dataset consists of:

- `public/data/employers.json`: 515 employers with distinct H-1B case totals, role counts, filing titles, filing states, salary context, and verified company links;
- `public/data/filings.json`: detailed H-1B case/worksite rows used by the filing browser;
- `public/data/state-summary.json`: filing-only state summaries used by the state view;
- `public/data/data-quality.json`: coverage metrics and reconciliation checks; and
- `public/data/metadata.json`: filing-period and source provenance.

Narrowing careers discovery does not remove the H-1B employer, filing, company, or state browsing features. Only live-opening collection, refresh history, and ATS discovery data are outside the project scope.
