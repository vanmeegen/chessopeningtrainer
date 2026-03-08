import { makeAutoObservable } from "mobx";
import type { Card, CardGrade, SessionSummary } from "../types/CardTypes";
import { gradeCard } from "./SM2Algorithm";

/** Progress through a review session */
type SessionProgress = {
  done: number;
  total: number;
};

/**
 * MobX observable model for a review session.
 * Manages a queue of due cards, grading, and session summary.
 */
export class ReviewSessionModel {
  cards: Card[];
  currentIndex: number = 0;
  results: Map<string, CardGrade> = new Map();

  constructor(cards: Card[]) {
    // Sort most overdue first (earliest nextReviewDate first)
    this.cards = [...cards].sort(
      (a, b) => a.nextReviewDate.getTime() - b.nextReviewDate.getTime(),
    );
    makeAutoObservable(this);
  }

  /** Whether all cards have been graded */
  get isComplete(): boolean {
    return this.currentIndex >= this.cards.length;
  }

  /** The current card to review, or undefined if session is complete */
  get currentCard(): Card | undefined {
    if (this.isComplete) {
      return undefined;
    }
    return this.cards[this.currentIndex];
  }

  /** Progress through the session */
  get progress(): SessionProgress {
    return {
      done: this.currentIndex,
      total: this.cards.length,
    };
  }

  /** Session summary with correct/incorrect counts and next review dates */
  get summary(): SessionSummary {
    let correct = 0;
    let incorrect = 0;
    const nextReviewDates = new Map<string, Date>();

    for (const [cardId, grade] of this.results) {
      if (grade >= 3) {
        correct++;
      } else {
        incorrect++;
      }
      // Find the card and compute next review date
      const card = this.cards.find((c) => c.id === cardId);
      if (card) {
        const updated = gradeCard(card, grade);
        nextReviewDates.set(cardId, updated.nextReviewDate);
      }
    }

    return {
      totalCards: this.cards.length,
      correct,
      incorrect,
      nextReviewDates,
    };
  }

  /** Grade the current card and advance to the next */
  gradeCurrentCard(quality: CardGrade): void {
    if (this.isComplete) {
      return;
    }
    const card = this.cards[this.currentIndex]!;
    this.results.set(card.id, quality);
    this.currentIndex++;
  }

  /** Restart session with only the failed cards */
  restart(): void {
    const failedCards = this.cards.filter((card) => {
      const grade = this.results.get(card.id);
      return grade !== undefined && grade < 3;
    });
    this.cards = failedCards;
    this.currentIndex = 0;
    this.results = new Map();
  }
}
