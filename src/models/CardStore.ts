import { makeAutoObservable } from "mobx";
import type { Card, CardGrade } from "../types/CardTypes";
import type { Color } from "../types/ChessTypes";
import type { MoveNode, Opening } from "../types/OpeningTypes";
import { createCard, gradeCard } from "./SM2Algorithm";

/** Progress info for an opening */
type OpeningProgress = {
  total: number;
  mastered: number;
  due: number;
  struggling: number;
};

/**
 * In-memory store for spaced-repetition cards.
 * MobX observable — will be backed by IndexedDB later.
 */
export class CardStore {
  private cards: Map<string, Card> = new Map();
  /** Track which variations already have cards to prevent duplicates */
  private createdVariations: Set<string> = new Set();

  constructor() {
    makeAutoObservable(this);
  }

  /**
   * Create cards for every user-turn position in a variation.
   * Walks the move tree and creates a card for each position where the
   * player (given by `color`) is the one to move.
   */
  createCardsForVariation(
    opening: Opening,
    variationId: string,
    color: Color,
  ): void {
    const variationKey = `${opening.id}-${variationId}-${color}`;
    if (this.createdVariations.has(variationKey)) {
      return;
    }

    const variation = opening.variations.find((v) => v.id === variationId);
    if (!variation) {
      return;
    }

    this.walkTree(variation.moves, opening.id, variationId, color, 0, null);
    this.createdVariations.add(variationKey);
  }

  /**
   * Walk the move tree recursively, creating cards for user-turn positions.
   * A card is created at the *parent* position (before the move) when the
   * move belongs to the user's color.
   */
  private walkTree(
    node: MoveNode,
    openingId: string,
    variationId: string,
    color: Color,
    depth: number,
    parentFen: string | null,
  ): void {
    // Determine whose move this is based on depth:
    // depth 0 = white's first move, depth 1 = black's first move, etc.
    const moveColor: Color = depth % 2 === 0 ? "w" : "b";

    if (moveColor === color && parentFen !== null) {
      // Create a card: the position is the parent FEN (before this move)
      // The correct move is this node's move
      const card = createCard({
        positionFen: parentFen,
        correctMoves: [node.move],
        openingId,
        variationId,
        moveNumber: depth,
      });
      this.cards.set(card.id, card);
    } else if (moveColor === color && parentFen === null) {
      // First move in the tree and it's the user's color
      // Use the starting position FEN
      const startFen =
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      const card = createCard({
        positionFen: startFen,
        correctMoves: [node.move],
        openingId,
        variationId,
        moveNumber: depth,
      });
      this.cards.set(card.id, card);
    }

    // Recurse into children
    for (const child of node.children) {
      this.walkTree(child, openingId, variationId, color, depth + 1, node.fen);
    }
  }

  /** Get all cards (for testing convenience) */
  getAllCards(): Card[] {
    return Array.from(this.cards.values());
  }

  /** Get cards that are due for review today */
  getCardsDueToday(): Card[] {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return this.getAllCards().filter((card) => card.nextReviewDate <= today);
  }

  /** Get the count of cards due today */
  getDueCount(): number {
    return this.getCardsDueToday().length;
  }

  /** Grade a card using the SM-2 algorithm */
  gradeCard(cardId: string, quality: CardGrade): void {
    const card = this.cards.get(cardId);
    if (!card) {
      return;
    }
    const updated = gradeCard(card, quality);
    this.cards.set(cardId, updated);
  }

  /** Get progress stats for an opening */
  getProgressByOpening(openingId: string): OpeningProgress {
    const openingCards = this.getAllCards().filter(
      (c) => c.openingId === openingId,
    );

    if (openingCards.length === 0) {
      return { total: 0, mastered: 0, due: 0, struggling: 0 };
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return {
      total: openingCards.length,
      mastered: openingCards.filter((c) => c.repetitionCount >= 3).length,
      due: openingCards.filter((c) => c.nextReviewDate <= today).length,
      struggling: openingCards.filter((c) => c.easinessFactor < 2.0).length,
    };
  }

  /** Get a card by id */
  getCard(id: string): Card | undefined {
    return this.cards.get(id);
  }
}
