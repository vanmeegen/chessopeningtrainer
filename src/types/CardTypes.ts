/** SM-2 grade: 0 = blackout/wrong, 3 = correct with difficulty, 5 = perfect */
export type CardGrade = 0 | 3 | 5;

/** A spaced repetition card for a single position */
export type Card = {
  id: string;
  positionFen: string;
  correctMoves: string[]; // SAN notation
  openingId: string;
  variationId: string;
  moveNumber: number;
  easinessFactor: number;
  repetitionCount: number;
  interval: number; // days
  nextReviewDate: Date;
  lastReviewDate: Date | null;
  totalReviews: number;
  totalCorrect: number;
};

/** An active review session */
export type ReviewSession = {
  cards: Card[];
  currentIndex: number;
  results: Map<string, CardGrade>; // cardId -> grade
};

/** Summary displayed at the end of a review session */
export type SessionSummary = {
  totalCards: number;
  correct: number;
  incorrect: number;
  nextReviewDates: Map<string, Date>; // cardId -> next review date
};
