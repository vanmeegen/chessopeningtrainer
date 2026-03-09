/**
 * Standalone script to pre-fill the Wikibooks cache for all opening positions.
 *
 * This walks every node in every opening JSON file and fetches the
 * corresponding Wikibooks page into scripts/data/wikibooks-cache/.
 * Already-cached pages are skipped, so re-runs are incremental.
 *
 * Takes ~2.5 hours on a cold cache (rate limited to 1 req/sec).
 * Run separately before build:database.
 *
 * Usage: npx tsx scripts/fetch-wikibooks-cache.ts
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { MoveNode, Opening } from "../src/types/OpeningTypes.js";
import {
  buildWikibooksPath,
  fetchWikibooksPage,
  readCachedPage,
} from "./fetch-wikibooks-annotations.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OPENINGS_DIR = join(__dirname, "..", "public", "openings");

/** Collect all unique move paths from a tree */
function collectMovePaths(node: MoveNode, currentPath: string[]): string[][] {
  const paths: string[][] = [];
  const movePath = node.move !== "" ? [...currentPath, node.move] : currentPath;

  if (node.move !== "") {
    paths.push(movePath);
  }

  for (const child of node.children) {
    paths.push(...collectMovePaths(child, movePath));
  }

  return paths;
}

async function fetchWikibooksCacheForAll(): Promise<void> {
  const files = readdirSync(OPENINGS_DIR).filter((f) => f.endsWith(".json"));

  // Collect all unique wikibooks paths across all openings
  const allPaths = new Set<string>();

  for (const file of files) {
    const content = readFileSync(join(OPENINGS_DIR, file), "utf-8");
    const opening = JSON.parse(content) as Opening;

    for (const variation of opening.variations) {
      const movePaths = collectMovePaths(variation.moves, []);
      for (const mp of movePaths) {
        allPaths.add(buildWikibooksPath(mp));
      }
    }
  }

  console.log(
    `Found ${allPaths.size} unique positions across ${files.length} opening files.`,
  );

  // Check which are already cached
  let cached = 0;
  let uncached = 0;
  const pathsToFetch: string[] = [];

  for (const path of allPaths) {
    if (readCachedPage(path)) {
      cached++;
    } else {
      uncached++;
      pathsToFetch.push(path);
    }
  }

  console.log(`Already cached: ${cached}`);
  console.log(`Need to fetch: ${uncached}`);

  if (uncached === 0) {
    console.log("Cache is already complete.");
    return;
  }

  const estimatedMinutes = Math.ceil((uncached * 1.1) / 60);
  console.log(`Estimated time: ~${estimatedMinutes} minutes\n`);

  let fetched = 0;
  let found = 0;

  for (const pagePath of pathsToFetch) {
    const page = await fetchWikibooksPage(pagePath);
    fetched++;

    if (page.found) {
      found++;
    }

    if (fetched % 100 === 0 || fetched === uncached) {
      const pct = ((fetched / uncached) * 100).toFixed(1);
      console.log(
        `[${fetched}/${uncached}] ${pct}% — ${found} pages with content`,
      );
    }
  }

  console.log(`\nDone. Fetched ${fetched} pages, ${found} had content.`);
  console.log(`Total cache size: ${cached + fetched} entries.`);
}

fetchWikibooksCacheForAll().catch((err: unknown) => {
  console.error("Failed to fetch Wikibooks cache:", err);
  process.exit(1);
});
