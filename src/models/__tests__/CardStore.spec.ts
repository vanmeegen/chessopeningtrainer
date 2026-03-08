import { describe, it, expect, beforeEach } from "vitest";
import { CardStore } from "../CardStore";
import type { Opening } from "../../types/OpeningTypes";

/** Minimal opening fixture for testing */
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

describe("CardStore", () => {
  let store: CardStore;
  let opening: Opening;

  beforeEach(() => {
    store = new CardStore();
    opening = makeOpening();
  });

  describe("createCardsForVariation", () => {
    it("should generate cards only for user-turn positions (white)", () => {
      store.createCardsForVariation(opening, "main-line", "w");
      // Line: e4(w) e5(b) Nf3(w) Nc6(b) Bc4(w)
      // White moves at positions: e4 (move 1), Nf3 (move 3), Bc4 (move 5)
      // Cards are for user-turn positions, so white's moves
      const cards = store.getAllCards();
      expect(cards.length).toBe(3);
      // All cards should belong to the opening
      for (const card of cards) {
        expect(card.openingId).toBe("italian-game");
        expect(card.variationId).toBe("main-line");
      }
    });

    it("should generate cards only for user-turn positions (black)", () => {
      store.createCardsForVariation(opening, "main-line", "b");
      // Black moves: e5 (move 2), Nc6 (move 4)
      const cards = store.getAllCards();
      expect(cards.length).toBe(2);
    });

    it("should store correct FEN and correct moves for each card", () => {
      store.createCardsForVariation(opening, "main-line", "w");
      const cards = store.getAllCards();
      // First white move is e4 from the starting position
      const firstCard = cards.find((c) => c.moveNumber === 0);
      expect(firstCard).toBeDefined();
      expect(firstCard!.correctMoves).toContain("e4");
    });

    it("should not create duplicate cards for the same variation", () => {
      store.createCardsForVariation(opening, "main-line", "w");
      store.createCardsForVariation(opening, "main-line", "w");
      const cards = store.getAllCards();
      expect(cards.length).toBe(3); // Still 3, not 6
    });
  });

  describe("getCardsDueToday", () => {
    it("should return cards with nextReviewDate <= today", () => {
      store.createCardsForVariation(opening, "main-line", "w");
      const due = store.getCardsDueToday();
      // All new cards have nextReviewDate = today, so all are due
      expect(due.length).toBe(3);
    });

    it("should not return cards scheduled for the future", () => {
      store.createCardsForVariation(opening, "main-line", "w");
      // Grade all cards to push their review date into the future
      const cards = store.getAllCards();
      for (const card of cards) {
        store.gradeCard(card.id, 5); // interval=1, nextReview=tomorrow
      }
      // After grading with 5, nextReview = today + 1 day = tomorrow
      const due = store.getCardsDueToday();
      expect(due.length).toBe(0);
    });
  });

  describe("getDueCount", () => {
    it("should return the count of due cards", () => {
      store.createCardsForVariation(opening, "main-line", "w");
      expect(store.getDueCount()).toBe(3);
    });
  });

  describe("gradeCard", () => {
    it("should update card with SM-2 results", () => {
      store.createCardsForVariation(opening, "main-line", "w");
      const cards = store.getAllCards();
      const cardId = cards[0]!.id;
      store.gradeCard(cardId, 5);
      const updated = store.getCard(cardId);
      expect(updated).toBeDefined();
      expect(updated!.repetitionCount).toBe(1);
      expect(updated!.totalReviews).toBe(1);
    });

    it("should do nothing for non-existent card id", () => {
      expect(() => store.gradeCard("non-existent", 5)).not.toThrow();
    });
  });

  describe("getProgressByOpening", () => {
    it("should return correct counts", () => {
      store.createCardsForVariation(opening, "main-line", "w");
      const progress = store.getProgressByOpening("italian-game");
      expect(progress.total).toBe(3);
      expect(progress.mastered).toBe(0);
      expect(progress.due).toBe(3);
      expect(progress.struggling).toBe(0);
    });

    it("should count mastered cards (repetitionCount >= 3)", () => {
      store.createCardsForVariation(opening, "main-line", "w");
      const cards = store.getAllCards();
      const cardId = cards[0]!.id;
      // Grade 3 times to reach rep=3
      store.gradeCard(cardId, 5);
      store.gradeCard(cardId, 5);
      store.gradeCard(cardId, 5);
      const progress = store.getProgressByOpening("italian-game");
      expect(progress.mastered).toBe(1);
    });

    it("should count struggling cards (EF < 2.0)", () => {
      store.createCardsForVariation(opening, "main-line", "w");
      const cards = store.getAllCards();
      const cardId = cards[0]!.id;
      // Grade with 3 multiple times to lower EF below 2.0
      // EF starts at 2.5, grade 3 reduces by 0.14 each time
      // 2.5 - 0.14 = 2.36, 2.36 - 0.14 = 2.22, 2.22 - 0.14 = 2.08, 2.08 - 0.14 = 1.94
      store.gradeCard(cardId, 3);
      store.gradeCard(cardId, 3);
      store.gradeCard(cardId, 3);
      store.gradeCard(cardId, 3);
      const progress = store.getProgressByOpening("italian-game");
      expect(progress.struggling).toBe(1);
    });

    it("should return zeros for unknown opening", () => {
      const progress = store.getProgressByOpening("unknown");
      expect(progress.total).toBe(0);
      expect(progress.mastered).toBe(0);
      expect(progress.due).toBe(0);
      expect(progress.struggling).toBe(0);
    });
  });

  describe("getCard", () => {
    it("should return a card by id", () => {
      store.createCardsForVariation(opening, "main-line", "w");
      const cards = store.getAllCards();
      const card = store.getCard(cards[0]!.id);
      expect(card).toBeDefined();
      expect(card!.id).toBe(cards[0]!.id);
    });

    it("should return undefined for unknown id", () => {
      expect(store.getCard("unknown")).toBeUndefined();
    });
  });
});
