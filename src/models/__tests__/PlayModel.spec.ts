import { describe, it, expect, beforeEach } from "vitest";
import { PlayModel } from "../PlayModel";
import type { Opening, MoveNode } from "../../types/OpeningTypes";
import type { Square } from "../../types/ChessTypes";

/**
 * Build a simple opening tree for testing.
 *
 * Italian Game (simplified):
 * Root ("", start FEN)
 *   └─ e4
 *       └─ e5
 *           └─ Nf3
 *               └─ Nc6
 *                   ├─ Bc4  (main line)
 *                   └─ Bb5  (side line / Ruy Lopez)
 */
const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function buildTestMoveTree(): MoveNode {
  return {
    move: "",
    fen: INITIAL_FEN,
    children: [
      {
        move: "e4",
        fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
        children: [
          {
            move: "e5",
            fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
            children: [
              {
                move: "Nf3",
                fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
                children: [
                  {
                    move: "Nc6",
                    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
                    children: [
                      {
                        move: "Bc4",
                        fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
                        children: [],
                        isMainLine: true,
                      },
                      {
                        move: "Bb5",
                        fen: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
                        children: [],
                        isMainLine: false,
                      },
                    ],
                    isMainLine: true,
                  },
                ],
                isMainLine: true,
              },
            ],
            isMainLine: true,
          },
        ],
        isMainLine: true,
      },
    ],
    isMainLine: true,
  };
}

function buildTestOpening(): Opening {
  const tree = buildTestMoveTree();
  return {
    id: "italian-game",
    name: "Italian Game",
    eco: "C50",
    variations: [
      {
        id: "italian-main",
        name: "Main Line",
        moves: tree,
        pgn: "1. e4 e5 2. Nf3 Nc6 3. Bc4",
      },
      {
        id: "ruy-lopez",
        name: "Ruy Lopez",
        moves: tree,
        pgn: "1. e4 e5 2. Nf3 Nc6 3. Bb5",
      },
    ],
  };
}

