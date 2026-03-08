import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  findShortLeaves,
  extendShortLeaves,
  readExplorerCache,
  writeExplorerCache,
  buildEcoMoveIndex,
  createEcoFetcher,
} from "../extend-variants.js";
import type { ExplorerResponse } from "../extend-variants.js";
import type { OpeningCollection } from "@chess-openings/eco.json";
import { buildMoveTree, mergeMoveSequence } from "../build-move-trees.js";
import type { MoveNode } from "../../src/types/OpeningTypes.js";
import { existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEST_CACHE_DIR = join(__dirname, "test-explorer-cache");

describe("findShortLeaves", () => {
  it("should find leaf nodes below target depth", () => {
    const root = buildMoveTree(["e4", "e5"]);
    const leaves = findShortLeaves(root, 12);

    expect(leaves).toHaveLength(1);
    expect(leaves[0]!.node.move).toBe("e5");
    expect(leaves[0]!.depth).toBe(2);
  });

  it("should not return nodes at or above target depth", () => {
    const moves = [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "Bc5",
      "c3",
      "Nf6",
      "d4",
      "exd4",
      "cxd4",
      "Bb4+",
    ];
    const root = buildMoveTree(moves);
    const leaves = findShortLeaves(root, 12);

    expect(leaves).toHaveLength(0);
  });

  it("should find multiple short leaves in a branching tree", () => {
    const root = buildMoveTree(["e4", "e5"], true);
    mergeMoveSequence(root, ["e4", "c5"], false);

    const leaves = findShortLeaves(root, 12);

    expect(leaves).toHaveLength(2);
    const moveNames = leaves.map((l) => l.node.move).sort();
    expect(moveNames).toEqual(["c5", "e5"]);
  });

  it("should not return intermediate nodes that have children", () => {
    const root = buildMoveTree(["e4", "e5", "Nf3"]);
    const leaves = findShortLeaves(root, 12);

    expect(leaves).toHaveLength(1);
    expect(leaves[0]!.node.move).toBe("Nf3");
  });

  it("should return empty root as leaf for empty tree", () => {
    const root = buildMoveTree([]);
    const leaves = findShortLeaves(root, 12);
    expect(leaves).toHaveLength(1);
    expect(leaves[0]!.depth).toBe(0);
  });
});

describe("explorer cache", () => {
  beforeEach(() => {
    if (existsSync(TEST_CACHE_DIR)) {
      rmSync(TEST_CACHE_DIR, { recursive: true });
    }
  });

  it("should return null for uncached FEN", () => {
    const result = readExplorerCache(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      TEST_CACHE_DIR,
    );
    expect(result).toBeNull();
  });

  it("should write and read cache entries", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const response: ExplorerResponse = {
      moves: [
        { san: "e5", white: 1000, draws: 500, black: 800 },
        { san: "c5", white: 900, draws: 400, black: 700 },
      ],
    };

    writeExplorerCache(fen, response, TEST_CACHE_DIR);
    const cached = readExplorerCache(fen, TEST_CACHE_DIR);

    expect(cached).not.toBeNull();
    expect(cached!.moves).toHaveLength(2);
    expect(cached!.moves[0]!.san).toBe("e5");
  });

  it("cleanup test cache dir", () => {
    if (existsSync(TEST_CACHE_DIR)) {
      rmSync(TEST_CACHE_DIR, { recursive: true });
    }
  });
});

describe("buildEcoMoveIndex", () => {
  it("should build index from eco.json opening collection", () => {
    const book: OpeningCollection = {
      "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2": {
        src: "eco_tsv",
        eco: "C20",
        moves: "1. e4 e5",
        name: "King's Pawn Game",
      },
      "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2": {
        src: "eco_tsv",
        eco: "C40",
        moves: "1. e4 e5 2. Nf3",
        name: "King's Knight Opening",
      },
      "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3": {
        src: "eco_tsv",
        eco: "C44",
        moves: "1. e4 e5 2. Nf3 Nc6",
        name: "King's Knight Opening",
      },
    };

    const index = buildEcoMoveIndex(book);

    // Starting position should map to e4
    const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const startMoves = index.get(startFen);
    expect(startMoves).toBeDefined();
    expect(startMoves!.find((m) => m.san === "e4")).toBeDefined();
    // e4 appears in all 3 openings, so count should be 3
    expect(startMoves!.find((m) => m.san === "e4")!.white).toBe(3);

    // After e4, should map to e5
    const afterE4 =
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const afterE4Moves = index.get(afterE4);
    expect(afterE4Moves).toBeDefined();
    expect(afterE4Moves!.find((m) => m.san === "e5")).toBeDefined();
  });

  it("should sort moves by frequency (most common first)", () => {
    const book: OpeningCollection = {
      // Two openings with Nf3, one with Bc4
      fen1: {
        src: "eco_tsv",
        eco: "C40",
        moves: "1. e4 e5 2. Nf3",
        name: "A",
      },
      fen2: {
        src: "eco_tsv",
        eco: "C44",
        moves: "1. e4 e5 2. Nf3 Nc6",
        name: "B",
      },
      fen3: {
        src: "eco_tsv",
        eco: "C23",
        moves: "1. e4 e5 2. Bc4",
        name: "C",
      },
    };

    const index = buildEcoMoveIndex(book);

    const afterE5 =
      "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
    const moves = index.get(afterE5);
    expect(moves).toBeDefined();
    // Nf3 appears twice, Bc4 once → Nf3 should be first
    expect(moves![0]!.san).toBe("Nf3");
    expect(moves![0]!.white).toBe(2);
    expect(moves![1]!.san).toBe("Bc4");
    expect(moves![1]!.white).toBe(1);
  });
});

