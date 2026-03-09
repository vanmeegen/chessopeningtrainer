import { describe, it, expect } from "vitest";
import {
  parsePgnMoves,
  buildMoveTree,
  mergeMoveSequence,
  buildOpeningMoveTree,
  extendMainLine,
} from "../build-move-trees.js";
import type { ParsedVariation } from "../parse-openings.js";

describe("parsePgnMoves", () => {
  it("should extract SAN moves from a PGN string", () => {
    const pgn = "1. e4 e5 2. Nf3 Nc6 3. Bc4";
    const moves = parsePgnMoves(pgn);
    expect(moves).toEqual(["e4", "e5", "Nf3", "Nc6", "Bc4"]);
  });

  it("should handle PGN without move numbers", () => {
    const pgn = "e4 e5 Nf3 Nc6";
    const moves = parsePgnMoves(pgn);
    expect(moves).toEqual(["e4", "e5", "Nf3", "Nc6"]);
  });

  it("should handle empty PGN", () => {
    const moves = parsePgnMoves("");
    expect(moves).toEqual([]);
  });

  it("should handle PGN with comments", () => {
    const pgn = "1. e4 {best move} e5 2. Nf3";
    const moves = parsePgnMoves(pgn);
    expect(moves).toEqual(["e4", "e5", "Nf3"]);
  });
});

describe("buildMoveTree", () => {
  it("should build a tree from a sequence of moves", () => {
    const moves = ["e4", "e5", "Nf3"];
    const root = buildMoveTree(moves);

    expect(root.move).toBe("");
    expect(root.fen).toContain("rnbqkbnr"); // starting position
    expect(root.children).toHaveLength(1);

    const e4Node = root.children[0]!;
    expect(e4Node.move).toBe("e4");
    expect(e4Node.isMainLine).toBe(true);
    expect(e4Node.children).toHaveLength(1);

    const e5Node = e4Node.children[0]!;
    expect(e5Node.move).toBe("e5");
    expect(e5Node.children).toHaveLength(1);

    const nf3Node = e5Node.children[0]!;
    expect(nf3Node.move).toBe("Nf3");
    expect(nf3Node.children).toHaveLength(0);
  });

  it("should compute valid FEN at each node", () => {
    const moves = ["e4", "e5"];
    const root = buildMoveTree(moves);

    // Starting position
    expect(root.fen).toBe(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    );

    // After 1. e4
    const e4Node = root.children[0]!;
    expect(e4Node.fen).toContain("4P3"); // e4 pawn (uppercase P in FEN)
    expect(e4Node.fen).toMatch(/\bb\b/); // black to move

    // After 1... e5
    const e5Node = e4Node.children[0]!;
    expect(e5Node.fen).toContain("4p3"); // e5 pawn (lowercase p)
    expect(e5Node.fen).toMatch(/\bw\b/); // white to move
  });

  it("should build an empty tree for empty moves", () => {
    const root = buildMoveTree([]);
    expect(root.move).toBe("");
    expect(root.children).toHaveLength(0);
  });

  it("should mark all nodes with the given isMainLine value", () => {
    const moves = ["d4", "d5"];
    const root = buildMoveTree(moves, false);

    expect(root.isMainLine).toBe(true); // root is always main line
    expect(root.children[0]!.isMainLine).toBe(false);
    expect(root.children[0]!.children[0]!.isMainLine).toBe(false);
  });
});

