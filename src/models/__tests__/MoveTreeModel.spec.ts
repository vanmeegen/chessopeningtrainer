import { describe, it, expect, beforeEach } from "vitest";
import { MoveTreeModel } from "../MoveTreeModel";
import type { MoveNode, Annotation } from "../../types/OpeningTypes";

/** Helper to build a simple linear MoveNode chain from SAN moves and FENs */
function buildLinearTree(
  movesWithFens: Array<{ move: string; fen: string; annotation?: Annotation }>,
): MoveNode {
  if (movesWithFens.length === 0) {
    throw new Error("Need at least one move");
  }

  const first = movesWithFens[0]!;
  const root: MoveNode = {
    move: first.move,
    fen: first.fen,
    annotation: first.annotation,
    children: [],
    isMainLine: true,
  };

  let current = root;
  for (let i = 1; i < movesWithFens.length; i++) {
    const entry = movesWithFens[i]!;
    const node: MoveNode = {
      move: entry.move,
      fen: entry.fen,
      annotation: entry.annotation,
      children: [],
      isMainLine: true,
    };
    current.children.push(node);
    current = node;
  }

  return root;
}

// FENs for 1.e4 e5 2.Nf3 Nc6
const E4_FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
const E5_FEN = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
const NF3_FEN =
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2";
const NC6_FEN =
  "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3";

const SAMPLE_ANNOTATION: Annotation = {
  moveRationale: "Controls the center and opens lines for bishop and queen.",
  strategicTheme: "Center control",
  source: "wikibooks",
};

