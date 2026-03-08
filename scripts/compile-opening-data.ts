import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchOpenings } from "./fetch-openings.js";
import { parseAllOpenings } from "./parse-openings.js";
import type { ParsedOpening } from "./parse-openings.js";
import { buildOpeningMoveTree } from "./build-move-trees.js";
import { annotateMoveTreeWithContext } from "./generate-annotations.js";
import { annotateTreeFromWikibooks } from "./fetch-wikibooks-annotations.js";
import type {
  Opening,
  OpeningCatalogEntry,
  Variation,
  MoveNode,
} from "../src/types/OpeningTypes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, "..");
const CATALOG_OUTPUT = join(PROJECT_ROOT, "src", "data", "openingCatalog.json");
const OPENINGS_OUTPUT_DIR = join(PROJECT_ROOT, "public", "openings");

/**
 * Determine the opening category based on the first move in the PGN.
 */
function categorizeOpening(opening: ParsedOpening): string {
  if (opening.variations.length === 0) return "other";

  const firstPgn = opening.variations[0]!.pgn;
  if (firstPgn.startsWith("1. e4")) return "e4";
  if (firstPgn.startsWith("1. d4")) return "d4";
  if (firstPgn.startsWith("1. c4")) return "c4";
  if (firstPgn.startsWith("1. Nf3")) return "Nf3";
  return "other";
}

/**
 * Convert a ParsedOpening into the full Opening type with move trees and annotations.
 * Uses basic template annotations (fast, no network).
 */
function buildOpeningData(parsedOpening: ParsedOpening): Opening {
  const moveTree = buildOpeningMoveTree(parsedOpening.variations);

  if (moveTree) {
    annotateMoveTreeWithContext(moveTree, parsedOpening.name);
  }

  const variations: Variation[] = parsedOpening.variations.map((v) => {
    const varTree = buildOpeningMoveTree([v]);
    if (varTree) {
      annotateMoveTreeWithContext(varTree, parsedOpening.name);
    }

    return {
      id: v.id,
      name: v.name,
      moves: varTree ?? createEmptyRoot(),
      pgn: v.pgn,
    };
  });

  return {
    id: parsedOpening.id,
    name: parsedOpening.name,
    eco: parsedOpening.eco,
    variations,
  };
}

/**
 * Convert a ParsedOpening into the full Opening type with Wikibooks annotations
 * where available, falling back to context-aware templates.
 */
async function buildOpeningDataWithWikibooks(
  parsedOpening: ParsedOpening,
): Promise<Opening> {
  const moveTree = buildOpeningMoveTree(parsedOpening.variations);

  if (moveTree) {
    // First try Wikibooks annotations
    const wikibooksCount = await annotateTreeFromWikibooks(moveTree);
    console.log(
      `  ${parsedOpening.name}: ${wikibooksCount} Wikibooks annotations`,
    );
    // Fill remaining with context-aware templates
    annotateMoveTreeWithContext(moveTree, parsedOpening.name);
  }

  const variations: Variation[] = [];
  for (const v of parsedOpening.variations) {
    const varTree = buildOpeningMoveTree([v]);
    if (varTree) {
      const wikibooksCount = await annotateTreeFromWikibooks(varTree);
      if (wikibooksCount > 0) {
        console.log(
          `    Variation "${v.name}": ${wikibooksCount} Wikibooks annotations`,
        );
      }
      annotateMoveTreeWithContext(varTree, parsedOpening.name);
    }

    variations.push({
      id: v.id,
      name: v.name,
      moves: varTree ?? createEmptyRoot(),
      pgn: v.pgn,
    });
  }

  return {
    id: parsedOpening.id,
    name: parsedOpening.name,
    eco: parsedOpening.eco,
    variations,
  };
}

function createEmptyRoot(): MoveNode {
  return {
    move: "",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    children: [],
    isMainLine: true,
  };
}

/**
 * Build catalog entry from a parsed opening.
 */
function buildCatalogEntry(opening: ParsedOpening): OpeningCatalogEntry {
  return {
    id: opening.id,
    name: opening.name,
    eco: opening.eco,
    variationCount: opening.variations.length,
    category: categorizeOpening(opening),
  };
}

/**
 * Run the complete pipeline: fetch -> parse -> build trees -> annotate -> output.
 */
export async function compileOpeningData(
  skipFetch: boolean = false,
  withWikibooks: boolean = false,
): Promise<void> {
  // Step 1: Fetch TSV data
  if (!skipFetch) {
    console.log("=== Step 1: Fetching TSV data ===");
    await fetchOpenings();
  } else {
    console.log("=== Step 1: Skipping fetch (using cached data) ===");
  }

  // Step 2: Parse openings
  console.log("\n=== Step 2: Parsing openings ===");
  const parsedOpenings = parseAllOpenings();
  console.log(`Parsed ${parsedOpenings.length} openings`);

  // Step 3: Build catalog
  console.log("\n=== Step 3: Building catalog ===");
  const catalog: OpeningCatalogEntry[] = parsedOpenings.map(buildCatalogEntry);

  // Step 4: Build opening detail files
  if (withWikibooks) {
    console.log(
      "\n=== Step 4: Building opening detail files (with Wikibooks) ===",
    );
  } else {
    console.log("\n=== Step 4: Building opening detail files ===");
  }
  if (!existsSync(OPENINGS_OUTPUT_DIR)) {
    mkdirSync(OPENINGS_OUTPUT_DIR, { recursive: true });
  }

  let processedCount = 0;
  for (const parsedOpening of parsedOpenings) {
    const openingData = withWikibooks
      ? await buildOpeningDataWithWikibooks(parsedOpening)
      : buildOpeningData(parsedOpening);
    const outputPath = join(OPENINGS_OUTPUT_DIR, `${openingData.id}.json`);
    writeFileSync(outputPath, JSON.stringify(openingData, null, 2), "utf-8");
    processedCount++;
  }
  console.log(
    `Generated ${processedCount} opening detail files in ${OPENINGS_OUTPUT_DIR}`,
  );

  // Step 5: Write catalog
  console.log("\n=== Step 5: Writing catalog ===");
  writeFileSync(CATALOG_OUTPUT, JSON.stringify(catalog, null, 2), "utf-8");
  console.log(
    `Catalog written to ${CATALOG_OUTPUT} (${catalog.length} entries)`,
  );

  // Summary
  console.log("\n=== Pipeline complete ===");
  const totalVariations = catalog.reduce(
    (sum, entry) => sum + entry.variationCount,
    0,
  );
  console.log(`Total openings: ${catalog.length}`);
  console.log(`Total variations: ${totalVariations}`);

  // Show category breakdown
  const categories = new Map<string, number>();
  for (const entry of catalog) {
    const count = categories.get(entry.category) ?? 0;
    categories.set(entry.category, count + 1);
  }
  console.log("By category:");
  for (const [cat, count] of categories.entries()) {
    console.log(`  ${cat}: ${count}`);
  }
}

// Run directly
if (process.argv[1] === __filename) {
  const skipFetch = process.argv.includes("--skip-fetch");
  const withWikibooks = process.argv.includes("--with-wikibooks");
  compileOpeningData(skipFetch, withWikibooks).catch((err: unknown) => {
    console.error("Pipeline failed:", err);
    process.exit(1);
  });
}