describe("mergeMoveSequence", () => {
  it("should share common prefix nodes", () => {
    // Build initial tree: 1. e4 e5 2. Nf3
    const root = buildMoveTree(["e4", "e5", "Nf3"]);

    // Merge: 1. e4 e5 2. Bc4 (diverges at move 2)
    mergeMoveSequence(root, ["e4", "e5", "Bc4"]);

    expect(root.children).toHaveLength(1); // only e4
    const e4Node = root.children[0]!;
    expect(e4Node.children).toHaveLength(1); // only e5
    const e5Node = e4Node.children[0]!;
    expect(e5Node.children).toHaveLength(2); // Nf3 and Bc4
    expect(e5Node.children.map((c) => c.move).sort()).toEqual(["Bc4", "Nf3"]);
  });

  it("should add completely new branch from root", () => {
    // Build initial: 1. e4
    const root = buildMoveTree(["e4"]);

    // Merge: 1. d4 (different first move)
    mergeMoveSequence(root, ["d4"]);

    expect(root.children).toHaveLength(2);
    expect(root.children.map((c) => c.move).sort()).toEqual(["d4", "e4"]);
  });

  it("should not duplicate existing moves", () => {
    const root = buildMoveTree(["e4", "e5"]);

    // Merge the exact same sequence
    mergeMoveSequence(root, ["e4", "e5"]);

    expect(root.children).toHaveLength(1);
    expect(root.children[0]!.children).toHaveLength(1);
  });

  it("should mark merged nodes as not main line", () => {
    const root = buildMoveTree(["e4", "e5"], true);
    mergeMoveSequence(root, ["e4", "c5"], false);

    const e4Node = root.children[0]!;
    expect(e4Node.children).toHaveLength(2);

    const e5Node = e4Node.children.find((c) => c.move === "e5")!;
    const c5Node = e4Node.children.find((c) => c.move === "c5")!;

    expect(e5Node.isMainLine).toBe(true);
    expect(c5Node.isMainLine).toBe(false);
  });
});

describe("buildOpeningMoveTree", () => {
  it("should merge multiple variations into one tree", () => {
    const variations: ParsedVariation[] = [
      {
        id: "sicilian-defense",
        name: "Main Line",
        eco: "B20",
        pgn: "1. e4 c5",
      },
      {
        id: "sicilian-najdorf",
        name: "Najdorf Variation",
        eco: "B33",
        pgn: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6",
      },
      {
        id: "sicilian-dragon",
        name: "Dragon Variation",
        eco: "B60",
        pgn: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6",
      },
    ];

    const root = buildOpeningMoveTree(variations);
    expect(root).not.toBeNull();

    // e4 is shared
    expect(root!.children).toHaveLength(1);
    const e4 = root!.children[0]!;
    expect(e4.move).toBe("e4");

    // c5 is shared
    expect(e4.children).toHaveLength(1);
    const c5 = e4.children[0]!;
    expect(c5.move).toBe("c5");

    // Main line stops at c5, Najdorf and Dragon continue
    // After c5, the tree should have Nf3 continuation
    // The main line (just "1. e4 c5") stops here with no more children
    // But Najdorf/Dragon add Nf3 d6 etc.
    expect(c5.children.length).toBeGreaterThanOrEqual(1);

    // Follow the shared path down to Nc3
    const nf3 = c5.children.find((c) => c.move === "Nf3");
    expect(nf3).toBeDefined();
    const d6 = nf3!.children.find((c) => c.move === "d6");
    expect(d6).toBeDefined();

    // After Nc3, Najdorf plays a6 and Dragon plays g6
    // Navigate: d4 -> cxd4 -> Nxd4 -> Nf6 -> Nc3
    const d4 = d6!.children.find((c) => c.move === "d4");
    expect(d4).toBeDefined();
    const cxd4 = d4!.children.find((c) => c.move === "cxd4");
    expect(cxd4).toBeDefined();
    const nxd4 = cxd4!.children.find((c) => c.move === "Nxd4");
    expect(nxd4).toBeDefined();
    const nf6 = nxd4!.children.find((c) => c.move === "Nf6");
    expect(nf6).toBeDefined();
    const nc3 = nf6!.children.find((c) => c.move === "Nc3");
    expect(nc3).toBeDefined();

    // Branch point: a6 (Najdorf) vs g6 (Dragon)
    expect(nc3!.children).toHaveLength(2);
    const moves = nc3!.children.map((c) => c.move).sort();
    expect(moves).toEqual(["a6", "g6"]);
  });

  it("should return null for empty variations", () => {
    const result = buildOpeningMoveTree([]);
    expect(result).toBeNull();
  });
});