describe("MoveTreeModel", () => {
  let model: MoveTreeModel;
  let simpleTree: MoveNode;

  beforeEach(() => {
    simpleTree = buildLinearTree([
      { move: "e4", fen: E4_FEN, annotation: SAMPLE_ANNOTATION },
      { move: "e5", fen: E5_FEN },
      { move: "Nf3", fen: NF3_FEN },
      { move: "Nc6", fen: NC6_FEN },
    ]);
    model = new MoveTreeModel(simpleTree);
  });

  describe("initialization", () => {
    it("should start at the root node", () => {
      expect(model.currentMove).toBe("e4");
      expect(model.currentFen).toBe(E4_FEN);
    });

    it("should indicate it is at the start", () => {
      expect(model.isAtStart).toBe(true);
    });

    it("should not be at the end", () => {
      expect(model.isAtEnd).toBe(false);
    });
  });

  describe("navigation - advance", () => {
    it("should advance to the next move in the main line", () => {
      model.advance();
      expect(model.currentMove).toBe("e5");
      expect(model.currentFen).toBe(E5_FEN);
    });

    it("should advance through multiple moves", () => {
      model.advance();
      model.advance();
      expect(model.currentMove).toBe("Nf3");
      expect(model.currentFen).toBe(NF3_FEN);
    });

    it("should advance to a specific move by SAN", () => {
      // At root (e4), only child is e5 which is the main line
      model.advance("e5");
      expect(model.currentMove).toBe("e5");
    });

    it("should not advance past the end", () => {
      model.advance(); // e5
      model.advance(); // Nf3
      model.advance(); // Nc6
      model.advance(); // should do nothing
      expect(model.currentMove).toBe("Nc6");
      expect(model.isAtEnd).toBe(true);
    });
  });

  describe("navigation - goBack", () => {
    it("should go back to the previous move", () => {
      model.advance(); // e5
      model.goBack();
      expect(model.currentMove).toBe("e4");
      expect(model.isAtStart).toBe(true);
    });

    it("should not go back before the start", () => {
      model.goBack(); // should do nothing
      expect(model.currentMove).toBe("e4");
      expect(model.isAtStart).toBe(true);
    });

    it("should go back through multiple moves", () => {
      model.advance(); // e5
      model.advance(); // Nf3
      model.advance(); // Nc6
      model.goBack(); // Nf3
      model.goBack(); // e5
      expect(model.currentMove).toBe("e5");
    });
  });

  describe("navigation - goToStart and goToEnd", () => {
    it("should go to the start from any position", () => {
      model.advance(); // e5
      model.advance(); // Nf3
      model.goToStart();
      expect(model.currentMove).toBe("e4");
      expect(model.isAtStart).toBe(true);
    });

    it("should go to the end of the main line", () => {
      model.goToEnd();
      expect(model.currentMove).toBe("Nc6");
      expect(model.isAtEnd).toBe(true);
    });

    it("should handle goToEnd when already at end", () => {
      model.goToEnd();
      model.goToEnd();
      expect(model.currentMove).toBe("Nc6");
    });
  });

  describe("branches", () => {
    it("should return no branches when there is only the main line", () => {
      const branches = model.getBranches();
      expect(branches).toHaveLength(1);
      expect(branches[0]?.move).toBe("e5");
    });

    it("should return multiple branches at a branch point", () => {
      // Add a side line: after e4, also d5 (French-like)
      const d5Node: MoveNode = {
        move: "d5",
        fen: "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        children: [],
        isMainLine: false,
      };
      simpleTree.children.push(d5Node);

      model = new MoveTreeModel(simpleTree);
      const branches = model.getBranches();
      expect(branches).toHaveLength(2);
      expect(branches.map((b) => b.move)).toContain("e5");
      expect(branches.map((b) => b.move)).toContain("d5");
    });

    it("should advance to a specific branch", () => {
      const d5Node: MoveNode = {
        move: "d5",
        fen: "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        children: [],
        isMainLine: false,
      };
      simpleTree.children.push(d5Node);

      model = new MoveTreeModel(simpleTree);
      model.advance("d5");
      expect(model.currentMove).toBe("d5");
      expect(model.currentFen).toBe(d5Node.fen);
    });

    it("should return empty branches at a leaf node", () => {
      model.goToEnd();
      const branches = model.getBranches();
      expect(branches).toHaveLength(0);
    });
  });

  describe("getMainLine", () => {
    it("should return the full main line as an array of moves", () => {
      const mainLine = model.getMainLine();
      expect(mainLine).toEqual(["e4", "e5", "Nf3", "Nc6"]);
    });

    it("should only follow main line children", () => {
      const d5Node: MoveNode = {
        move: "d5",
        fen: "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        children: [],
        isMainLine: false,
      };
      simpleTree.children.push(d5Node);

      model = new MoveTreeModel(simpleTree);
      const mainLine = model.getMainLine();
      expect(mainLine).toEqual(["e4", "e5", "Nf3", "Nc6"]);
      expect(mainLine).not.toContain("d5");
    });
  });

  describe("annotations", () => {
    it("should return annotation for the current node when available", () => {
      const annotation = model.currentAnnotation;
      expect(annotation).toBeDefined();
      expect(annotation?.moveRationale).toBe(
        "Controls the center and opens lines for bishop and queen.",
      );
      expect(annotation?.strategicTheme).toBe("Center control");
      expect(annotation?.source).toBe("wikibooks");
    });

    it("should return undefined when no annotation exists", () => {
      model.advance(); // e5, no annotation
      expect(model.currentAnnotation).toBeUndefined();
    });
  });

  describe("tree with variations/branches", () => {
    it("should handle a tree with deep branches", () => {
      // After 1.e4 e5 2.Nf3, add Bc4 (Italian) and Bb5 (Ruy Lopez) branches
      const nf3Node = simpleTree.children[0]!.children[0]!;
      const bc4Node: MoveNode = {
        move: "Bc4",
        fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
        children: [],
        isMainLine: false,
      };
      // Nc6 is already the main line child
      nf3Node.children.push(bc4Node);

      model = new MoveTreeModel(simpleTree);
      model.advance(); // e5
      model.advance(); // Nf3

      const branches = model.getBranches();
      expect(branches).toHaveLength(2);
      expect(branches.map((b) => b.move)).toContain("Nc6");
      expect(branches.map((b) => b.move)).toContain("Bc4");

      // Follow the side line
      model.advance("Bc4");
      expect(model.currentMove).toBe("Bc4");
      expect(model.isAtEnd).toBe(true);

      // Go back and follow main line
      model.goBack();
      model.advance(); // default = main line = Nc6
      expect(model.currentMove).toBe("Nc6");
    });
  });
});
