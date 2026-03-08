import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LearnModel } from "../LearnModel";
import type { MoveNode, Annotation, Opening } from "../../types/OpeningTypes";

// FENs for 1.e4 e5 2.Nf3 Nc6
const E4_FEN = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
const E5_FEN = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
const NF3_FEN =
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2";
const NC6_FEN =
  "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3";
const D5_FEN = "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";

const SAMPLE_ANNOTATION: Annotation = {
  moveRationale: "Controls the center and opens lines for bishop and queen.",
  strategicTheme: "Center control",
  source: "wikibooks",
};

const E5_ANNOTATION: Annotation = {
  moveRationale: "Symmetrical response, contesting the center.",
  strategicTheme: "Counter-center",
  source: "generated",
};

/** Build a test opening tree: 1.e4 e5 2.Nf3 Nc6, with branch 1...d5 */
function buildTestMoveTree(): MoveNode {
  const nc6Node: MoveNode = {
    move: "Nc6",
    fen: NC6_FEN,
    children: [],
    isMainLine: true,
  };

  const nf3Node: MoveNode = {
    move: "Nf3",
    fen: NF3_FEN,
    children: [nc6Node],
    isMainLine: true,
  };

  const e5Node: MoveNode = {
    move: "e5",
    fen: E5_FEN,
    annotation: E5_ANNOTATION,
    children: [nf3Node],
    isMainLine: true,
  };

  const d5Node: MoveNode = {
    move: "d5",
    fen: D5_FEN,
    children: [],
    isMainLine: false,
  };

  const e4Node: MoveNode = {
    move: "e4",
    fen: E4_FEN,
    annotation: SAMPLE_ANNOTATION,
    children: [e5Node, d5Node],
    isMainLine: true,
  };

  return e4Node;
}

function buildTestOpening(): Opening {
  return {
    id: "italian-game",
    name: "Italian Game",
    eco: "C50",
    variations: [
      {
        id: "main-line",
        name: "Main Line",
        moves: buildTestMoveTree(),
        pgn: "1. e4 e5 2. Nf3 Nc6",
      },
    ],
  };
}

