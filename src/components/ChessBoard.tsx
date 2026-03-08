import { CSSProperties } from "react";
import { observer } from "mobx-react-lite";
import { Chessboard } from "react-chessboard";
import type { Square } from "../types/ChessTypes";
/** Args for piece drop handler matching react-chessboard API */
type PieceDropHandlerArgs = {
  piece: { isSparePiece: boolean; position: string; pieceType: string };
  sourceSquare: string;
  targetSquare: string | null;
};

/** Args for square click handler matching react-chessboard API */
type SquareHandlerArgs = {
  piece: { pieceType: string } | null;
  square: string;
};

/** Callback when a move is made (drag-drop or click-click) */
export type OnMoveCallback = (
  from: Square,
  to: Square,
  promotion?: string,
) => boolean;

export type ChessBoardProps = {
  /** Current position as FEN string */
  position: string;
  /** Board orientation */
  orientation: "white" | "black";
  /** Callback when a move is made; return true if legal */
  onMove: OnMoveCallback;
  /** Whether the board is interactive (allows moves) */
  interactive: boolean;
  /** Currently selected square (for tap-to-move) */
  selectedSquare: Square | null;
  /** Squares to highlight as legal move destinations */
  legalMoveSquares: Square[];
  /** Source square of the last move */
  lastMoveFrom: Square | null;
  /** Destination square of the last move */
  lastMoveTo: Square | null;
  /** Callback when a square is clicked */
  onSquareClick: (square: Square) => void;
};

const SELECTED_SQUARE_STYLE: CSSProperties = {
  backgroundColor: "rgba(255, 255, 0, 0.4)",
};

const LAST_MOVE_STYLE: CSSProperties = {
  backgroundColor: "rgba(155, 199, 0, 0.41)",
};

const LEGAL_MOVE_DOT_STYLE: CSSProperties = {
  background: "radial-gradient(circle, rgba(0,0,0,0.25) 25%, transparent 25%)",
  borderRadius: "50%",
};

function buildSquareStyles(
  props: ChessBoardProps,
): Record<string, CSSProperties> {
  const styles: Record<string, CSSProperties> = {};

  // Last move highlighting
  if (props.lastMoveFrom) {
    styles[props.lastMoveFrom] = { ...LAST_MOVE_STYLE };
  }
  if (props.lastMoveTo) {
    styles[props.lastMoveTo] = { ...LAST_MOVE_STYLE };
  }

  // Selected square highlighting
  if (props.selectedSquare) {
    styles[props.selectedSquare] = {
      ...styles[props.selectedSquare],
      ...SELECTED_SQUARE_STYLE,
    };
  }

  // Legal move dots
  for (const sq of props.legalMoveSquares) {
    styles[sq] = {
      ...styles[sq],
      ...LEGAL_MOVE_DOT_STYLE,
    };
  }

  return styles;
}

export const ChessBoard = observer(function ChessBoard(props: ChessBoardProps) {
  const { position, orientation, onMove, interactive, onSquareClick } = props;

  const squareStyles = buildSquareStyles(props);

  const handlePieceDrop = ({
    sourceSquare,
    targetSquare,
  }: PieceDropHandlerArgs): boolean => {
    if (!interactive || !targetSquare) return false;
    return onMove(sourceSquare as Square, targetSquare as Square);
  };

  const handleSquareClick = ({ square }: SquareHandlerArgs): void => {
    if (!interactive) return;
    onSquareClick(square as Square);
  };

  return (
    <div data-testid="chess-board" data-fen={position}>
      <Chessboard
        options={{
          position,
          boardOrientation: orientation,
          onPieceDrop: handlePieceDrop,
          onSquareClick: handleSquareClick,
          animationDurationInMs: 250,
          squareStyles,
          allowDragging: interactive,
        }}
      />
    </div>
  );
});
