import { describe, it, expect, beforeEach } from "vitest";
import { ReviewSessionModel } from "../ReviewSessionModel";
import { createCard } from "../SM2Algorithm";
import type { Card } from "../../types/CardTypes";

function makeCards(count: number): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < count; i++) {
    const card = createCard({
      positionFen: `fen-${i}`,
      correctMoves: [`move-${i}`],
      openingId: "test-opening",
      variationId: "main-line",
      moveNumber: i,
    });
    // Make cards with different overdue amounts for sorting test
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() - (count - i)); // more overdue first
    cards.push({ ...card, nextReviewDate: nextReview });
  }
  return cards;
}

describe("ReviewSessionModel", () => {
  let session: ReviewSessionModel;
  let cards: Card[];

  beforeEach(() => {
    cards = makeCards(3);
    session = new ReviewSessionModel(cards);
  });

  describe("initial state", () => {
    it("should have all cards", () => {
      expect(session.cards.length).toBe(3);
    });

    it("should start at index 0", () => {
      expect(session.currentIndex).toBe(0);
    });

    it("should not be complete", () => {
      expect(session.isComplete).toBe(false);
    });

    it("should sort cards most overdue first", () => {
      // Card at index 0 should be the most overdue (earliest nextReviewDate)
      for (let i = 1; i < session.cards.length; i++) {
        expect(
          session.cards[i - 1]!.nextReviewDate.getTime(),
        ).toBeLessThanOrEqual(session.cards[i]!.nextReviewDate.getTime());
      }
    });
  });

  describe("currentCard", () => {
    it("should return the card at the current index", () => {
      expect(session.currentCard).toBeDefined();
      expect(session.currentCard!.id).toBe(session.cards[0]!.id);
    });

    it("should return undefined when session is complete", () => {
      session.gradeCurrentCard(5);
      session.gradeCurrentCard(5);
      session.gradeCurrentCard(5);
      expect(session.currentCard).toBeUndefined();
    });
  });

  describe("progress", () => {
    it("should show 0/3 initially", () => {
      const progress = session.progress;
      expect(progress.done).toBe(0);
      expect(progress.total).toBe(3);
    });

    it("should update after grading", () => {
      session.gradeCurrentCard(5);
      const progress = session.progress;
      expect(progress.done).toBe(1);
      expect(progress.total).toBe(3);
    });
  });

  describe("gradeCurrentCard", () => {
    it("should record the grade and advance to next card", () => {
      const firstCardId = session.currentCard!.id;
      session.gradeCurrentCard(5);
      expect(session.results.get(firstCardId)).toBe(5);
      expect(session.currentIndex).toBe(1);
    });

    it("should mark session complete after last card", () => {
      session.gradeCurrentCard(5);
      session.gradeCurrentCard(3);
      session.gradeCurrentCard(0);
      expect(session.isComplete).toBe(true);
    });

    it("should do nothing when session is already complete", () => {
      session.gradeCurrentCard(5);
      session.gradeCurrentCard(5);
      session.gradeCurrentCard(5);
      session.gradeCurrentCard(5); // extra call
      expect(session.currentIndex).toBe(3);
    });
  });

  describe("summary", () => {
    it("should compute correct/incorrect counts", () => {
      session.gradeCurrentCard(5); // correct
      session.gradeCurrentCard(3); // correct (difficult)
      session.gradeCurrentCard(0); // incorrect

      const summary = session.summary;
      expect(summary.totalCards).toBe(3);
      expect(summary.correct).toBe(2);
      expect(summary.incorrect).toBe(1);
    });

    it("should have nextReviewDates for all graded cards", () => {
      session.gradeCurrentCard(5);
      session.gradeCurrentCard(5);
      session.gradeCurrentCard(5);

      const summary = session.summary;
      expect(summary.nextReviewDates.size).toBe(3);
    });

    it("should show 0/0 when no cards graded yet", () => {
      const summary = session.summary;
      expect(summary.totalCards).toBe(3);
      expect(summary.correct).toBe(0);
      expect(summary.incorrect).toBe(0);
    });
  });

  describe("restart", () => {
    it("should reset for re-drill of failed cards", () => {
      session.gradeCurrentCard(5);
      session.gradeCurrentCard(0); // failed
      session.gradeCurrentCard(5);

      session.restart();
      // Only failed cards should remain
      expect(session.cards.length).toBe(1);
      expect(session.currentIndex).toBe(0);
      expect(session.isComplete).toBe(false);
      expect(session.results.size).toBe(0);
    });

    it("should result in empty session if all cards were correct", () => {
      session.gradeCurrentCard(5);
      session.gradeCurrentCard(5);
      session.gradeCurrentCard(5);

      session.restart();
      expect(session.cards.length).toBe(0);
      expect(session.isComplete).toBe(true);
    });
  });

  describe("empty session", () => {
    it("should be immediately complete with no cards", () => {
      const emptySession = new ReviewSessionModel([]);
      expect(emptySession.isComplete).toBe(true);
      expect(emptySession.currentCard).toBeUndefined();
    });
  });
});
