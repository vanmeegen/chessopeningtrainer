import { makeAutoObservable } from "mobx";
import { ChessGameModel } from "./ChessGameModel";
import { ReviewSessionModel } from "./ReviewSessionModel";
import type { Card, CardGrade } from "../types/CardTypes";
import type { Color, Square } from "../types/ChessTypes";
import type { Opening, MoveNode } from "../types/OpeningTypes";

/** Progress through a review session */
type SessionProgress = {
  done: number;
  total: number;
};

/**
 * MobX observable model for Memorize mode.
 * Manages the chess board, card review, hint system, and grading.
 */
export class MemorizeModel {
  chessGame: ChessGameModel;
  session: ReviewSessionModel;
  playerColor: Color;
  hintUsed: boolean = false;
  retryUsed: boolean = false;
  lastMoveCorrect: boolean | null = null;
  showingCorrectMove: boolean = false;
  feedbackMessage: string = "";
  hintSquare: Square | null = null;

  private opening: Opening;

  constructor(
    session: ReviewSessionModel,
    playerColor: Color,
    opening: Opening,
  ) {
    this.session = session;
    this.playerColor = playerColor;
    this.opening = opening;
    this.chessGame = new ChessGameModel();
    makeAutoObservable(this);

    // Load the first card's position
    this.loadCurrentCardPosition();
  }

  /** The current card being reviewed */
  get currentCard(): Card | undefined {
    return this.session.currentCard;
  }

  /** Session progress */
  get sessionProgress(): SessionProgress {
    return this.session.progress;
  }

  /** Whether the session is complete */
  get isSessionComplete(): boolean {
    return this.session.isComplete;
  }

  /** Whether the user can retry after a wrong move */
  get canRetry(): boolean {
    return this.lastMoveCorrect === false;
  }

  /**
   * Attempt a move on the board.
   * Checks if it matches the correct move(s) on the current card.
   */
  attemptMove(from: Square, to: Square): void {
    const card = this.currentCard;
    if (!card) return;

    // Try making the move to get the SAN notation
    const result = this.chessGame.makeMove(from, to);
    if (!result.success || !result.move) {
      // Illegal move — ignore
      return;
    }

    const moveSan = result.move.san;
    const isCorrect = card.correctMoves.includes(moveSan);

    if (isCorrect) {
      this.lastMoveCorrect = true;
      this.feedbackMessage = "Correct!";
      const grade: CardGrade = this.hintUsed || this.retryUsed ? 3 : 5;
      this.session.gradeCurrentCard(grade);
    } else {
      // Wrong move — undo it and show the correct move
      this.chessGame.undoMove();
      this.lastMoveCorrect = false;
      this.showingCorrectMove = true;
      this.feedbackMessage = `Incorrect. The correct move is ${card.correctMoves[0]}.`;
      this.session.gradeCurrentCard(0);
    }
  }

  /**
   * Retry the current card after a wrong move.
   * Resets the state so the user can try again.
   */
  retryMove(): void {
    if (!this.canRetry) return;
    this.retryUsed = true;
    this.lastMoveCorrect = null;
    this.showingCorrectMove = false;
    this.feedbackMessage = "";
    this.hintSquare = null;
    // gradeCurrentCard already advanced the index, go back
    this.session.currentIndex--;
  }

