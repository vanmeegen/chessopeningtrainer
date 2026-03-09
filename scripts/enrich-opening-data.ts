/**
 * Enrich existing opening JSON files by cross-referencing PGNs across all openings.
 * Short variations get extended with moves from related openings that share
 * the same PGN prefix.
 *
 * Usage: npx tsx scripts/enrich-opening-data.ts
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeMoveSequence, parsePgnMoves } from "./build-move-trees.js";
import { annotateMoveTreeWithContext } from "./generate-annotations.js";
import type { Opening, MoveNode } from "../src/types/OpeningTypes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OPENINGS_DIR = join(__dirname, "..", "public", "openings");

/** Compute the main line depth of a move tree */
function mainLineDepth(node: MoveNode): number {
  const mainChild = node.children.find((c) => c.isMainLine);
  if (!mainChild) return 0;
  return 1 + mainLineDepth(mainChild);
}

/** Collect all (pgn, openingName) pairs from all opening files */
function collectAllPgns(
  openings: Opening[],
): Array<{ pgn: string; moves: string[] }> {
  const result: Array<{ pgn: string; moves: string[] }> = [];
  for (const opening of openings) {
    for (const variation of opening.variations) {
      const moves = parsePgnMoves(variation.pgn);
      result.push({ pgn: variation.pgn, moves });
    }
  }
  return result;
}

/** Enrich a variation's tree with moves from related PGNs */
function enrichTree(
  root: MoveNode,
  basePgn: string,
  allPgnData: Array<{ pgn: string; moves: string[] }>,
): number {
  const baseMoves = parsePgnMoves(basePgn);
  let merged = 0;

  for (const { moves } of allPgnData) {
    if (moves.length <= baseMoves.length) continue;
    const prefixMatches = baseMoves.every((m, i) => moves[i] === m);
    if (!prefixMatches) continue;
    mergeMoveSequence(root, moves, false);
    merged++;
  }

  return merged;
}

/**
 * Extend the main line through nodes that have no main line child yet.
 * When the original main line ends but the node has children (from enrichment),
 * pick the first child as the new main line continuation and recurse.
 */
function extendMainLine(node: MoveNode): void {
  const mainChild = node.children.find((c) => c.isMainLine);
  if (mainChild) {
    // Main line continues, recurse
    extendMainLine(mainChild);
    return;
  }

  // No main line child - if there are children, promote the first one
  if (node.children.length > 0) {
    node.children[0]!.isMainLine = true;
    extendMainLine(node.children[0]!);
  }
}

function main(): void {
  // Load all opening files
  const files = readdirSync(OPENINGS_DIR).filter((f) => f.endsWith(".json"));
  console.log(`Found ${files.length} opening files`);

  const openings: Array<{ filename: string; data: Opening }> = [];
  for (const file of files) {
    const raw = readFileSync(join(OPENINGS_DIR, file), "utf-8");
    openings.push({ filename: file, data: JSON.parse(raw) as Opening });
  }

  // Collect all PGNs
  const allPgnData = collectAllPgns(openings.map((o) => o.data));
  console.log(`Collected ${allPgnData.length} PGNs for cross-referencing`);

  // Count stats
  let enrichedVariations = 0;
  let totalVariations = 0;
  let shortBefore = 0;
  let shortAfter = 0;

  for (const { filename, data } of openings) {
    let fileChanged = false;

    for (const variation of data.variations) {
      totalVariations++;
      const depthBefore = mainLineDepth(variation.moves);

      if (depthBefore < 12) {
        shortBefore++;
        const mergedCount = enrichTree(
          variation.moves,
          variation.pgn,
          allPgnData,
        );

        if (mergedCount > 0) {
          // Extend main line through new nodes
          extendMainLine(variation.moves);
          // Re-annotate (only fills nodes without annotations)
          annotateMoveTreeWithContext(variation.moves, data.name);
          enrichedVariations++;
          fileChanged = true;

          const depthAfter = mainLineDepth(variation.moves);
          if (depthAfter < 12) {
            shortAfter++;
          }
        } else {
          shortAfter++;
        }
      }
    }

    if (fileChanged) {
      const outputPath = join(OPENINGS_DIR, filename);
      writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf-8");
    }
  }

  console.log(`\n=== Enrichment complete ===`);
  console.log(`Total variations: ${totalVariations}`);
  console.log(`Short (<12) before: ${shortBefore}`);
  console.log(`Enriched: ${enrichedVariations}`);
  console.log(`Short (<12) after: ${shortAfter}`);
}

main();
