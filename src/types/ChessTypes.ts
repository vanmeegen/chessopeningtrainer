/** Files on the chess board: a through h */
type File = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";

/** Ranks on the chess board: 1 through 8 */
type Rank = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

/** A square on the chess board, e.g. 'a1', 'e4', 'h8' */
export type Square = `${File}${Rank}`;

/** Player color */
export type Color = "w" | "b";

/** Chess piece type */
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

/** A piece with its color */
export type Piece = {
  type: PieceType;
  color: Color;
};

/** Promotion piece type (no pawn or king) */
export type PromotionPiece = "n" | "b" | "r" | "q";

/** A chess move with full details */
export type Move = {
  from: Square;
  to: Square;
  san: string;
  piece: PieceType;
  color: Color;
  captured?: PieceType;
  promotion?: PromotionPiece;
  flags: string;
};

/** Game status flags */
export type GameStatus = {
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
};

/** Complete game state */
export type GameState = {
  fen: string;
  turn: Color;
  moveHistory: Move[];
  status: GameStatus;
};

/** Result of attempting a move */
export type MoveResult = {
  success: boolean;
  move?: Move;
  state: GameState;
};
