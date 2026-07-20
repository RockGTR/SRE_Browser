# H-1B SRE Careers Directory

A focused local directory of official careers pages for employers with FY2026 Q2 H-1B filing evidence in SRE, DevOps, and platform/infrastructure roles.

The product answers one question: **where is this employer’s verified careers page?** H-1B filing totals, role counts, job titles, filing states, and salary ranges remain visible as supporting company context.

## Current coverage

- 515 distinct legal employers.
- 856 distinct H-1B cases: 258 SRE / Site Reliability, 565 DevOps, and 33 Platform / Infrastructure.
- 141 verified official company websites.
- 138 verified careers pages.
- 3 employers with a verified company website but no verified careers page.
- 374 employers that still need company-identity research.
- 377 total careers pages still to find.

The earlier count of 456 means the source workbook omitted a job-link hint for 456 employers. It is not the careers-page unresolved count and is not used as a directory status.

## Product scope

The application includes:

- a searchable, filterable careers-page directory;
- direct links to verified official careers pages;
- clearly labeled web-search actions for unresolved employers;
- employer detail pages with verification evidence;
- H-1B filing totals, role mix, unique filing titles, states, and salary range;
- a methodology and reconciliation page; and
- filtered CSV export.

The application deliberately does **not** include job scanning, ATS adapters, live-opening counts, scheduled refreshes, opening history, source attempts, collection failures, retry commands, snapshots, or closure inference.

## Run locally

```sh
npm install
npm run dev
```

Create a production build with:

```sh
npm run build
```

The production build uses the checked-in static directory data and does not require the original spreadsheets.

## Routes

- `/` — careers directory and H-1B filing overview.
- `/companies/:employerId` — verified careers link, evidence, filing role mix, titles, states, and salary range.
- `/about` — careers-page coverage, methodology, product scope, and H-1B reconciliation.

`/companies` redirects to the directory for compatibility.

## Data model

[`data/registry/employers.json`](data/registry/employers.json) is the sole editable source of truth for employer identity and careers-page verification. Unverified URLs remain `null`; domains are never inferred from legal names.

The browser loads only three generated files:

- [`public/data/employers.json`](public/data/employers.json) — verified careers links plus aggregated H-1B filing and title context.
- [`public/data/data-quality.json`](public/data/data-quality.json) — coverage counts and reconciliation checks.
- [`public/data/metadata.json`](public/data/metadata.json) — snapshot description and provenance.

The original spreadsheets and local cache are intentionally ignored by Git. They are needed only when regenerating the static data:

```sh
npm run build-data
npm run validate-data
```

Careers-page verification requires public HTTPS, evidence establishing the company-to-destination relationship, and at least one recorded evidence URL. LinkedIn pages, search results, and individual job postings are not accepted as verified careers destinations.

## Validation

```sh
npm run validate-data
npm test
npm run build
```

The validation suite checks employer parity, URL safety, evidence requirements, careers-page coverage, H-1B case totals, role totals, route rendering, link safety, and failed-data loading states.
