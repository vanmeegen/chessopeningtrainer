import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchOpenings } from "./fetch-openings.js";
import { parseAllOpenings } from "./parse-openings.js";
import type { ParsedOpening } from "./parse-openings.js";
import {
  buildOpeningMoveTree,
  parsePgnMoves,
  mergeMoveSequence,
  extendMainLine,
} from "./build-move-trees.js";
import { annotateMoveTreeWithContext } from "./generate-annotations.js";
import { annotateTreeFromWikibooks } from "./fetch-wikibooks-annotations.js";
import type {
  Opening,
  OpeningCatalogEntry,
  OpeningCategory,
  ImportanceRating,
  Variation,
  MoveNode,
} from "../src/types/OpeningTypes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, "..");
const CATALOG_OUTPUT = join(PROJECT_ROOT, "src", "data", "openingCatalog.json");
const OPENINGS_OUTPUT_DIR = join(PROJECT_ROOT, "public", "openings");

/** Curated importance ratings (duplicated from src/data for build-time use) */
const importanceMap: Record<string, ImportanceRating> = {
  "ruy-lopez": 3,
  "italian-game": 3,
  "sicilian-defense": 3,
  "french-defense": 3,
  "queens-gambit-declined": 3,
  "kings-indian-defense": 3,
  "nimzo-indian-defense": 3,
  "queens-gambit": 3,
  "caro-kann-defense": 3,
  "english-opening": 3,
  "slav-defense": 3,
  "london-system": 3,
  "scotch-game": 2,
  "petrovs-defense": 2,
  "four-knights-game": 2,
  "kings-gambit": 2,
  "kings-gambit-accepted": 2,
  "kings-gambit-declined": 2,
  "philidor-defense": 2,
  "queens-gambit-accepted": 2,
  "semi-slav-defense": 2,
  "catalan-opening": 2,
  "queens-indian-defense": 2,
  "benoni-defense": 2,
  "grnfeld-defense": 2,
  "dutch-defense": 2,
  "pirc-defense": 2,
  "rti-opening": 2,
  "vienna-game": 2,
  "scandinavian-defense": 2,
  "alekhine-defense": 2,
  "bogo-indian-defense": 2,
  "old-indian-defense": 2,
  "trompowsky-attack": 2,
  "bishops-opening": 2,
  "nimzo-larsen-attack": 2,
  "bird-opening": 2,
  "modern-defense": 2,
  "tarrasch-defense": 2,
  "kings-indian-attack": 2,
  "center-game": 2,
  "ponziani-opening": 2,
  "three-knights-opening": 2,
};

/**
 * Determine the opening category based on the first moves in the PGN.
 * Uses 7 chess-theory categories.
 */
function categorizeOpening(opening: ParsedOpening): OpeningCategory {
  if (opening.variations.length === 0) return "unusual";

  const pgn = opening.variations[0]!.pgn;

  if (pgn.startsWith("1. e4")) {
    // Check Black's response to 1.e4
    const afterE4 = pgn.substring(5).trim();
    if (afterE4.startsWith("e5")) return "open";
    return "semi-open";
  }

  if (pgn.startsWith("1. d4")) {
    const afterD4 = pgn.substring(5).trim();
    if (afterD4.startsWith("d5")) return "closed";
    if (afterD4.startsWith("Nf6")) return "indian";
    return "semi-closed";
  }

  if (pgn.startsWith("1. c4") || pgn.startsWith("1. Nf3")) return "flank";

  return "unusual";
}

/**
 * Extract the first N plies from a PGN string.
 */
function extractFirstMoves(pgn: string, maxPlies: number = 5): string {
  const moveRegex = /(\d+\.\s*\S+(?:\s+\S+)?)/g;
  const parts: string[] = [];
  let plyCount = 0;
  let match: RegExpExecArray | null;

  while ((match = moveRegex.exec(pgn)) !== null) {
    const moveText = match[1]!;
    // Each numbered move can contain White + Black move
    const moveParts = moveText.split(/\s+/);
    for (const part of moveParts) {
      if (/^\d+\./.test(part)) continue; // skip move number
      plyCount++;
      if (plyCount > maxPlies) break;
    }
    if (plyCount > maxPlies) {
      // Truncate this move group
      const truncated = moveParts
        .slice(0, moveParts.length - (plyCount - maxPlies))
        .join(" ");
      if (truncated) parts.push(truncated);
      break;
    }
    parts.push(moveText);
  }

  return parts.join(" ");
}

/**
 * Collect all PGN strings from all parsed openings.
 */
function collectAllPgns(parsedOpenings: ParsedOpening[]): string[] {
  const pgns: string[] = [];
  for (const opening of parsedOpenings) {
    for (const variation of opening.variations) {
      pgns.push(variation.pgn);
    }
  }
  return pgns;
}

/**
 * Enrich a variation's move tree by merging in moves from related PGNs
 * that share the same prefix. This extends short lines with continuations
 * found in other openings (e.g. "Queen's Gambit" d4 d5 c4 gets extended
 * with moves from "Queen's Gambit Accepted" and "Queen's Gambit Declined").
 */
function enrichTreeWithRelatedPgns(
  root: MoveNode,
  basePgn: string,
  allPgns: string[],
): void {
  const baseMoves = parsePgnMoves(basePgn);

  for (const pgn of allPgns) {
    const moves = parsePgnMoves(pgn);
    // Only merge PGNs that are strictly longer and share the same prefix
    if (moves.length <= baseMoves.length) continue;
    const prefixMatches = baseMoves.every((m, i) => moves[i] === m);
    if (!prefixMatches) continue;
    mergeMoveSequence(root, moves, false);
  }
}

/**
 * Convert a ParsedOpening into the full Opening type with move trees and annotations.
 * Uses basic template annotations (fast, no network).
 * Enriches short variations with moves from related openings.
 */
function buildOpeningData(
  parsedOpening: ParsedOpening,
  allPgns: string[],
): Opening {
  const moveTree = buildOpeningMoveTree(parsedOpening.variations);

  if (moveTree) {
    annotateMoveTreeWithContext(moveTree, parsedOpening.name);
  }

  const variations: Variation[] = parsedOpening.variations.map((v) => {
    const varTree = buildOpeningMoveTree([v]);
    if (varTree) {
      enrichTreeWithRelatedPgns(varTree, v.pgn, allPgns);
      extendMainLine(varTree);
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
  allPgns: string[],
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
      enrichTreeWithRelatedPgns(varTree, v.pgn, allPgns);
      extendMainLine(varTree);
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
  const firstPgn = opening.variations[0]?.pgn ?? "";
  return {
    id: opening.id,
    name: opening.name,
    eco: opening.eco,
    variationCount: opening.variations.length,
    category: categorizeOpening(opening),
    importance: importanceMap[opening.id] ?? 1,
    firstMoves: extractFirstMoves(firstPgn),
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

  // Collect all PGNs for cross-opening enrichment
  const allPgns = collectAllPgns(parsedOpenings);
  console.log(`Collected ${allPgns.length} PGNs for cross-opening enrichment`);

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
      ? await buildOpeningDataWithWikibooks(parsedOpening, allPgns)
      : buildOpeningData(parsedOpening, allPgns);
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
