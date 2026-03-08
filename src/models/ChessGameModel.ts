import { Chess } from "chess.js";
import { makeAutoObservable } from "mobx";
import type {
  Color,
  GameState,
  Move,
  MoveResult,
  PieceType,
  PromotionPiece,
  Square,
} from "../types/ChessTypes";

/**
 * MobX observable model wrapping chess.js.
 * Provides reactive chess game state and actions.
 */
export class ChessGameModel {
  private chess: Chess;
  private _moveHistory: Move[] = [];

  constructor() {
    this.chess = new Chess();
    makeAutoObservable(this);
  }

  /** Current position as FEN string */
  get position(): string {
    return this.chess.fen();
  }

  /** Current turn color */
  get turn(): Color {
    return this.chess.turn() as Color;
  }

  /** Full move history with details */
  get moveHistory(): Move[] {
    return this._moveHistory;
  }

  /** Whether the current side is in check */
  get isCheck(): boolean {
    return this.chess.isCheck();
  }

  /** Whether the game ended in checkmate */
  get isCheckmate(): boolean {
    return this.chess.isCheckmate();
  }

  /** Whether the game ended in stalemate */
  get isStalemate(): boolean {
    return this.chess.isStalemate();
  }

  /** Whether the game is drawn (insufficient material, 50-move rule, threefold repetition, or stalemate) */
  get isDraw(): boolean {
    return this.chess.isDraw();
  }

  /** Complete game state snapshot */
  get gameState(): GameState {
    return {
      fen: this.position,
      turn: this.turn,
      moveHistory: [...this._moveHistory],
      status: {
        isCheck: this.isCheck,
        isCheckmate: this.isCheckmate,
        isStalemate: this.isStalemate,
        isDraw: this.isDraw,
      },
    };
  }

  /** Get legal destination squares for a piece on the given square */
  legalMoves(square: Square): Square[] {
    const moves = this.chess.moves({ square, verbose: true });
    return moves.map((m) => m.to as Square);
  }

  /** Attempt to make a move. Returns a MoveResult indicating success/failure. */
  makeMove(from: Square, to: Square, promotion?: PromotionPiece): MoveResult {
    try {
      const result = this.chess.move({ from, to, promotion });
      if (result === null) {
        return { success: false, state: this.gameState };
      }
      const move: Move = {
        from: result.from as Square,
        to: result.to as Square,
        san: result.san,
        piece: result.piece as PieceType,
        color: result.color as Color,
        captured: result.captured ? (result.captured as PieceType) : undefined,
        promotion: result.promotion
          ? (result.promotion as PromotionPiece)
          : undefined,
        flags: result.flags,
      };
      this._moveHistory.push(move);
      return { success: true, move, state: this.gameState };
    } catch {
      return { success: false, state: this.gameState };
    }
  }

  /** Undo the last move. Does nothing if there are no moves to undo. */
  undoMove(): void {
    const result = this.chess.undo();
    if (result !== null) {
      this._moveHistory.pop();
    }
  }

  /** Reset to the standard initial position */
  reset(): void {
    this.chess.reset();
    this._moveHistory = [];
  }

  /** Load a position from a FEN string */
  loadFen(fen: string): void {
    this.chess.load(fen);
    this._moveHistory = [];
  }

  /** Load a game from PGN notation. Returns true on success. */
  loadPgn(pgn: string): boolean {
    const tempChess = new Chess();
    try {
      tempChess.loadPgn(pgn);
    } catch {
      return false;
    }

    // Rebuild the game move by move to populate our move history
    const history = tempChess.history({ verbose: true });
    this.chess.reset();
    this._moveHistory = [];

    for (const h of history) {
      const result = this.chess.move({
        from: h.from,
        to: h.to,
        promotion: h.promotion,
      });
      if (result === null) {
        return false;
      }
      const move: Move = {
        from: result.from as Square,
        to: result.to as Square,
        san: result.san,
        piece: result.piece as PieceType,
        color: result.color as Color,
        captured: result.captured ? (result.captured as PieceType) : undefined,
        promotion: result.promotion
          ? (result.promotion as PromotionPiece)
          : undefined,
        flags: result.flags,
      };
      this._moveHistory.push(move);
    }

    return true;
  }
}
