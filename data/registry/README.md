# Careers-page registry

`employers.json` is the sole editable source of truth for employer identity and careers-page verification.

Each record contains the legal employer name from the FY2026 Q2 workbook, an optional official website, an optional careers page, and the evidence used to verify the relationship. Leave an unresolved value as `null`; never infer a domain from the legal name.

A careers page may be recorded only when:

- the URL is public HTTPS;
- the company’s own website, legal footer, privacy page, or equivalent first-party evidence establishes the relationship; and
- at least one supporting URL is stored in `verification.evidenceUrls`.

LinkedIn, search-result pages, and individual job postings are not careers-page records. They may help a researcher find the official destination, but they are not stored as verified careers links.

After changing `employers.json`, regenerate the browser-facing directory data with:

```sh
npm run build-data
npm run validate-data
```

The project does not scan jobs, enumerate ATS postings, retain opening history, or infer whether jobs have closed.
