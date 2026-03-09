# chessopeningtrainer

A forever free chess opening trainer built to learn the most important chess openings based on a combination of memorizing and strategic understanding.

## Opening Database Build

The opening data lives in `public/openings/*.json` and is generated from multiple sources. The build is split into steps that can run independently.

### Data Sources

| Source                         | Package / URL                     | Entries           | Provides                                 |
| ------------------------------ | --------------------------------- | ----------------- | ---------------------------------------- |
| Lichess chess-openings         | TSV files (fetched at build time) | ~3,600 variations | Opening names, ECO codes, naming moves   |
| @chess-openings/eco.json       | npm package                       | 15,800+ positions | Continuation moves to deepen short lines |
| Wikibooks Chess Opening Theory | MediaWiki API                     | ~2,700 pages      | Strategic annotations (prose)            |

### Build Scripts

| Script                     | npm command               | Purpose                                      | Duration |
| -------------------------- | ------------------------- | -------------------------------------------- | -------- |
| `fetch-wikibooks-cache.ts` | `npm run fetch:wikibooks` | Fill Wikibooks cache (separate, incremental) | ~2.5h    |
| `compile-opening-data.ts`  | `npm run build:openings`  | TSV → move trees → annotations               | ~30s     |
| `extend-variants.ts`       | `npm run extend:variants` | Deepen short leaves with eco.json            | ~5s      |
| `build-database.ts`        | `npm run build:database`  | Full pipeline: compile → extend → tests      | ~1min    |

### Pipeline

```
1. npm run fetch:wikibooks        # one-time / manual (fills scripts/data/wikibooks-cache/)
2. npm run build:database         # orchestrates everything below:
   ├── compile-opening-data.ts    # fetch TSV → parse → build trees → annotate (from cache)
   ├── extend-variants.ts         # extend short leaves with eco.json continuations
   └── vitest (consistency tests) # validate JSON structure, FEN, annotations, depth stats
```

Step 1 only needs to run once (or when you want to refresh Wikibooks content). The cache is incremental — re-runs only fetch uncached pages.

Step 2 can run with `--skip-fetch` to skip downloading TSV files when they are already cached locally.
