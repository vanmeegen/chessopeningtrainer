import { CSSProperties } from "react";
import { observer } from "mobx-react-lite";
import type { Move } from "../types/ChessTypes";

/** A move pair representing one full move (white + optional black) */
type MovePair = {
  moveNumber: number;
  white: { san: string; index: number };
  black?: { san: string; index: number };
};

export type MoveListProps = {
  /** Full move history */
  moves: Move[];
  /** Index of the currently viewed move (-1 for starting position) */
  currentMoveIndex: number;
  /** Callback when a move is clicked */
  onNavigate: (moveIndex: number) => void;
};

function groupMovesIntoPairs(moves: Move[]): MovePair[] {
  const pairs: MovePair[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    const white = moves[i]!;
    const black = moves[i + 1];
    pairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: { san: white.san, index: i },
      black: black ? { san: black.san, index: i + 1 } : undefined,
    });
  }
  return pairs;
}

const containerStyle: CSSProperties = {
  maxHeight: "300px",
  overflowY: "auto",
  padding: "8px",
  fontFamily: "monospace",
  fontSize: "14px",
};

const pairStyle: CSSProperties = {
  display: "flex",
  gap: "4px",
  marginBottom: "2px",
};

const moveNumberStyle: CSSProperties = {
  minWidth: "28px",
  textAlign: "right",
  color: "var(--text-secondary)",
  marginRight: "4px",
};

const baseMoveStyle: CSSProperties = {
  padding: "2px 6px",
  borderRadius: "3px",
  cursor: "pointer",
  minWidth: "48px",
};

const activeMoveStyle: CSSProperties = {
  ...baseMoveStyle,
  backgroundColor: "rgba(155, 199, 0, 0.5)",
  fontWeight: "bold",
};

export const MoveList = observer(function MoveList({
  moves,
  currentMoveIndex,
  onNavigate,
}: MoveListProps) {
  const pairs = groupMovesIntoPairs(moves);

  return (
    <div data-testid="move-list" style={containerStyle}>
      {pairs.map((pair) => (
        <div key={pair.moveNumber} style={pairStyle}>
          <span style={moveNumberStyle}>{pair.moveNumber}.</span>
          <span
            data-testid="move-item"
            style={
              currentMoveIndex === pair.white.index
                ? activeMoveStyle
                : baseMoveStyle
            }
            onClick={() => onNavigate(pair.white.index)}
          >
            {pair.white.san}
          </span>
          {pair.black != null && (
            <span
              data-testid="move-item"
              style={
                currentMoveIndex === pair.black.index
                  ? activeMoveStyle
                  : baseMoveStyle
              }
              onClick={() => {
                if (pair.black != null) {
                  onNavigate(pair.black.index);
                }
              }}
            >
              {pair.black.san}
            </span>
          )}
        </div>
      ))}
    </div>
  );
});
