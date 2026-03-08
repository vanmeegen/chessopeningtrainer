import { Chess } from "chess.js";
import {
  writeFileSync,
  readFileSync,
  readdirSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { MoveNode, Opening } from "../src/types/OpeningTypes.js";
import type { OpeningCollection } from "@chess-openings/eco.json";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_CACHE_DIR = join(__dirname, "data", "explorer-cache");

/** Delay between Lichess API requests in milliseconds */
const REQUEST_DELAY_MS = 1100;

/** Default number of top moves to add per position */
const DEFAULT_MAX_MOVES = 3;

/** Default target depth in half-moves */
const DEFAULT_TARGET_DEPTH = 12;

/** Maximum iterations to prevent infinite loops */
const MAX_ITERATIONS = 20;

/** A move entry returned by a fetcher */
export type ExplorerMove = {
  san: string;
  white: number;
  draws: number;
  black: number;
};

/** Response shape from a move fetcher */
export type ExplorerResponse = {
  moves: ExplorerMove[];
};

/** A short leaf found in the tree, together with its depth and FEN */
export type ShortLeaf = {
  node: MoveNode;
  depth: number;
  fen: string;
};

/** Function type for fetching continuation moves (allows mocking in tests) */
export type ExplorerFetcher = (fen: string) => Promise<ExplorerResponse>;

/**
 * Find all leaf nodes in the tree that are below the target depth.
 */
export function findShortLeaves(
  root: MoveNode,
  targetDepth: number,
): ShortLeaf[] {
  const results: ShortLeaf[] = [];
  collectShortLeaves(root, 0, targetDepth, results);
  return results;
}

function collectShortLeaves(
  node: MoveNode,
  depth: number,
  targetDepth: number,
  results: ShortLeaf[],
): void {
  if (node.children.length === 0 && depth < targetDepth) {
    results.push({ node, depth, fen: node.fen });
    return;
  }
  for (const child of node.children) {
    collectShortLeaves(child, depth + 1, targetDepth, results);
  }
}

/**
 * Read a cached explorer response for a FEN position.
 */
export function readExplorerCache(
  fen: string,
  cacheDir: string = DEFAULT_CACHE_DIR,
): ExplorerResponse | null {
  const cacheFile = getCacheFilePath(fen, cacheDir);
  if (!existsSync(cacheFile)) {
    return null;
  }
  const content = readFileSync(cacheFile, "utf-8");
  return JSON.parse(content) as ExplorerResponse;
}

/**
 * Write an explorer response to the cache.
 */
export function writeExplorerCache(
  fen: string,
  response: ExplorerResponse,
  cacheDir: string = DEFAULT_CACHE_DIR,
): void {
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
  const cacheFile = getCacheFilePath(fen, cacheDir);
  writeFileSync(cacheFile, JSON.stringify(response, null, 2), "utf-8");
}

function getCacheFilePath(fen: string, cacheDir: string): string {
  const safeName = fen.replace(/[/\s]/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
  return join(cacheDir, `${safeName}.json`);
}

// ---------------------------------------------------------------------------
// eco.json-based fetcher (offline, fast)
// ---------------------------------------------------------------------------

/** Index mapping FEN → continuation PGN strings from eco.json */
type EcoMoveIndex = Map<string, ExplorerMove[]>;

/**
 * Build an index of FEN → next moves from the eco.json opening book.
 * For each opening entry, replays the PGN and records every position
 * along the way together with the next move played.
 */
export function buildEcoMoveIndex(book: OpeningCollection): EcoMoveIndex {
  const index: EcoMoveIndex = new Map();

  for (const [, opening] of Object.entries(book)) {
    const pgn = opening.moves;
    if (!pgn) continue;

    const chess = new Chess();
    const tokens = pgn
      .replace(/\{[^}]*\}/g, "")
      .replace(/\d+\.\s*/g, "")
      .replace(/\.{2,}/g, "")
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 0 && !/^\d+\.?$/.test(t));

    for (const san of tokens) {
      const fenBefore = chess.fen();

      let result;
      try {
        result = chess.move(san);
      } catch {
        break;
      }

      const existing = index.get(fenBefore);
      if (existing) {
        // Add this move if not already present, with a count of 1
        const found = existing.find((m) => m.san === result.san);
        if (found) {
          // Bump the frequency count
          found.white += 1;
        } else {
          existing.push({ san: result.san, white: 1, draws: 0, black: 0 });
        }
      } else {
        index.set(fenBefore, [
          { san: result.san, white: 1, draws: 0, black: 0 },
        ]);
      }
    }
  }

  // Sort each position's moves by frequency (most common first)
  for (const [, moves] of index) {
    moves.sort((a, b) => b.white - a.white);
  }

  return index;
}

/**
 * Create a fetcher backed by the eco.json move index.
 */
export function createEcoFetcher(ecoIndex: EcoMoveIndex): ExplorerFetcher {
  return (fen: string) => {
    const moves = ecoIndex.get(fen) ?? [];
    return Promise.resolve({ moves });
  };
}

// ---------------------------------------------------------------------------
// Lichess Explorer API fetcher (online, slow, fallback)
// ---------------------------------------------------------------------------

/**
 * Fetch continuation moves from the Lichess Opening Explorer API.
 */
