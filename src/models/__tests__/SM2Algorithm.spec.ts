import { describe, it, expect } from "vitest";
import { gradeCard, createCard } from "../SM2Algorithm";
import type { Card } from "../../types/CardTypes";

/** Helper to create a card with overrides */
function makeCard(overrides: Partial<Card> = {}): Card {
  return createCard({
    positionFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    correctMoves: ["e4"],
    openingId: "italian-game",
    variationId: "main-line",
    moveNumber: 1,
    ...overrides,
  });
}

describe("SM2Algorithm", () => {
  describe("createCard", () => {
    it("should create a card with default SM-2 values", () => {
      const card = makeCard();
      expect(card.easinessFactor).toBe(2.5);
      expect(card.repetitionCount).toBe(0);
      expect(card.interval).toBe(1);
      expect(card.totalReviews).toBe(0);
      expect(card.totalCorrect).toBe(0);
      expect(card.lastReviewDate).toBeNull();
    });

    it("should set nextReviewDate to today", () => {
      const card = makeCard();
      const today = new Date();
      expect(card.nextReviewDate.getFullYear()).toBe(today.getFullYear());
      expect(card.nextReviewDate.getMonth()).toBe(today.getMonth());
      expect(card.nextReviewDate.getDate()).toBe(today.getDate());
    });

    it("should generate a unique id", () => {
      const card1 = makeCard();
      const card2 = makeCard({ moveNumber: 2 });
      expect(card1.id).toBeTruthy();
      expect(card2.id).toBeTruthy();
      expect(card1.id).not.toBe(card2.id);
    });
  });

  describe("gradeCard — grade 5 (perfect)", () => {
    it("should increase EF on perfect recall", () => {
      const card = makeCard();
      const updated = gradeCard(card, 5);
      // EF' = EF + (0.1 - (5-q)*(0.08+(5-q)*0.02)) where q=5
      // EF' = 2.5 + (0.1 - 0) = 2.6
      expect(updated.easinessFactor).toBeCloseTo(2.6, 2);
    });

    it("should set interval to 1 on first review (n=0)", () => {
      const card = makeCard();
      const updated = gradeCard(card, 5);
      expect(updated.interval).toBe(1);
      expect(updated.repetitionCount).toBe(1);
    });

    it("should set interval to 6 on second review (n=1)", () => {
      const card = makeCard();
      const after1 = gradeCard(card, 5);
      const after2 = gradeCard(after1, 5);
      expect(after2.interval).toBe(6);
      expect(after2.repetitionCount).toBe(2);
    });

    it("should compute interval = round(prev * EF) on third+ review", () => {
      const card = makeCard();
      const after1 = gradeCard(card, 5); // interval=1, rep=1, EF=2.6
      const after2 = gradeCard(after1, 5); // interval=6, rep=2, EF=2.7
      const after3 = gradeCard(after2, 5); // EF updated to 2.8 first, then interval=round(6 * 2.8)=17
      expect(after3.easinessFactor).toBeCloseTo(2.8, 2);
      expect(after3.interval).toBe(Math.round(6 * 2.8));
      expect(after3.repetitionCount).toBe(3);
    });

    it("should grow interval over multiple perfect reviews", () => {
      let card = makeCard();
      const intervals: number[] = [];
      for (let i = 0; i < 5; i++) {
        card = gradeCard(card, 5);
        intervals.push(card.interval);
      }
      // Each interval should be >= previous
      for (let i = 1; i < intervals.length; i++) {
        expect(intervals[i]!).toBeGreaterThanOrEqual(intervals[i - 1]!);
      }
    });

    it("should increment totalReviews and totalCorrect", () => {
      const card = makeCard();
      const updated = gradeCard(card, 5);
      expect(updated.totalReviews).toBe(1);
      expect(updated.totalCorrect).toBe(1);
    });
  });

  describe("gradeCard — grade 3 (difficult but correct)", () => {
    it("should decrease EF slightly", () => {
      const card = makeCard();
      const updated = gradeCard(card, 3);
      // EF' = 2.5 + (0.1 - (5-3)*(0.08+(5-3)*0.02))
      // EF' = 2.5 + (0.1 - 2*(0.08+2*0.02))
      // EF' = 2.5 + (0.1 - 2*0.12) = 2.5 + (0.1 - 0.24) = 2.5 - 0.14 = 2.36
      expect(updated.easinessFactor).toBeCloseTo(2.36, 2);
    });

    it("should still grow interval (correct recall)", () => {
      const card = makeCard();
      const after1 = gradeCard(card, 3);
      expect(after1.interval).toBe(1);
      expect(after1.repetitionCount).toBe(1);

      const after2 = gradeCard(after1, 3);
      expect(after2.interval).toBe(6);
      expect(after2.repetitionCount).toBe(2);
    });

    it("should increment totalCorrect for grade 3", () => {
      const card = makeCard();
      const updated = gradeCard(card, 3);
      expect(updated.totalCorrect).toBe(1);
    });
  });

  describe("gradeCard — grade 0 (failed)", () => {
    it("should reset repetitionCount to 0", () => {
      let card = makeCard();
      card = gradeCard(card, 5); // rep=1
      card = gradeCard(card, 5); // rep=2
      const failed = gradeCard(card, 0);
      expect(failed.repetitionCount).toBe(0);
    });

    it("should reset interval to 1", () => {
      let card = makeCard();
      card = gradeCard(card, 5);
      card = gradeCard(card, 5); // interval=6
      const failed = gradeCard(card, 0);
      expect(failed.interval).toBe(1);
    });

    it("should NOT change EF on failure", () => {
      let card = makeCard();
      card = gradeCard(card, 5); // EF=2.6
      const efBefore = card.easinessFactor;
      const failed = gradeCard(card, 0);
      expect(failed.easinessFactor).toBe(efBefore);
    });

    it("should increment totalReviews but NOT totalCorrect", () => {
      const card = makeCard();
      const updated = gradeCard(card, 0);
      expect(updated.totalReviews).toBe(1);
      expect(updated.totalCorrect).toBe(0);
    });
  });

  describe("EF minimum boundary", () => {
    it("should never drop EF below 1.3", () => {
      let card = makeCard({ easinessFactor: 1.3 });
      // Grade 3 repeatedly to push EF down
      for (let i = 0; i < 10; i++) {
        card = gradeCard(card, 3);
      }
      expect(card.easinessFactor).toBeGreaterThanOrEqual(1.3);
    });

    it("should clamp EF to 1.3 when formula would go below", () => {
      // Start with a low EF that would go below 1.3 with grade 3
      const card = makeCard({ easinessFactor: 1.3 });
      const updated = gradeCard(card, 3);
      expect(updated.easinessFactor).toBe(1.3);
    });
  });

  describe("nextReviewDate", () => {
    it("should set nextReviewDate to today + interval days", () => {
      const card = makeCard();
      const updated = gradeCard(card, 5);
      const expected = new Date();
      expected.setDate(expected.getDate() + updated.interval);
      expect(updated.nextReviewDate.getFullYear()).toBe(expected.getFullYear());
      expect(updated.nextReviewDate.getMonth()).toBe(expected.getMonth());
      expect(updated.nextReviewDate.getDate()).toBe(expected.getDate());
    });

    it("should set lastReviewDate to today", () => {
      const card = makeCard();
      const updated = gradeCard(card, 5);
      const today = new Date();
      expect(updated.lastReviewDate).not.toBeNull();
      expect(updated.lastReviewDate!.getDate()).toBe(today.getDate());
    });
  });

  describe("immutability", () => {
    it("should return a new Card object, not mutate the original", () => {
      const card = makeCard();
      const updated = gradeCard(card, 5);
      expect(updated).not.toBe(card);
      expect(card.easinessFactor).toBe(2.5);
      expect(card.repetitionCount).toBe(0);
    });
  });
});
