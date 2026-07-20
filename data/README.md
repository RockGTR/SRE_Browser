# Data layout

- `registry/` is the checked-in source of truth for employer identities, official websites, careers pages, and verification evidence.
- `source/` contains local source workbooks and CSV files. It is ignored by Git because the files are large and independently obtainable.
- `cache/` contains reusable extraction output generated from the source workbooks. It is also ignored by Git.
- `../public/data/` contains the compact generated JSON files that the browser loads and that Docker packages.

See the project README for the expected source filenames and regeneration commands.