describe("LearnModel", () => {
  let model: LearnModel;
  let opening: Opening;

  beforeEach(() => {
    vi.useFakeTimers();
    opening = buildTestOpening();
    model = new LearnModel(opening, "main-line", "w");
  });

  afterEach(() => {
    model.dispose();
    vi.useRealTimers();
  });

  describe("initialization", () => {
    it("should create with correct player color", () => {
      expect(model.playerColor).toBe("w");
    });

    it("should start at the root of the move tree", () => {
      expect(model.chessGame.position).toBe(E4_FEN);
    });

    it("should not be auto-playing initially", () => {
      expect(model.isAutoPlaying).toBe(false);
    });

    it("should have default auto-play speed of 1500ms", () => {
      expect(model.autoPlaySpeed).toBe(1500);
    });

    it("should report canGoForward as true at start", () => {
      expect(model.canGoForward).toBe(true);
    });

    it("should report canGoBack as false at start", () => {
      expect(model.canGoBack).toBe(false);
    });

    it("should have currentMoveIndex of 0 at start", () => {
      expect(model.currentMoveIndex).toBe(0);
    });

    it("should have moveHistory with just the root move", () => {
      expect(model.moveHistory).toEqual(["e4"]);
    });
  });

  describe("advance", () => {
    it("should advance to the next move in the tree", () => {
      model.advance();
      expect(model.chessGame.position).toBe(E5_FEN);
      expect(model.currentMoveIndex).toBe(1);
    });

    it("should update moveHistory when advancing", () => {
      model.advance();
      expect(model.moveHistory).toEqual(["e4", "e5"]);
    });

    it("should advance through multiple moves", () => {
      model.advance(); // e5
      model.advance(); // Nf3
      model.advance(); // Nc6
      expect(model.chessGame.position).toBe(NC6_FEN);
      expect(model.moveHistory).toEqual(["e4", "e5", "Nf3", "Nc6"]);
    });

    it("should not advance past the end", () => {
      model.advance(); // e5
      model.advance(); // Nf3
      model.advance(); // Nc6
      model.advance(); // should do nothing
      expect(model.chessGame.position).toBe(NC6_FEN);
      expect(model.canGoForward).toBe(false);
    });
  });

  describe("goBack", () => {
    it("should go back to previous position", () => {
      model.advance(); // e5
      model.goBack();
      expect(model.chessGame.position).toBe(E4_FEN);
      expect(model.currentMoveIndex).toBe(0);
    });

    it("should not go back before the start", () => {
      model.goBack(); // should do nothing
      expect(model.chessGame.position).toBe(E4_FEN);
      expect(model.canGoBack).toBe(false);
    });

    it("should update moveHistory when going back", () => {
      model.advance(); // e5
      model.advance(); // Nf3
      model.goBack();
      expect(model.moveHistory).toEqual(["e4", "e5"]);
    });
  });

  describe("goToStart", () => {
    it("should go back to the beginning from any position", () => {
      model.advance(); // e5
      model.advance(); // Nf3
      model.goToStart();
      expect(model.chessGame.position).toBe(E4_FEN);
      expect(model.currentMoveIndex).toBe(0);
      expect(model.canGoBack).toBe(false);
    });

    it("should update moveHistory to only root", () => {
      model.advance();
      model.advance();
      model.goToStart();
      expect(model.moveHistory).toEqual(["e4"]);
    });
  });

  describe("goToEnd", () => {
    it("should go to the end of the main line", () => {
      model.goToEnd();
      expect(model.chessGame.position).toBe(NC6_FEN);
      expect(model.canGoForward).toBe(false);
    });

    it("should update moveHistory to full main line", () => {
      model.goToEnd();
      expect(model.moveHistory).toEqual(["e4", "e5", "Nf3", "Nc6"]);
    });
  });

  describe("selectBranch", () => {
    it("should switch to a different variation", () => {
      model.selectBranch("d5");
      expect(model.chessGame.position).toBe(D5_FEN);
    });

    it("should update moveHistory when selecting branch", () => {
      model.selectBranch("d5");
      expect(model.moveHistory).toEqual(["e4", "d5"]);
    });

    it("should do nothing if branch does not exist", () => {
      model.selectBranch("c5"); // not in tree
      expect(model.chessGame.position).toBe(E4_FEN);
      expect(model.moveHistory).toEqual(["e4"]);
    });
  });

  describe("currentAnnotation", () => {
    it("should return annotation at root", () => {
      expect(model.currentAnnotation).toBeDefined();
      expect(model.currentAnnotation?.moveRationale).toBe(
        "Controls the center and opens lines for bishop and queen.",
      );
    });

    it("should return annotation for annotated move", () => {
      model.advance(); // e5
      expect(model.currentAnnotation).toBeDefined();
      expect(model.currentAnnotation?.strategicTheme).toBe("Counter-center");
    });

    it("should return undefined for unannotated move", () => {
      model.advance(); // e5
      model.advance(); // Nf3
      expect(model.currentAnnotation).toBeUndefined();
    });
  });

  describe("availableBranches", () => {
    it("should return branches at branch points", () => {
      // At e4, there are two children: e5 (main) and d5 (side)
      const branches = model.availableBranches;
      expect(branches).toHaveLength(2);
      expect(branches.map((b) => b.move)).toContain("e5");
      expect(branches.map((b) => b.move)).toContain("d5");
    });

    it("should return single branch for linear positions", () => {
      model.advance(); // e5 - only child is Nf3
      const branches = model.availableBranches;
      expect(branches).toHaveLength(1);
      expect(branches[0]?.move).toBe("Nf3");
    });

    it("should return empty array at leaf node", () => {
      model.goToEnd(); // Nc6
      expect(model.availableBranches).toHaveLength(0);
    });
  });

  describe("hasBranches", () => {
    it("should be true when there are multiple branches", () => {
      // At e4 root, there are 2 children
      expect(model.hasBranches).toBe(true);
    });

    it("should be false when there is only one continuation", () => {
      model.advance(); // e5 - only child is Nf3
      expect(model.hasBranches).toBe(false);
    });

    it("should be false at leaf node", () => {
      model.goToEnd();
      expect(model.hasBranches).toBe(false);
    });
  });

  describe("auto-play", () => {
    it("should start auto-playing", () => {
      model.startAutoPlay();
      expect(model.isAutoPlaying).toBe(true);
    });

    it("should stop auto-playing", () => {
      model.startAutoPlay();
      model.stopAutoPlay();
      expect(model.isAutoPlaying).toBe(false);
    });

    it("should advance position on each tick", () => {
      model.startAutoPlay();
      vi.advanceTimersByTime(1500);
      expect(model.chessGame.position).toBe(E5_FEN);
      vi.advanceTimersByTime(1500);
      expect(model.chessGame.position).toBe(NF3_FEN);
    });

    it("should stop at the end of the line", () => {
      model.startAutoPlay();
      // Advance through all 3 remaining moves
      vi.advanceTimersByTime(1500 * 4);
      expect(model.chessGame.position).toBe(NC6_FEN);
      expect(model.isAutoPlaying).toBe(false);
    });

    it("should stop when dispose is called", () => {
      model.startAutoPlay();
      model.dispose();
      vi.advanceTimersByTime(1500);
      // Should still be at root position since timer was cleared
      expect(model.chessGame.position).toBe(E4_FEN);
    });
  });
});