  /**
   * Use hint: highlight which piece to move.
   * Determines the source square from the correct move's SAN and current position.
   */
  useHint(): void {
    this.hintUsed = true;
    const card = this.currentCard;
    if (!card) return;

    // Find the source square of the correct move
    const correctSan = card.correctMoves[0];
    if (!correctSan) return;

    // Use a temporary chess game to find the move details
    const tempGame = new ChessGameModel();
    tempGame.loadFen(card.positionFen);

    // Get all legal moves and find the one matching our SAN
    const squares: Square[] = [
      "a1",
      "a2",
      "a3",
      "a4",
      "a5",
      "a6",
      "a7",
      "a8",
      "b1",
      "b2",
      "b3",
      "b4",
      "b5",
      "b6",
      "b7",
      "b8",
      "c1",
      "c2",
      "c3",
      "c4",
      "c5",
      "c6",
      "c7",
      "c8",
      "d1",
      "d2",
      "d3",
      "d4",
      "d5",
      "d6",
      "d7",
      "d8",
      "e1",
      "e2",
      "e3",
      "e4",
      "e5",
      "e6",
      "e7",
      "e8",
      "f1",
      "f2",
      "f3",
      "f4",
      "f5",
      "f6",
      "f7",
      "f8",
      "g1",
      "g2",
      "g3",
      "g4",
      "g5",
      "g6",
      "g7",
      "g8",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "h7",
      "h8",
    ];

    for (const sq of squares) {
      const destinations = tempGame.legalMoves(sq);
      for (const dest of destinations) {
        const testResult = tempGame.makeMove(sq, dest);
        if (testResult.success && testResult.move?.san === correctSan) {
          this.hintSquare = sq;
          tempGame.undoMove();
          return;
        }
        if (testResult.success) {
          tempGame.undoMove();
        }
      }
    }
  }

  /** Advance to the next card after feedback, resetting state */
  nextCard(): void {
    this.lastMoveCorrect = null;
    this.hintUsed = false;
    this.retryUsed = false;
    this.showingCorrectMove = false;
    this.feedbackMessage = "";
    this.hintSquare = null;
    this.loadCurrentCardPosition();
  }

  /** Auto-play opponent moves to reach the current card's position */
  autoPlayOpponentMove(): void {
    const card = this.currentCard;
    if (!card) return;

    // Find the opponent's move from the opening tree
    const variation = this.opening.variations.find(
      (v) => v.id === card.variationId,
    );
    if (!variation) return;

    // Walk the tree to find the move after the current position
    const opponentMove = this.findNextMoveInTree(
      variation.moves,
      this.chessGame.position,
    );

    if (opponentMove) {
      // Play the opponent's move
      const tempGame = new ChessGameModel();
      tempGame.loadFen(this.chessGame.position);
      const allSquares: Square[] = [
        "a1",
        "a2",
        "a3",
        "a4",
        "a5",
        "a6",
        "a7",
        "a8",
        "b1",
        "b2",
        "b3",
        "b4",
        "b5",
        "b6",
        "b7",
        "b8",
        "c1",
        "c2",
        "c3",
        "c4",
        "c5",
        "c6",
        "c7",
        "c8",
        "d1",
        "d2",
        "d3",
        "d4",
        "d5",
        "d6",
        "d7",
        "d8",
        "e1",
        "e2",
        "e3",
        "e4",
        "e5",
        "e6",
        "e7",
        "e8",
        "f1",
        "f2",
        "f3",
        "f4",
        "f5",
        "f6",
        "f7",
        "f8",
        "g1",
        "g2",
        "g3",
        "g4",
        "g5",
        "g6",
        "g7",
        "g8",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "h7",
        "h8",
      ];

      for (const sq of allSquares) {
        const destinations = tempGame.legalMoves(sq);
        for (const dest of destinations) {
          const testResult = tempGame.makeMove(sq, dest);
          if (testResult.success && testResult.move?.san === opponentMove) {
            // Found the move — play it on the real board
            this.chessGame.makeMove(sq, dest);
            return;
          }
          if (testResult.success) {
            tempGame.undoMove();
          }
        }
      }
    }
  }

  /** Load the current card's position onto the chess board */
  private loadCurrentCardPosition(): void {
    const card = this.currentCard;
    if (!card) return;
    this.chessGame.loadFen(card.positionFen);
  }

  /** Find the next move in the opening tree after a given FEN */
  private findNextMoveInTree(node: MoveNode, fen: string): string | null {
    // Normalize FEN comparison (ignore move counters)
    const normFen = (f: string): string => f.split(" ").slice(0, 4).join(" ");

    if (normFen(node.fen) === normFen(fen)) {
      // Current node's FEN matches — return the first child's move
      if (node.children.length > 0) {
        const mainChild = node.children.find((c) => c.isMainLine);
        return (mainChild ?? node.children[0])!.move;
      }
      return null;
    }

    // Recurse into children
    for (const child of node.children) {
      const result = this.findNextMoveInTree(child, fen);
      if (result !== null) return result;
    }

    return null;
  }
}
