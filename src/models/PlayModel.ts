import {
  action,
  computed,
  makeObservable,
  observable,
  runInAction,
} from "mobx";
import { ChessGameModel } from "./ChessGameModel";
import type { Opening, MoveNode } from "../types/OpeningTypes";
import type { Color, PromotionPiece, Square } from "../types/ChessTypes";

/** How user's move relates to the opening book */
export type MoveAssessment = "book" | "playable" | "inaccuracy";

/** How play is constrained to the opening tree */
export type ConstraintMode = "unconstrained" | "opening" | "variation";

/**
 * MobX observable model for the Play mode.
 * Manages a chess game where the user plays against the COT (Chess Opening Trainer),
 * which follows opening book moves. Assesses user moves against the opening tree.
 */
export class PlayModel {
  readonly chessGame: ChessGameModel;
  readonly playerColor: Color;
  readonly constraintMode: ConstraintMode;

  private readonly opening: Opening | undefined;
  private readonly variationId: string | undefined;

  /** Current position in the opening move tree */
  private _currentTreeNode: MoveNode | null = null;

  /** History of tree nodes for undo support */
  private _treeNodeHistory: (MoveNode | null)[] = [];
  /** How many chess moves correspond to each undo step (user move + optional COT response) */
  private _movesPerStep: number[] = [];
  /** Redo stack: stores the SANs and resulting state for replay */
  private _redoStack: {
    moveSans: string[];
    treeNodeAfter: MoveNode | null;
    wasOutOfBook: boolean;
    assessment: MoveAssessment | null;
    assessmentMsg: string;
  }[] = [];

  lastMoveAssessment: MoveAssessment | null = null;
  assessmentMessage: string = "";
  bookMoveHint: string | null = null;
  isOutOfBook: boolean = false;

  constructor(
    opening: Opening | undefined,
    variationId: string | undefined,
    playerColor: Color,
  ) {
    this.chessGame = new ChessGameModel();
    this.playerColor = playerColor;
    this.opening = opening;
    this.variationId = variationId;

    if (!opening) {
      this.constraintMode = "unconstrained";
      this.isOutOfBook = true;
      this._currentTreeNode = null;
    } else if (variationId) {
      this.constraintMode = "variation";
      const variation = opening.variations.find((v) => v.id === variationId);
      this._currentTreeNode = variation?.moves ?? opening.variations[0]!.moves;
    } else {
      this.constraintMode = "opening";
      // Use the first variation's tree (all variations share the same root typically)
      this._currentTreeNode = opening.variations[0]!.moves;
    }

    makeObservable<PlayModel, "_currentTreeNode">(this, {
      _currentTreeNode: observable.ref,
      lastMoveAssessment: observable,
      assessmentMessage: observable,
      bookMoveHint: observable,
      isOutOfBook: observable,
      currentOpeningName: computed,
      currentVariationName: computed,
      canGoBack: computed,
      canGoForward: computed,
      handleUserMove: action,
      showBookMove: action,
      restart: action,
      undoMove: action,
      redoMove: action,
    });

    // If player is black, COT makes the first move
    if (playerColor === "b" && this._currentTreeNode) {
      runInAction(() => {
        this.makeCotMove();
      });
    }
  }

  get currentOpeningName(): string | null {
    return this.opening?.name ?? null;
  }

  get currentVariationName(): string | null {
    if (!this.opening || !this.variationId) return null;
    const variation = this.opening.variations.find(
      (v) => v.id === this.variationId,
    );
    return variation?.name ?? null;
  }

  /** Whether undo is possible */
  get canGoBack(): boolean {
    return this._treeNodeHistory.length > 0;
  }

  /** Whether redo is possible */
  get canGoForward(): boolean {
    return this._redoStack.length > 0;
  }

  /**
   * Handle a user move. Makes the move on the chess game, assesses it
   * against the opening tree, and triggers COT response if in book.
   * Returns true if the move was legal, false otherwise.
   */
  handleUserMove(
    from: Square,
    to: Square,
    promotion?: PromotionPiece,
  ): boolean {
    const result = this.chessGame.makeMove(from, to, promotion);
    if (!result.success || !result.move) {
      return false;
    }

    // Save state for undo
    const prevTreeNode = this._currentTreeNode;
    const moveCountBefore = this.chessGame.moveHistory.length;

    // Clear redo stack on new move
    this._redoStack = [];

    // In unconstrained mode, no assessment or COT response
    if (this.constraintMode === "unconstrained") {
      this._treeNodeHistory.push(prevTreeNode);
      this._movesPerStep.push(1);
      return true;
    }

    // Assess the move against the opening tree
    const san = result.move.san;
    const matchingChild = this.findChildMove(san);

    if (matchingChild) {
      this.lastMoveAssessment = "book";
      this.assessmentMessage = "Book move!";
      this._currentTreeNode = matchingChild;

      // COT responds if there are more moves in the tree
      this.makeCotMove();
    } else {
      this.lastMoveAssessment = "playable";
      this.assessmentMessage = "Playable - not in the opening book";
      this.isOutOfBook = true;
      this._currentTreeNode = null;
    }

    // Track how many moves were made in this step (user + COT)
    const movesInStep = this.chessGame.moveHistory.length - moveCountBefore + 1;
    this._treeNodeHistory.push(prevTreeNode);
    this._movesPerStep.push(movesInStep);

    return true;
  }