describe("extendMainLine", () => {
  it("should extend mainline when end node has non-mainline children", () => {
    // Build a tree: main line is e4 c5 (2 moves)
    // Then merge a longer line e4 c5 Nf3 d6 as non-mainline
    const root = buildMoveTree(["e4", "c5"], true);
    mergeMoveSequence(root, ["e4", "c5", "Nf3", "d6"], false);

    // Before: mainline ends at c5
    const c5Before = root.children[0]!.children[0]!;
    expect(c5Before.children[0]!.isMainLine).toBe(false);

    extendMainLine(root);

    // After: mainline should continue through Nf3 and d6
    const c5 = root.children[0]!.children[0]!;
    const nf3 = c5.children[0]!;
    expect(nf3.isMainLine).toBe(true);
    expect(nf3.children[0]!.isMainLine).toBe(true);
  });

  it("should pick the deepest branch when multiple non-mainline children exist", () => {
    const root = buildMoveTree(["e4", "e5"], true);
    mergeMoveSequence(root, ["e4", "e5", "Nf3"], false); // depth 1
    mergeMoveSequence(root, ["e4", "e5", "Bc4", "Nf6", "d3"], false); // depth 3

    extendMainLine(root);

    const e5 = root.children[0]!.children[0]!;
    // Bc4 branch is deeper, should be chosen
    const bc4 = e5.children.find((c) => c.move === "Bc4")!;
    const nf3 = e5.children.find((c) => c.move === "Nf3")!;
    expect(bc4.isMainLine).toBe(true);
    expect(nf3.isMainLine).toBe(false);
  });

  it("should not change anything if mainline already reaches max depth", () => {
    const root = buildMoveTree(["e4", "e5", "Nf3"], true);

    extendMainLine(root);

    // All nodes should still be mainline, no changes
    expect(root.children[0]!.isMainLine).toBe(true);
    expect(root.children[0]!.children[0]!.isMainLine).toBe(true);
    expect(root.children[0]!.children[0]!.children[0]!.isMainLine).toBe(true);
  });

  it("should reroute mainline at intermediate node when sibling is deeper", () => {
    // Main line: e4 Nf6 e5 Ng8 d4 f5 (6 moves, like Alekhine)
    // Side line:  e4 Nf6 e5 Nd5 c4 Nb6 d4 d6 exd6 (9 moves, deeper)
    const root = buildMoveTree(["e4", "Nf6", "e5", "Ng8", "d4", "f5"], true);
    mergeMoveSequence(
      root,
      ["e4", "Nf6", "e5", "Nd5", "c4", "Nb6", "d4", "d6", "exd6"],
      false,
    );

    extendMainLine(root);

    // Nd5 branch is deeper (6 remaining moves) vs Ng8 (3 remaining moves)
    // So mainline should switch to Nd5
    const e5 = root.children[0]!.children[0]!.children[0]!;
    const ng8 = e5.children.find((c) => c.move === "Ng8")!;
    const nd5 = e5.children.find((c) => c.move === "Nd5")!;
    expect(ng8.isMainLine).toBe(false);
    expect(nd5.isMainLine).toBe(true);
  });

  it("should reroute mainline to deeper sibling even at intermediate nodes", () => {
    // Main line: e4 Nf6 (2 moves, mainline ends)
    // Side line at e4: e5 Nf3 Nc6 Bc4 (4 moves deep, deeper than Nf6)
    const root = buildMoveTree(["e4", "Nf6"], true);
    mergeMoveSequence(root, ["e4", "e5", "Nf3", "Nc6", "Bc4"], false);

    extendMainLine(root);

    // e5 branch is deeper (4 remaining) vs Nf6 (1 remaining), so mainline switches
    const e4 = root.children[0]!;
    const nf6 = e4.children.find((c) => c.move === "Nf6")!;
    const e5 = e4.children.find((c) => c.move === "e5")!;
    expect(nf6.isMainLine).toBe(false);
    expect(e5.isMainLine).toBe(true);
    // And the promoted branch continues as mainline
    expect(e5.children[0]!.isMainLine).toBe(true); // Nf3
  });

  it("should handle empty tree", () => {
    const root = buildMoveTree([], true);
    extendMainLine(root); // should not throw
    expect(root.children).toHaveLength(0);
  });

  it("should handle a single variation", () => {
    const variations: ParsedVariation[] = [
      {
        id: "italian-game",
        name: "Main Line",
        eco: "C50",
        pgn: "1. e4 e5 2. Nf3 Nc6 3. Bc4",
      },
    ];

    const root = buildOpeningMoveTree(variations);
    expect(root).not.toBeNull();

    // Linear path: e4 -> e5 -> Nf3 -> Nc6 -> Bc4
    let node = root!;
    const expectedMoves = ["e4", "e5", "Nf3", "Nc6", "Bc4"];
    for (const expectedMove of expectedMoves) {
      expect(node.children).toHaveLength(1);
      node = node.children[0]!;
      expect(node.move).toBe(expectedMove);
      expect(node.isMainLine).toBe(true);
    }
    expect(node.children).toHaveLength(0);
  });
});
