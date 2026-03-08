/**
 * Complete opening database build pipeline.
 *
 * Steps:
 *   1. Fetch Lichess TSV data (or use cached)
 *   2. Compile openings: parse TSV → build trees → cross-opening enrichment → annotate
 *   3. Extend short variants with eco.json data
 *   4. Annotate from Wikibooks cache (if available, no network calls)
 *   5. Run data consistency tests
 *
 * The Wikibooks cache (scripts/data/wikibooks-cache/) must be filled separately
 * via `npm run fetch:wikibooks` as it takes ~2.5 hours.
 *
 * Usage:
 *   npx tsx scripts/build-database.ts                  # full pipeline
 *   npx tsx scripts/build-database.ts --skip-fetch     # skip TSV download
 */

import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");

function run(description: string, command: string): void {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${description}`);
  console.log(`${"=".repeat(60)}\n`);

  execSync(command, {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
  });
}

const skipFetch = process.argv.includes("--skip-fetch");

try {
  // Step 1+2: Compile openings (fetch TSV → parse → build trees → annotate)
  const compileFlags = [skipFetch ? "--skip-fetch" : "", "--with-wikibooks"]
    .filter(Boolean)
    .join(" ");

  run(
    "Step 1-2: Compile opening data (TSV → trees → annotations)",
    `npx tsx scripts/compile-opening-data.ts ${compileFlags}`,
  );

  // Step 3: Extend short variants with eco.json
  run(
    "Step 3: Extend short variants with eco.json data",
    "npx tsx scripts/extend-variants.ts",
  );

  // Step 4: Run data consistency tests
  run(
    "Step 4: Run data consistency tests",
    "npx vitest run src/data/__tests__/queensGambitData.spec.ts",
  );

  console.log(`\n${"=".repeat(60)}`);
  console.log("  Database build complete!");
  console.log(`${"=".repeat(60)}\n`);
} catch {
  console.error("\nDatabase build failed at one of the steps above.");
  process.exit(1);
}
