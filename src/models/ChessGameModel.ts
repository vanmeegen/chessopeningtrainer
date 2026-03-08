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

  // Observable snapshot of chess.js state — MobX can't track chess.js internals,
  // so we sync these fields after every mutation.
  private _fen: string;
  private _turn: Color;
  private _isCheck: boolean;
  private _isCheckmate: boolean;
  private _isStalemate: boolean;
  private _isDraw: boolean;

  constructor() {
    this.chess = new Chess();
    this._fen = this.chess.fen();
    this._turn = this.chess.turn() as Color;
    this._isCheck = false;
    this._isCheckmate = false;
    this._isStalemate = false;
    this._isDraw = false;
    makeAutoObservable(this);
  }

  /** Sync observable state from chess.js after any mutation */
  private _syncState(): void {
    this._fen = this.chess.fen();
    this._turn = this.chess.turn() as Color;
    this._isCheck = this.chess.isCheck();
    this._isCheckmate = this.chess.isCheckmate();
    this._isStalemate = this.chess.isStalemate();
    this._isDraw = this.chess.isDraw();
  }

  /** Current position as FEN string */
  get position(): string {
    return this._fen;
  }

  /** Current turn color */
  get turn(): Color {
    return this._turn;
  }

  /** Full move history with details */
  get moveHistory(): Move[] {
    return this._moveHistory;
  }

  /** Whether the current side is in check */
  get isCheck(): boolean {
    return this._isCheck;
  }

  /** Whether the game ended in checkmate */
  get isCheckmate(): boolean {
    return this._isCheckmate;
  }

  /** Whether the game ended in stalemate */
  get isStalemate(): boolean {
    return this._isStalemate;
  }

  /** Whether the game is drawn (insufficient material, 50-move rule, threefold repetition, or stalemate) */
  get isDraw(): boolean {
    return this._isDraw;
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
      this._syncState();
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
      this._syncState();
    }
  }

  /** Reset to the standard initial position */
  reset(): void {
    this.chess.reset();
    this._moveHistory = [];
    this._syncState();
  }

  /** Load a position from a FEN string */
  loadFen(fen: string): void {
    this.chess.load(fen);
    this._moveHistory = [];
    this._syncState();
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
    this._syncState();

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

    this._syncState();
    return true;
  }
}
