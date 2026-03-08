import { describe, it, expect, beforeEach } from "vitest";
import { ChessGameModel } from "../ChessGameModel";

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("ChessGameModel", () => {
  let model: ChessGameModel;

  beforeEach(() => {
    model = new ChessGameModel();
  });

  describe("initial state", () => {
    it("should have the standard initial position", () => {
      expect(model.position).toBe(INITIAL_FEN);
    });

    it("should be white's turn", () => {
      expect(model.turn).toBe("w");
    });

    it("should have an empty move history", () => {
      expect(model.moveHistory).toHaveLength(0);
    });

    it("should not be in check, checkmate, stalemate, or draw", () => {
      expect(model.isCheck).toBe(false);
      expect(model.isCheckmate).toBe(false);
      expect(model.isStalemate).toBe(false);
      expect(model.isDraw).toBe(false);
    });
  });

  describe("legalMoves", () => {
    it("should return legal moves for a square with a piece", () => {
      const moves = model.legalMoves("e2");
      expect(moves).toContain("e3");
      expect(moves).toContain("e4");
      expect(moves).toHaveLength(2);
    });

    it("should return an empty array for an empty square", () => {
      const moves = model.legalMoves("e4");
      expect(moves).toHaveLength(0);
    });

    it("should return an empty array for opponent's piece", () => {
      const moves = model.legalMoves("e7");
      expect(moves).toHaveLength(0);
    });

    it("should return legal knight moves", () => {
      const moves = model.legalMoves("b1");
      expect(moves).toContain("a3");
      expect(moves).toContain("c3");
      expect(moves).toHaveLength(2);
    });
  });

  describe("makeMove", () => {
    it("should make a valid move and update the position", () => {
      const result = model.makeMove("e2", "e4");
      expect(result.success).toBe(true);
      expect(result.move).toBeDefined();
      expect(result.move?.san).toBe("e4");
      expect(result.move?.from).toBe("e2");
      expect(result.move?.to).toBe("e4");
    });

    it("should alternate turns after a move", () => {
      model.makeMove("e2", "e4");
      expect(model.turn).toBe("b");
      model.makeMove("e7", "e5");
      expect(model.turn).toBe("w");
    });

    it("should update the FEN after a move", () => {
      model.makeMove("e2", "e4");
      expect(model.position).not.toBe(INITIAL_FEN);
      expect(model.position).toContain("b"); // black to move
    });

    it("should fail gracefully for an invalid move", () => {
      const result = model.makeMove("e2", "e5");
      expect(result.success).toBe(false);
      expect(result.move).toBeUndefined();
      expect(model.position).toBe(INITIAL_FEN);
    });

    it("should track move history", () => {
      model.makeMove("e2", "e4");
      model.makeMove("e7", "e5");
      model.makeMove("g1", "f3");
      expect(model.moveHistory).toHaveLength(3);
      expect(model.moveHistory[0]?.san).toBe("e4");
      expect(model.moveHistory[1]?.san).toBe("e5");
      expect(model.moveHistory[2]?.san).toBe("Nf3");
    });

    it("should handle promotion", () => {
      // Set up a position where promotion is possible
      model.loadFen("8/P7/8/8/8/8/8/4K2k w - - 0 1");
      const result = model.makeMove("a7", "a8", "q");
      expect(result.success).toBe(true);
      expect(result.move?.promotion).toBe("q");
    });

    it("should handle captures", () => {
      model.makeMove("e2", "e4");
      model.makeMove("d7", "d5");
      const result = model.makeMove("e4", "d5");
      expect(result.success).toBe(true);
      expect(result.move?.captured).toBe("p");
    });
  });

  describe("undoMove", () => {
    it("should restore the previous position", () => {
      model.makeMove("e2", "e4");
      const fenAfterE4 = model.position;
      model.makeMove("e7", "e5");
      model.undoMove();
      expect(model.position).toBe(fenAfterE4);
    });

    it("should restore the turn", () => {
      model.makeMove("e2", "e4");
      model.undoMove();
      expect(model.turn).toBe("w");
    });

    it("should remove the last move from history", () => {
      model.makeMove("e2", "e4");
      model.makeMove("e7", "e5");
      model.undoMove();
      expect(model.moveHistory).toHaveLength(1);
      expect(model.moveHistory[0]?.san).toBe("e4");
    });

    it("should do nothing when there are no moves to undo", () => {
      model.undoMove();
      expect(model.position).toBe(INITIAL_FEN);
      expect(model.moveHistory).toHaveLength(0);
    });
  });

  describe("reset", () => {
    it("should return to the initial position", () => {
      model.makeMove("e2", "e4");
      model.makeMove("e7", "e5");
      model.reset();
      expect(model.position).toBe(INITIAL_FEN);
      expect(model.turn).toBe("w");
      expect(model.moveHistory).toHaveLength(0);
    });
  });

  describe("loadFen", () => {
    it("should set a custom position", () => {
      const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
      model.loadFen(fen);
      expect(model.position).toBe(fen);
      expect(model.turn).toBe("b");
    });

    it("should clear move history when loading a FEN", () => {
      model.makeMove("e2", "e4");
      model.loadFen(
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      );
      expect(model.moveHistory).toHaveLength(0);
    });
  });

  describe("loadPgn", () => {
    it("should replay a game from PGN", () => {
      const success = model.loadPgn("1. e4 e5 2. Nf3 Nc6");
      expect(success).toBe(true);
      expect(model.moveHistory).toHaveLength(4);
      expect(model.moveHistory[0]?.san).toBe("e4");
      expect(model.moveHistory[1]?.san).toBe("e5");
      expect(model.moveHistory[2]?.san).toBe("Nf3");
      expect(model.moveHistory[3]?.san).toBe("Nc6");
    });

    it("should set the correct final position", () => {
      model.loadPgn("1. e4 e5 2. Nf3 Nc6");
      expect(model.turn).toBe("w");
      // Position after 1.e4 e5 2.Nf3 Nc6
      expect(model.position).toContain("r1bqkbnr");
    });

    it("should return false for invalid PGN", () => {
      const success = model.loadPgn("1. z9 invalid");
      expect(success).toBe(false);
    });
  });

  describe("check and checkmate detection", () => {
    it("should detect check", () => {
      // Scholar's mate setup: position where king is in check
      model.loadFen(
        "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2",
      );
      model.makeMove("d8", "h4");
      expect(model.isCheck).toBe(true);
    });

    it("should detect checkmate", () => {
      // Fool's mate: 1.f3 e5 2.g4 Qh4#
      model.loadPgn("1. f3 e5 2. g4 Qh4#");
      expect(model.isCheckmate).toBe(true);
      expect(model.isCheck).toBe(true);
    });

    it("should detect stalemate", () => {
      // A known stalemate position
      model.loadFen("k7/8/1K6/8/8/8/8/8 b - - 0 1");
      // Black king has no legal moves but is not in check => stalemate
      // Actually need a real stalemate. Let me use a proper one.
      model.loadFen("5k2/5P2/5K2/8/8/8/8/8 b - - 0 1");
      expect(model.isStalemate).toBe(true);
    });

    it("should detect draw by insufficient material", () => {
      // King vs King
      model.loadFen("4k3/8/8/8/8/8/8/4K3 w - - 0 1");
      expect(model.isDraw).toBe(true);
    });
  });

  describe("move history tracking", () => {
    it("should preserve move details in history", () => {
      model.makeMove("e2", "e4");
      const move = model.moveHistory[0];
      expect(move).toBeDefined();
      expect(move?.piece).toBe("p");
      expect(move?.color).toBe("w");
      expect(move?.from).toBe("e2");
      expect(move?.to).toBe("e4");
    });
  });

  describe("game state", () => {
    it("should return a complete game state", () => {
      model.makeMove("e2", "e4");
      const state = model.gameState;
      expect(state.fen).toBe(model.position);
      expect(state.turn).toBe("b");
      expect(state.moveHistory).toHaveLength(1);
      expect(state.status.isCheck).toBe(false);
      expect(state.status.isCheckmate).toBe(false);
      expect(state.status.isStalemate).toBe(false);
      expect(state.status.isDraw).toBe(false);
    });
  });
});