export async function fetchLichessExplorer(
  fen: string,
  cacheDir: string = DEFAULT_CACHE_DIR,
): Promise<ExplorerResponse> {
  const cached = readExplorerCache(fen, cacheDir);
  if (cached) return cached;

  const url = new URL("https://explorer.lichess.ovh/lichess");
  url.searchParams.set("fen", fen);
  url.searchParams.set("speeds", "rapid,classical");
  url.searchParams.set("ratings", "2000,2200,2500");

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      const result: ExplorerResponse = { moves: [] };
      writeExplorerCache(fen, result, cacheDir);
      return result;
    }

    const data = (await response.json()) as ExplorerResponse;
    const result: ExplorerResponse = {
      moves: (data.moves ?? []).map((m) => ({
        san: m.san,
        white: m.white,
        draws: m.draws,
        black: m.black,
      })),
    };

    writeExplorerCache(fen, result, cacheDir);
    await sleep(REQUEST_DELAY_MS);
    return result;
  } catch {
    const result: ExplorerResponse = { moves: [] };
    writeExplorerCache(fen, result, cacheDir);
    return result;
  }
}

// ---------------------------------------------------------------------------
// Core extension logic
// ---------------------------------------------------------------------------

/**
 * Extend all short leaves in a tree by fetching continuation moves.
 * Iterates until no more short leaves can be extended or target depth is reached.
 *
 * Returns the total number of new nodes added.
 */
export async function extendShortLeaves(
  root: MoveNode,
  targetDepth: number = DEFAULT_TARGET_DEPTH,
  fetcher: ExplorerFetcher = (fen) => fetchLichessExplorer(fen),
  maxMoves: number = DEFAULT_MAX_MOVES,
): Promise<number> {
  let totalAdded = 0;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const shortLeaves = findShortLeaves(root, targetDepth);
    if (shortLeaves.length === 0) break;

    let addedThisRound = 0;

    for (const leaf of shortLeaves) {
      const explorerData = await fetcher(leaf.fen);
      if (explorerData.moves.length === 0) continue;

      const topMoves = explorerData.moves.slice(0, maxMoves);

      for (let i = 0; i < topMoves.length; i++) {
        const explorerMove = topMoves[i]!;
        const chessCopy = new Chess(leaf.fen);
        let result;
        try {
          result = chessCopy.move(explorerMove.san);
        } catch {
          continue;
        }

        // Skip if this move already exists
        const existing = leaf.node.children.find((c) => c.move === result.san);
        if (existing) continue;

        const newNode: MoveNode = {
          move: result.san,
          fen: chessCopy.fen(),
          children: [],
          isMainLine: i === 0,
        };
        leaf.node.children.push(newNode);
        addedThisRound++;
      }
    }

    totalAdded += addedThisRound;
    if (addedThisRound === 0) break;
  }

  return totalAdded;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// CLI: extend all opening JSON files in public/openings/
// ---------------------------------------------------------------------------

async function extendAllOpeningFiles(
  targetDepth: number = DEFAULT_TARGET_DEPTH,
  maxMoves: number = DEFAULT_MAX_MOVES,
): Promise<void> {
  const { annotateMoveTreeWithContext } =
    await import("./generate-annotations.js");
  const { extendMainLine } = await import("./build-move-trees.js");
  const { openingBook } = await import("@chess-openings/eco.json");

  // Load eco.json and build move index
  console.log("Loading eco.json opening book...");
  const book = await openingBook();
  const ecoIndex = buildEcoMoveIndex(book);
  console.log(
    `Built move index: ${ecoIndex.size} positions with known continuations.`,
  );

  const fetcher = createEcoFetcher(ecoIndex);

  const openingsDir = join(__dirname, "..", "public", "openings");
  const files = readdirSync(openingsDir).filter((f) => f.endsWith(".json"));

  console.log(
    `\nProcessing ${files.length} opening files. Target depth: ${targetDepth} half-moves.`,
  );

  let totalFilesModified = 0;
  let totalNodesAdded = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    const filePath = join(openingsDir, file);
    const content = readFileSync(filePath, "utf-8");
    const opening = JSON.parse(content) as Opening;

    let fileNodesAdded = 0;

    for (const variation of opening.variations) {
      const added = await extendShortLeaves(
        variation.moves,
        targetDepth,
        fetcher,
        maxMoves,
      );

      if (added > 0) {
        extendMainLine(variation.moves);
        annotateMoveTreeWithContext(variation.moves, opening.name);
        fileNodesAdded += added;
      }
    }

    if (fileNodesAdded > 0) {
      writeFileSync(filePath, JSON.stringify(opening, null, 2), "utf-8");
      totalFilesModified++;
      totalNodesAdded += fileNodesAdded;
      console.log(
        `[${i + 1}/${files.length}] ${opening.name}: +${fileNodesAdded} nodes`,
      );
    } else {
      console.log(
        `[${i + 1}/${files.length}] ${opening.name}: already deep enough`,
      );
    }
  }

  console.log(
    `\nDone. Modified ${totalFilesModified}/${files.length} files, added ${totalNodesAdded} nodes total.`,
  );
}

// Run directly: npx tsx scripts/extend-variants.ts [--target-depth=N] [--max-moves=N]
if (process.argv[1] === __filename) {
  const targetArg = process.argv.find((a) => a.startsWith("--target-depth="));
  const maxArg = process.argv.find((a) => a.startsWith("--max-moves="));
  const targetDepth = targetArg
    ? parseInt(targetArg.split("=")[1]!, 10)
    : DEFAULT_TARGET_DEPTH;
  const maxMoves = maxArg
    ? parseInt(maxArg.split("=")[1]!, 10)
    : DEFAULT_MAX_MOVES;

  extendAllOpeningFiles(targetDepth, maxMoves).catch((err: unknown) => {
    console.error("Failed to extend variants:", err);
    process.exit(1);
  });
}
