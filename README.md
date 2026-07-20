# H-1B SRE Browser

A local React dashboard for exploring FY2026 Q2 H-1B filings for SRE, DevOps, and platform/infrastructure roles by employer and worksite state. Each company view also shows its verified official careers destination when one is known.

The dashboard keeps filing evidence and careers-page verification separate: filing titles describe historical H-1B records, not live job openings.

## Current coverage

- 515 distinct legal employers.
- 856 distinct H-1B cases: 258 SRE / Site Reliability, 565 DevOps, and 33 Platform / Infrastructure.
- 1,221 filing-worksite rows across 38 state-index rows: 36 observed locations plus zero-row HI and Unknown entries retained from the original browser.
- 141 verified official company websites.
- 138 verified official careers pages.
- 3 employers with a verified company website but no verified careers page.
- 374 employers that still need identity and careers-page research.

The earlier count of 456 means the employer workbook omitted a job-link hint for 456 employers. It is not the current unresolved careers-page count and is not used as a directory status.

## Product scope

The application includes:

- a summary dashboard with H-1B role, employer, and state patterns;
- a searchable legal-employer directory;
- detailed H-1B filing views by employer and worksite state;
- interactive state maps and employer/state charts with accessible table alternatives;
- company pages with case totals, role mix, filing titles, worksite states, salary context, and careers-page verification evidence;
- direct links to verified official careers pages;
- clearly labeled web-search research links for unresolved employers;
- filing and careers-page data-quality reconciliation; and
- filtered CSV exports.

The application deliberately does **not** scan or monitor live job openings. It has no ATS adapters, opening refreshes, collection failures, retry commands, opening history, source snapshots, or closure inference.

## Run locally

Use Node.js 20 or newer, npm, and Python 3 with `openpyxl` when regenerating data.

```bash
npm install
npm run dev
```

The checked-in static JSON is sufficient to run and build the site:

```bash
npm run build
```

## Routes

- `/` — summary of H-1B cases, role mix, top employers, top worksite states, and careers-page coverage.
- `/companies` — searchable employer and careers-page directory.
- `/companies/:employerId` — company filing overview, filing titles, locations, salary context, and careers link evidence.
- `/filings/states` — interactive H-1B filing browser by worksite state.
- `/filings/companies` — H-1B filing browser by legal employer.
- `/data-quality` — filing reconciliation, careers-page coverage, and source provenance.

Filters are stored in URL query parameters. Charts and maps have table alternatives, and filtered tables can be exported to CSV.

## Canonical and generated data

[`data/registry/employers.json`](data/registry/employers.json) is the sole editable source of truth for legal-employer identity, official websites, careers pages, and verification evidence. Unverified URLs remain `null`; domains are never inferred from employer names.

The browser loads five generated files:

- [`public/data/employers.json`](public/data/employers.json) — employer filing aggregates, unique filing titles, and careers verification.
- [`public/data/filings.json`](public/data/filings.json) — detailed H-1B filing-worksite rows.
- [`public/data/state-summary.json`](public/data/state-summary.json) — distinct case counts and role mix by worksite state.
- [`public/data/data-quality.json`](public/data/data-quality.json) — careers coverage and reconciliation checks.
- [`public/data/metadata.json`](public/data/metadata.json) — reporting period, record counts, and provenance.

The source spreadsheets and Visa Class cache are intentionally ignored by Git. They are needed only to regenerate static data:

```bash
npm run build-data
npm run validate-data
```

The build reads:

- `H1B_SRE_DevOps_Employers_FY2026_Q2.xlsx`
- `H1B_SRE_DevOps_Filtered_Filings_FY2026_Q2.csv`
- `LCA_Dislclosure_Data_FY2026_Q2.xlsx`

## Careers-page verification

A verified careers destination must be a public HTTPS URL with recorded evidence establishing the employer-to-destination relationship. Official company-hosted pages and official ATS boards are accepted when that relationship is documented. LinkedIn pages, search results, and individual job postings are not accepted as verified careers destinations.

Directory statuses are intentionally simple:

- **Careers page verified** — an evidence-backed official careers destination is recorded.
- **Official website only** — the company website is verified, but its careers destination is not.
- **Needs research** — neither destination is asserted without evidence.

## H-1B calculations

Only records joined to Visa Class `H-1B` are included; E-3 rows from the broader disclosure release are excluded.

- National and employer totals use distinct `Case Number`.
- State totals use distinct `Case Number + Worksite State`.
- A multi-state case appears once in each applicable state.
- National totals are never calculated by summing state totals.
- Distinct legal employers are never merged merely because they share a brand.
- Filing titles are categorized as SRE / Site Reliability, DevOps, or Platform / Infrastructure using the documented normalization rules.
- Salary values are annualized USD amounts; the original wage unit remains in filing records for audit.

## Validation

```bash
npm run validate-data
npm test
npm run build
```

Validation checks employer parity, Visa Class exclusion, national and role totals, filing-worksite and state counts, URL safety, verification evidence, careers-page coverage, route rendering, filters, and external-link safety.
