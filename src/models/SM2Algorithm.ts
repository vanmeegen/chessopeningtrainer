import type { Card, CardGrade } from "../types/CardTypes";

/** Parameters for creating a new card */
type CreateCardParams = {
  positionFen: string;
  correctMoves: string[];
  openingId: string;
  variationId: string;
  moveNumber: number;
  easinessFactor?: number;
};

let cardCounter = 0;

/**
 * Create a new spaced-repetition card with default SM-2 values.
 * EF = 2.5, repetitionCount = 0, interval = 1, nextReviewDate = today.
 */
export function createCard(params: CreateCardParams): Card {
  cardCounter++;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return {
    id: `${params.openingId}-${params.variationId}-${params.moveNumber}-${cardCounter}`,
    positionFen: params.positionFen,
    correctMoves: params.correctMoves,
    openingId: params.openingId,
    variationId: params.variationId,
    moveNumber: params.moveNumber,
    easinessFactor: params.easinessFactor ?? 2.5,
    repetitionCount: 0,
    interval: 1,
    nextReviewDate: today,
    lastReviewDate: null,
    totalReviews: 0,
    totalCorrect: 0,
  };
}

/**
 * Apply the SM-2 algorithm to grade a card.
 * Returns a new Card with updated SM-2 fields.
 *
 * Algorithm (from PRD §5.5):
 * 1. Update EF (only if q >= 3):
 *    EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
 *    EF = max(EF', 1.3)
 * 2. If q >= 3 (correct):
 *    - n=0: interval = 1
 *    - n=1: interval = 6
 *    - n>=2: interval = round(interval * EF)
 *    - n = n + 1
 * 3. If q < 3 (incorrect):
 *    - n = 0, interval = 1, EF unchanged
 * 4. nextReviewDate = today + interval
 */
export function gradeCard(card: Card, quality: CardGrade): Card {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let ef = card.easinessFactor;
  let rep = card.repetitionCount;
  let interval = card.interval;

  if (quality >= 3) {
    // Update EF
    const diff = 5 - quality;
    ef = ef + (0.1 - diff * (0.08 + diff * 0.02));
    ef = Math.max(ef, 1.3);

    // Update interval based on repetition count
    if (rep === 0) {
      interval = 1;
    } else if (rep === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * ef);
    }

    rep = rep + 1;
  } else {
    // Failed: reset repetition count and interval, keep EF
    rep = 0;
    interval = 1;
  }

  const nextReview = new Date(today);
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    ...card,
    easinessFactor: ef,
    repetitionCount: rep,
    interval,
    nextReviewDate: nextReview,
    lastReviewDate: today,
    totalReviews: card.totalReviews + 1,
    totalCorrect: card.totalCorrect + (quality >= 3 ? 1 : 0),
  };
}