describe("createEcoFetcher", () => {
  it("should return moves for known positions", async () => {
    const book: OpeningCollection = {
      fen1: {
        src: "eco_tsv",
        eco: "C40",
        moves: "1. e4 e5 2. Nf3",
        name: "King's Knight",
      },
    };

    const index = buildEcoMoveIndex(book);
    const fetcher = createEcoFetcher(index);

    const afterE5 =
      "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
    const result = await fetcher(afterE5);

    expect(result.moves.length).toBeGreaterThan(0);
    expect(result.moves.find((m) => m.san === "Nf3")).toBeDefined();
  });

  it("should return empty moves for unknown positions", async () => {
    const index = buildEcoMoveIndex({});
    const fetcher = createEcoFetcher(index);

    const result = await fetcher("some/unknown/fen");
    expect(result.moves).toHaveLength(0);
  });
});

describe("extendShortLeaves", () => {
  it("should extend a short leaf using fetcher data", async () => {
    const root = buildMoveTree(["e4", "e5"]);
    const e5Fen =
      "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";

    const mockFetcher = vi.fn().mockImplementation((fen: string) => {
      if (fen === e5Fen) {
        return Promise.resolve({
          moves: [
            { san: "Nf3", white: 1000, draws: 500, black: 800 },
            { san: "Bc4", white: 900, draws: 400, black: 700 },
          ],
        } satisfies ExplorerResponse);
      }
      return Promise.resolve({ moves: [] } satisfies ExplorerResponse);
    });

    const extended = await extendShortLeaves(root, 4, mockFetcher);

    expect(extended).toBeGreaterThan(0);
    const e5 = root.children[0]!.children[0]!;
    expect(e5.children.length).toBeGreaterThanOrEqual(1);
  });

  it("should not extend leaves already at target depth", async () => {
    const moves = [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "Bc5",
      "c3",
      "Nf6",
      "d4",
      "exd4",
      "cxd4",
      "Bb4+",
    ];
    const root = buildMoveTree(moves);

    const mockFetcher = vi.fn();
    const extended = await extendShortLeaves(root, 12, mockFetcher);

    expect(extended).toBe(0);
    expect(mockFetcher).not.toHaveBeenCalled();
  });

  it("should iteratively extend until target depth is reached", async () => {
    const root = buildMoveTree(["e4", "e5"]);

    let callCount = 0;
    const mockFetcher = vi.fn().mockImplementation((fen: string) => {
      callCount++;
      if (callCount <= 10) {
        const movesForFen: Record<string, string> = {
          "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2": "Nf3",
          "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2":
            "Nc6",
          "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3":
            "Bc4",
          "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3":
            "Bc5",
        };

        const move = movesForFen[fen];
        if (move) {
          return Promise.resolve({
            moves: [{ san: move, white: 1000, draws: 500, black: 800 }],
          } satisfies ExplorerResponse);
        }
      }
      return Promise.resolve({ moves: [] } satisfies ExplorerResponse);
    });

    const extended = await extendShortLeaves(root, 6, mockFetcher);

    expect(extended).toBeGreaterThan(0);

    let node: MoveNode = root;
    let depth = 0;
    while (node.children.length > 0) {
      node = node.children[0]!;
      depth++;
    }
    expect(depth).toBeGreaterThanOrEqual(6);
  });

  it("should stop extending when fetcher returns no moves", async () => {
    const root = buildMoveTree(["e4", "e5"]);

    const mockFetcher = vi.fn().mockResolvedValue({
      moves: [],
    } satisfies ExplorerResponse);

    const extended = await extendShortLeaves(root, 12, mockFetcher);

    expect(extended).toBe(0);
    const e5 = root.children[0]!.children[0]!;
    expect(e5.children).toHaveLength(0);
  });

  it("should add at most top N moves from fetcher", async () => {
    const root = buildMoveTree(["e4", "e5"]);

    const mockFetcher = vi.fn().mockResolvedValue({
      moves: [
        { san: "Nf3", white: 1000, draws: 500, black: 800 },
        { san: "Bc4", white: 900, draws: 400, black: 700 },
        { san: "d4", white: 800, draws: 300, black: 600 },
        { san: "f4", white: 700, draws: 200, black: 500 },
        { san: "Nc3", white: 600, draws: 100, black: 400 },
      ],
    } satisfies ExplorerResponse);

    await extendShortLeaves(root, 3, mockFetcher, 3);

    const e5 = root.children[0]!.children[0]!;
    expect(e5.children).toHaveLength(3);
  });

  it("should mark the first (most popular) move as mainline", async () => {
    const root = buildMoveTree(["e4", "e5"]);

    const mockFetcher = vi.fn().mockResolvedValue({
      moves: [
        { san: "Nf3", white: 1000, draws: 500, black: 800 },
        { san: "Bc4", white: 900, draws: 400, black: 700 },
      ],
    } satisfies ExplorerResponse);

    await extendShortLeaves(root, 3, mockFetcher);

    const e5 = root.children[0]!.children[0]!;
    const nf3 = e5.children.find((c) => c.move === "Nf3")!;
    const bc4 = e5.children.find((c) => c.move === "Bc4")!;
    expect(nf3.isMainLine).toBe(true);
    expect(bc4.isMainLine).toBe(false);
  });
});