  /** Reveal the book move for the current position */
  showBookMove(): void {
    if (this.isOutOfBook || !this._currentTreeNode) {
      this.bookMoveHint = null;
      return;
    }

    const children = this._currentTreeNode.children;
    if (children.length === 0) {
      this.bookMoveHint = null;
      return;
    }

    if (this.constraintMode === "variation") {
      // In variation mode, show the main line move
      const mainLineChild = children.find((c) => c.isMainLine);
      this.bookMoveHint = mainLineChild?.move ?? children[0]!.move;
    } else {
      // In opening mode, show the main line move as hint
      const mainLineChild = children.find((c) => c.isMainLine);
      this.bookMoveHint = mainLineChild?.move ?? children[0]!.move;
    }
  }

  /** Reset the game to initial state */
  restart(): void {
    this.chessGame.reset();
    this.lastMoveAssessment = null;
    this.assessmentMessage = "";
    this.bookMoveHint = null;
    this.isOutOfBook = false;
    this._treeNodeHistory = [];
    this._movesPerStep = [];
    this._redoStack = [];

    if (this.opening) {
      if (this.variationId) {
        const variation = this.opening.variations.find(
          (v) => v.id === this.variationId,
        );
        this._currentTreeNode =
          variation?.moves ?? this.opening.variations[0]!.moves;
      } else {
        this._currentTreeNode = this.opening.variations[0]!.moves;
      }
    } else {
      this._currentTreeNode = null;
      this.isOutOfBook = true;
    }

    // If player is black, COT makes the first move
    if (this.playerColor === "b" && this._currentTreeNode) {
      this.makeCotMove();
    }
  }

  /** Undo the last user move (and COT response if any) */
  undoMove(): void {
    if (this._treeNodeHistory.length === 0) return;

    const prevTreeNode = this._treeNodeHistory.pop()!;
    const movesInStep = this._movesPerStep.pop()!;

    // Collect SAN moves for redo before undoing
    const history = this.chessGame.moveHistory;
    const moveSans: string[] = [];
    for (let i = history.length - movesInStep; i < history.length; i++) {
      moveSans.push(history[i]!.san);
    }

    // Save to redo stack
    this._redoStack.push({
      moveSans,
      treeNodeAfter: this._currentTreeNode,
      wasOutOfBook: this.isOutOfBook,
      assessment: this.lastMoveAssessment,
      assessmentMsg: this.assessmentMessage,
    });

    // Undo moves on the chess game
    for (let i = 0; i < movesInStep; i++) {
      this.chessGame.undoMove();
    }

    // Restore tree position
    this._currentTreeNode = prevTreeNode;
    this.isOutOfBook =
      prevTreeNode === null && this.constraintMode !== "unconstrained";
    this.lastMoveAssessment = null;
    this.assessmentMessage = "";
    this.bookMoveHint = null;
  }

  /** Redo the last undone move */
  redoMove(): void {
    if (this._redoStack.length === 0) return;

    const entry = this._redoStack.pop()!;

    // Save current state for undo
    this._treeNodeHistory.push(this._currentTreeNode);

    // Replay all moves via SAN
    for (const san of entry.moveSans) {
      this.makeMoveFromSan(san);
    }

    this._movesPerStep.push(entry.moveSans.length);
    this._currentTreeNode = entry.treeNodeAfter;
    this.isOutOfBook = entry.wasOutOfBook;
    this.lastMoveAssessment = entry.assessment;
    this.assessmentMessage = entry.assessmentMsg;
    this.bookMoveHint = null;
  }

  /**
   * Find a child move node matching the given SAN.
   * In opening mode, searches all variations' trees.
   */
  private findChildMove(san: string): MoveNode | null {
    if (!this._currentTreeNode) return null;

    const children = this._currentTreeNode.children;
    const match = children.find((c) => c.move === san);
    return match ?? null;
  }

  /**
   * Make the COT's response move. Picks from the current tree node's children.
   * In variation mode: follows main line.
   * In opening mode: picks randomly among children.
   */
  private makeCotMove(): void {
    if (!this._currentTreeNode) return;

    const children = this._currentTreeNode.children;
    if (children.length === 0) {
      this.isOutOfBook = true;
      return;
    }

    let chosenChild: MoveNode;
    if (this.constraintMode === "variation") {
      // Follow main line
      const mainLineChild = children.find((c) => c.isMainLine);
      chosenChild = mainLineChild ?? children[0]!;
    } else {
      // Opening mode: pick randomly
      const index = Math.floor(Math.random() * children.length);
      chosenChild = children[index]!;
    }

    // Make the move on the chess game using the SAN
    // We need to find the from/to squares for this move
    const moveSan = chosenChild.move;
    const made = this.makeMoveFromSan(moveSan);
    if (made) {
      this._currentTreeNode = chosenChild;
    }
  }

  /**
   * Make a move on the chess game given only SAN notation.
   * Uses chess.js internally to find the correct from/to squares.
   */
  private makeMoveFromSan(san: string): boolean {
    // Get all legal moves and find the one matching this SAN
    // We need to try all legal moves to find matching SAN
    const chess = this.chessGame;
    // Try each possible from square
    const files: string[] = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const ranks: string[] = ["1", "2", "3", "4", "5", "6", "7", "8"];

    for (const file of files) {
      for (const rank of ranks) {
        const square = `${file}${rank}` as Square;
        const legalMoves = chess.legalMoves(square);
        for (const target of legalMoves) {
          // Try the move and check if it matches the SAN
          const result = chess.makeMove(square, target);
          if (result.success && result.move?.san === san) {
            return true;
          }
          if (result.success) {
            // Wrong SAN, undo
            chess.undoMove();
          }
        }
      }
    }
    return false;
  }
}
