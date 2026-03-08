import { describe, it, expect } from "vitest";
import {
  classifyMove,
  inferStrategicTheme,
  generateMoveRationale,
  generateAnnotation,
  annotateMoveTree,
} from "../generate-annotations.js";
import type { MoveNode } from "../../src/types/OpeningTypes.js";

describe("classifyMove", () => {
  it("should classify center pawn moves", () => {
    expect(classifyMove("e4")).toBe("center-pawn");
    expect(classifyMove("d4")).toBe("center-pawn");
    expect(classifyMove("e3")).toBe("center-pawn");
    expect(classifyMove("d3")).toBe("center-pawn");
  });

  it("should classify piece development", () => {
    expect(classifyMove("Nf3")).toBe("piece-development");
    expect(classifyMove("Bc4")).toBe("piece-development");
    expect(classifyMove("Nc6")).toBe("piece-development");
  });

  it("should classify castling", () => {
    expect(classifyMove("O-O")).toBe("castling");
    expect(classifyMove("O-O-O")).toBe("castling");
  });

  it("should classify captures", () => {
    expect(classifyMove("Nxe5")).toBe("capture");
    expect(classifyMove("exd5")).toBe("capture");
  });

  it("should classify pawn advances", () => {
    expect(classifyMove("a3")).toBe("pawn-advance");
    expect(classifyMove("h6")).toBe("pawn-advance");
    expect(classifyMove("c5")).toBe("pawn-advance");
  });

  it("should classify queen moves", () => {
    expect(classifyMove("Qd2")).toBe("queen-move");
    expect(classifyMove("Qh5")).toBe("queen-move");
  });

  it("should classify rook moves", () => {
    expect(classifyMove("Rd1")).toBe("rook-move");
    expect(classifyMove("Re1")).toBe("rook-move");
  });
});

describe("inferStrategicTheme", () => {
  it("should infer center control for center pawns", () => {
    expect(inferStrategicTheme("e4")).toBe("Center control");
    expect(inferStrategicTheme("d4")).toBe("Center control");
  });

  it("should infer piece development for knights and bishops", () => {
    expect(inferStrategicTheme("Nf3")).toBe("Piece development");
    expect(inferStrategicTheme("Bc4")).toBe("Piece development");
  });

  it("should infer king safety for castling", () => {
    expect(inferStrategicTheme("O-O")).toBe("King safety");
    expect(inferStrategicTheme("O-O-O")).toBe(
      "King safety, queenside activity",
    );
  });

  it("should infer material exchange for captures", () => {
    expect(inferStrategicTheme("Nxe5")).toBe("Material exchange");
  });
});

describe("generateMoveRationale", () => {
  it("should generate rationale for center pawn", () => {
    const rationale = generateMoveRationale("e4");
    expect(rationale).toContain("e4");
    expect(rationale).toContain("center");
  });

  it("should generate rationale for castling", () => {
    const rationale = generateMoveRationale("O-O");
    expect(rationale).toContain("king");
    expect(rationale).toContain("safety");
  });

  it("should generate rationale for piece development", () => {
    const rationale = generateMoveRationale("Nf3");
    expect(rationale).toContain("Nf3");
    expect(rationale).toContain("develops");
  });
});

describe("generateAnnotation", () => {
  it("should return a complete annotation with source 'generated'", () => {
    const annotation = generateAnnotation("e4");
    expect(annotation.moveRationale).toBeTruthy();
    expect(annotation.strategicTheme).toBeTruthy();
    expect(annotation.source).toBe("generated");
  });
});

describe("annotateMoveTree", () => {
  it("should annotate all non-root nodes in a tree", () => {
    const root: MoveNode = {
      move: "",
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      children: [
        {
          move: "e4",
          fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
          children: [
            {
              move: "e5",
              fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
              children: [],
              isMainLine: true,
            },
          ],
          isMainLine: true,
        },
      ],
      isMainLine: true,
    };

    annotateMoveTree(root);

    // Root should not be annotated
    expect(root.annotation).toBeUndefined();

    // e4 should be annotated
    const e4 = root.children[0]!;
    expect(e4.annotation).toBeDefined();
    expect(e4.annotation!.source).toBe("generated");
    expect(e4.annotation!.strategicTheme).toBe("Center control");

    // e5 should be annotated
    const e5 = e4.children[0]!;
    expect(e5.annotation).toBeDefined();
    expect(e5.annotation!.source).toBe("generated");
  });

  it("should annotate branching trees", () => {
    const root: MoveNode = {
      move: "",
      fen: "start",
      children: [
        {
          move: "e4",
          fen: "after-e4",
          children: [
            { move: "e5", fen: "after-e5", children: [], isMainLine: true },
            { move: "c5", fen: "after-c5", children: [], isMainLine: false },
          ],
          isMainLine: true,
        },
      ],
      isMainLine: true,
    };

    annotateMoveTree(root);

    const e4 = root.children[0]!;
    expect(e4.annotation).toBeDefined();
    expect(e4.children[0]!.annotation).toBeDefined();
    expect(e4.children[1]!.annotation).toBeDefined();
  });
});
