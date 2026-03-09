import { describe, it, expect, beforeEach } from "vitest";
import { MemorizeModel } from "../MemorizeModel";

import { ReviewSessionModel } from "../ReviewSessionModel";
import type { Opening } from "../../types/OpeningTypes";
import type { Card } from "../../types/CardTypes";
import { createCard } from "../SM2Algorithm";

/**
 * Create a simple opening fixture.
 * Line: 1. e4 e5 2. Nf3 Nc6 3. Bc4
 * White moves: e4, Nf3, Bc4
 * Black moves: e5, Nc6
 */
function makeOpening(): Opening {
  return {
    id: "italian-game",
    name: "Italian Game",
    eco: "C50",
    variations: [
      {
        id: "main-line",
        name: "Main Line",
        pgn: "1. e4 e5 2. Nf3 Nc6 3. Bc4",
        moves: {
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
      },
    ],
  };
}

/** Create test cards for white player */
function makeTestCards(): Card[] {
  // Card for move e4 from starting position
  const card1 = createCard({
    positionFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    correctMoves: ["e4"],
    openingId: "italian-game",
    variationId: "main-line",
    moveNumber: 0,
  });

  // Card for move Nf3 after 1. e4 e5
  const card2 = createCard({
    positionFen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    correctMoves: ["Nf3"],
    openingId: "italian-game",
    variationId: "main-line",
    moveNumber: 2,
  });

  // Card for move Bc4 after 1. e4 e5 2. Nf3 Nc6
  const card3 = createCard({
    positionFen:
      "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    correctMoves: ["Bc4"],
    openingId: "italian-game",
    variationId: "main-line",
    moveNumber: 4,
  });

  return [card1, card2, card3];
}

describe("MemorizeModel", () => {
  let model: MemorizeModel;
  let cards: Card[];

  beforeEach(() => {
    cards = makeTestCards();
    const session = new ReviewSessionModel(cards);
    model = new MemorizeModel(session, "w", makeOpening());
  });

  describe("initial state", () => {
    it("should have the starting position loaded", () => {
      expect(model.chessGame.position).toBeDefined();
    });

    it("should have playerColor set", () => {
      expect(model.playerColor).toBe("w");
    });

    it("should not have used hint", () => {
      expect(model.hintUsed).toBe(false);
    });

    it("should have lastMoveCorrect as null initially", () => {
      expect(model.lastMoveCorrect).toBeNull();
    });

    it("should not be showing correct move", () => {
      expect(model.showingCorrectMove).toBe(false);
    });

    it("should have an empty feedback message", () => {
      expect(model.feedbackMessage).toBe("");
    });
  });

  describe("currentCard", () => {
    it("should return the current card from the session", () => {
      expect(model.currentCard).toBeDefined();
    });
  });

  describe("sessionProgress", () => {
    it("should show progress from the session", () => {
      const progress = model.sessionProgress;
      expect(progress.done).toBe(0);
      expect(progress.total).toBe(3);
    });
  });

  describe("attemptMove — correct move", () => {
    it("should set lastMoveCorrect to true for the right move", () => {
      // The first card expects "e4", which is e2->e4
      model.attemptMove("e2", "e4");
      expect(model.lastMoveCorrect).toBe(true);
    });

    it("should set feedbackMessage on correct move", () => {
      model.attemptMove("e2", "e4");
      expect(model.feedbackMessage).toContain("Correct");
    });

    it("should grade as 5 (perfect) when no hint was used", () => {
      model.attemptMove("e2", "e4");
      // After correct move, the session should have recorded grade 5
      expect(model.session.results.get(cards[0]!.id)).toBe(5);
    });
  });

  describe("attemptMove — wrong move", () => {
    it("should set lastMoveCorrect to false for a wrong move", () => {
      model.attemptMove("d2", "d4");
      expect(model.lastMoveCorrect).toBe(false);
    });

    it("should show the correct move after a wrong attempt", () => {
      model.attemptMove("d2", "d4");
      expect(model.showingCorrectMove).toBe(true);
      expect(model.feedbackMessage).toContain("e4");
    });

    it("should grade as 0 (failed) on wrong move", () => {
      model.attemptMove("d2", "d4");
      expect(model.session.results.get(cards[0]!.id)).toBe(0);
    });
  });

  describe("hint usage", () => {
    it("should set hintUsed flag", () => {
      model.useHint();
      expect(model.hintUsed).toBe(true);
    });

    it("should set hintSquare to the piece that should move", () => {
      model.useHint();
      // For e4, the piece is on e2
      expect(model.hintSquare).toBe("e2");
    });

    it("should downgrade grade to 3 when hint was used", () => {
      model.useHint();
      model.attemptMove("e2", "e4");
      expect(model.session.results.get(cards[0]!.id)).toBe(3);
    });
  });

  describe("nextCard", () => {
    it("should advance to the next card and reset state", () => {
      model.attemptMove("e2", "e4");
      model.nextCard();
      expect(model.lastMoveCorrect).toBeNull();
      expect(model.hintUsed).toBe(false);
      expect(model.showingCorrectMove).toBe(false);
      expect(model.feedbackMessage).toBe("");
    });

    it("should load the new card's position", () => {
      model.attemptMove("e2", "e4");
      model.nextCard();
      // Second card position should be loaded
      const secondCard = model.currentCard;
      expect(secondCard).toBeDefined();
    });
  });

  describe("session completion", () => {
    it("should report isSessionComplete when all cards are graded", () => {
      // Grade all 3 cards
      model.attemptMove("e2", "e4"); // correct
      model.nextCard();
      model.attemptMove("g1", "f3"); // correct (Nf3)
      model.nextCard();
      model.attemptMove("f1", "c4"); // correct (Bc4)
      model.nextCard();
      expect(model.isSessionComplete).toBe(true);
    });
  });

  describe("autoPlayOpponentMove", () => {
    it("should play the opponent's response automatically", () => {
      // After correct e4, opponent should play e5
      model.attemptMove("e2", "e4");
      model.nextCard();
      // The model should have auto-played opponent's move(s) to reach
      // the next card's position
      expect(model.currentCard).toBeDefined();
    });
  });

  describe("retryMove", () => {
    it("should allow retry after a wrong move", () => {
      model.attemptMove("d2", "d4"); // wrong move
      expect(model.lastMoveCorrect).toBe(false);
      expect(model.canRetry).toBe(true);
      model.retryMove();
      expect(model.lastMoveCorrect).toBeNull();
      expect(model.feedbackMessage).toBe("");
      expect(model.showingCorrectMove).toBe(false);
    });

    it("should not allow retry after a correct move", () => {
      model.attemptMove("e2", "e4"); // correct
      expect(model.canRetry).toBe(false);
    });

    it("should not allow retry before any move", () => {
      expect(model.canRetry).toBe(false);
    });

    it("should allow making the correct move after retry", () => {
      model.attemptMove("d2", "d4"); // wrong
      model.retryMove();
      model.attemptMove("e2", "e4"); // correct
      expect(model.lastMoveCorrect).toBe(true);
    });

    it("should re-grade the card on retry with correct answer", () => {
      model.attemptMove("d2", "d4"); // wrong, graded 0
      expect(model.session.results.get(cards[0]!.id)).toBe(0);
      model.retryMove();
      model.attemptMove("e2", "e4"); // correct
      // Grade should be updated (3 since it was a retry)
      expect(model.session.results.get(cards[0]!.id)).toBe(3);
    });

    it("should reset hint state on retry", () => {
      model.useHint();
      model.attemptMove("d2", "d4"); // wrong
      model.retryMove();
      expect(model.hintSquare).toBeNull();
    });
  });
});