describe("PlayModel", () => {
  let opening: Opening;

  beforeEach(() => {
    opening = buildTestOpening();
  });

  describe("initial state", () => {
    it("should start with unconstrained mode when no opening provided", () => {
      const model = new PlayModel(undefined, undefined, "w");
      expect(model.constraintMode).toBe("unconstrained");
      expect(model.currentOpeningName).toBeNull();
      expect(model.currentVariationName).toBeNull();
    });

    it("should start with opening mode when opening provided without variationId", () => {
      const model = new PlayModel(opening, undefined, "w");
      expect(model.constraintMode).toBe("opening");
      expect(model.currentOpeningName).toBe("Italian Game");
    });

    it("should start with variation mode when opening and variationId provided", () => {
      const model = new PlayModel(opening, "italian-main", "w");
      expect(model.constraintMode).toBe("variation");
      expect(model.currentOpeningName).toBe("Italian Game");
      expect(model.currentVariationName).toBe("Main Line");
    });

    it("should set playerColor correctly", () => {
      const model = new PlayModel(opening, undefined, "b");
      expect(model.playerColor).toBe("b");
    });

    it("should not be out of book initially when opening is provided", () => {
      const model = new PlayModel(opening, undefined, "w");
      expect(model.isOutOfBook).toBe(false);
    });

    it("should be out of book initially when no opening is provided", () => {
      const model = new PlayModel(undefined, undefined, "w");
      expect(model.isOutOfBook).toBe(true);
    });

    it("should have no last move assessment initially", () => {
      const model = new PlayModel(opening, undefined, "w");
      expect(model.lastMoveAssessment).toBeNull();
    });
  });

  describe("handleUserMove - book moves", () => {
    it("should assess a book move as 'book'", () => {
      // Player is white, plays e4 (book move)
      const model = new PlayModel(opening, "italian-main", "w");
      const result = model.handleUserMove("e2" as Square, "e4" as Square);
      expect(result).toBe(true);
      expect(model.lastMoveAssessment).toBe("book");
    });

    it("should assess a non-book legal move as 'playable'", () => {
      // Player is white, plays d4 instead of e4 (legal but not in book)
      const model = new PlayModel(opening, "italian-main", "w");
      const result = model.handleUserMove("d2" as Square, "d4" as Square);
      expect(result).toBe(true);
      expect(model.lastMoveAssessment).toBe("playable");
    });

    it("should return false for illegal moves", () => {
      const model = new PlayModel(opening, "italian-main", "w");
      const result = model.handleUserMove("e2" as Square, "e5" as Square);
      expect(result).toBe(false);
      expect(model.lastMoveAssessment).toBeNull();
    });
  });

  describe("COT response", () => {
    it("should respond with book move after player makes a book move", () => {
      // Player is white, plays e4
      const model = new PlayModel(opening, "italian-main", "w");
      model.handleUserMove("e2" as Square, "e4" as Square);
      // COT (black) should respond with e5
      expect(model.chessGame.moveHistory.length).toBe(2); // e4 + e5
      expect(model.chessGame.moveHistory[1]!.san).toBe("e5");
    });

    it("should not respond when player goes out of book", () => {
      const model = new PlayModel(opening, "italian-main", "w");
      // Play non-book move d4
      model.handleUserMove("d2" as Square, "d4" as Square);
      // COT should not respond since we're out of book
      expect(model.chessGame.moveHistory.length).toBe(1); // only d4
      expect(model.isOutOfBook).toBe(true);
    });

    it("should follow main line in variation-constrained mode", () => {
      // Play through: e4 e5 Nf3 Nc6, then COT should play Bc4 (main line)
      const model = new PlayModel(opening, "italian-main", "w");
      // White: e4, COT: e5
      model.handleUserMove("e2" as Square, "e4" as Square);
      // White: Nf3, COT: Nc6
      model.handleUserMove("g1" as Square, "f3" as Square);
      // Now it's white's turn at move 3, play Bc4
      // But wait - COT should have played Nc6, so now we can play Bc4
      expect(model.chessGame.moveHistory.length).toBe(4); // e4,e5,Nf3,Nc6
      // Now white plays Bc4
      model.handleUserMove("f1" as Square, "c4" as Square);
      expect(model.lastMoveAssessment).toBe("book");
      // No more book moves for COT, should be at end of book
      expect(model.chessGame.moveHistory.length).toBe(5); // e4,e5,Nf3,Nc6,Bc4
      expect(model.isOutOfBook).toBe(true);
    });
  });

  describe("COT plays first move when player is black", () => {
    it("should make opening move when player is black", () => {
      const model = new PlayModel(opening, "italian-main", "b");
      // COT (white) should have played e4 automatically
      expect(model.chessGame.moveHistory.length).toBe(1);
      expect(model.chessGame.moveHistory[0]!.san).toBe("e4");
    });

    it("should assess black's book response correctly", () => {
      const model = new PlayModel(opening, "italian-main", "b");
      // COT played e4, now player (black) plays e5
      const result = model.handleUserMove("e7" as Square, "e5" as Square);
      expect(result).toBe(true);
      expect(model.lastMoveAssessment).toBe("book");
      // COT should respond with Nf3
      expect(model.chessGame.moveHistory.length).toBe(3);
      expect(model.chessGame.moveHistory[2]!.san).toBe("Nf3");
    });
  });

  describe("out of book detection", () => {
    it("should detect out of book when no more children in tree", () => {
      const model = new PlayModel(opening, "italian-main", "w");
      // Play through entire main line
      model.handleUserMove("e2" as Square, "e4" as Square); // e4, e5
      model.handleUserMove("g1" as Square, "f3" as Square); // Nf3, Nc6
      model.handleUserMove("f1" as Square, "c4" as Square); // Bc4, no response
      expect(model.isOutOfBook).toBe(true);
    });

    it("should mark out of book when player plays non-book move", () => {
      const model = new PlayModel(opening, "italian-main", "w");
      model.handleUserMove("d2" as Square, "d4" as Square);
      expect(model.isOutOfBook).toBe(true);
    });
  });

  describe("showBookMove", () => {
    it("should reveal the book move for current position", () => {
      const model = new PlayModel(opening, "italian-main", "w");
      // At start, book move should be e4
      model.showBookMove();
      expect(model.bookMoveHint).toBe("e4");
    });

    it("should return null when out of book", () => {
      const model = new PlayModel(opening, "italian-main", "w");
      model.handleUserMove("d2" as Square, "d4" as Square);
      model.showBookMove();
      expect(model.bookMoveHint).toBeNull();
    });

    it("should show correct book move mid-game", () => {
      const model = new PlayModel(opening, "italian-main", "w");
      model.handleUserMove("e2" as Square, "e4" as Square); // e4, e5
      model.handleUserMove("g1" as Square, "f3" as Square); // Nf3, Nc6
      // Now it's white's turn, book move should be Bc4
      model.showBookMove();
      expect(model.bookMoveHint).toBe("Bc4");
    });
  });

  describe("restart", () => {
    it("should reset the game to initial state", () => {
      const model = new PlayModel(opening, "italian-main", "w");
      model.handleUserMove("e2" as Square, "e4" as Square);
      model.restart();
      expect(model.chessGame.moveHistory.length).toBe(0);
      expect(model.isOutOfBook).toBe(false);
      expect(model.lastMoveAssessment).toBeNull();
      expect(model.bookMoveHint).toBeNull();
      expect(model.assessmentMessage).toBe("");
    });

    it("should allow playing again after restart", () => {
      const model = new PlayModel(opening, "italian-main", "w");
      model.handleUserMove("e2" as Square, "e4" as Square);
      model.restart();
      const result = model.handleUserMove("e2" as Square, "e4" as Square);
      expect(result).toBe(true);
      expect(model.lastMoveAssessment).toBe("book");
    });

    it("should make COT first move after restart when player is black", () => {
      const model = new PlayModel(opening, "italian-main", "b");
      model.handleUserMove("e7" as Square, "e5" as Square);
      model.restart();
      // COT should have played e4 again
      expect(model.chessGame.moveHistory.length).toBe(1);
      expect(model.chessGame.moveHistory[0]!.san).toBe("e4");
    });
  });

  describe("assessment messages", () => {
    it("should set assessment message for book move", () => {
      const model = new PlayModel(opening, "italian-main", "w");
      model.handleUserMove("e2" as Square, "e4" as Square);
      expect(model.assessmentMessage).toContain("Book move");
    });

    it("should set assessment message for playable move", () => {
      const model = new PlayModel(opening, "italian-main", "w");
      model.handleUserMove("d2" as Square, "d4" as Square);
      expect(model.assessmentMessage).toContain("Playable");
    });
  });

  describe("opening-constrained mode", () => {
    it("should pick among available children in opening mode", () => {
      // In opening mode (not variation-constrained), at Nc6 node,
      // COT could play Bc4 or Bb5
      const model = new PlayModel(opening, undefined, "w");
      model.handleUserMove("e2" as Square, "e4" as Square); // e4, COT: e5
      model.handleUserMove("g1" as Square, "f3" as Square); // Nf3, COT: Nc6
      // White's turn. Both Bc4 and Bb5 should be book moves
      const resultBc4 = new PlayModel(opening, undefined, "w");
      resultBc4.handleUserMove("e2" as Square, "e4" as Square);
      resultBc4.handleUserMove("g1" as Square, "f3" as Square);
      resultBc4.handleUserMove("f1" as Square, "c4" as Square);
      expect(resultBc4.lastMoveAssessment).toBe("book");

      const resultBb5 = new PlayModel(opening, undefined, "w");
      resultBb5.handleUserMove("e2" as Square, "e4" as Square);
      resultBb5.handleUserMove("g1" as Square, "f3" as Square);
      resultBb5.handleUserMove("f1" as Square, "b5" as Square);
      expect(resultBb5.lastMoveAssessment).toBe("book");
    });
  });

  describe("unconstrained mode", () => {
    it("should allow any move in unconstrained mode", () => {
      const model = new PlayModel(undefined, undefined, "w");
      const result = model.handleUserMove("e2" as Square, "e4" as Square);
      expect(result).toBe(true);
      // No COT response in unconstrained mode (no opening tree)
      expect(model.chessGame.moveHistory.length).toBe(1);
    });

    it("should have no assessment in unconstrained mode", () => {
      const model = new PlayModel(undefined, undefined, "w");
      model.handleUserMove("e2" as Square, "e4" as Square);
      expect(model.lastMoveAssessment).toBeNull();
    });
  });
});
