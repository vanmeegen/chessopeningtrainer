import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ChessBoard } from "../ChessBoard";

// react-chessboard uses canvas/WebGL internals that don't work in jsdom,
// so we mock it to a simple div that reflects the options passed.
vi.mock("react-chessboard", () => ({
  Chessboard: ({
    options,
  }: {
    options: {
      position?: string;
      boardOrientation?: string;
    };
  }) => (
    <div
      data-testid="mock-chessboard"
      data-position={options?.position}
      data-orientation={options?.boardOrientation}
    >
      Mock Chessboard
    </div>
  ),
}));

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("ChessBoard", () => {
  const defaultProps = {
    position: START_FEN,
    orientation: "white" as const,
    onMove: vi.fn(() => true),
    interactive: true,
    selectedSquare: null,
    legalMoveSquares: [],
    lastMoveFrom: null,
    lastMoveTo: null,
    onSquareClick: vi.fn(),
  };

  it("renders without crashing", () => {
    render(<ChessBoard {...defaultProps} />);
    expect(screen.getByTestId("chess-board")).toBeInTheDocument();
  });

  it("renders with the correct position", () => {
    render(<ChessBoard {...defaultProps} />);
    const board = screen.getByTestId("mock-chessboard");
    expect(board).toHaveAttribute("data-position", START_FEN);
  });

  it("passes board orientation to chessboard", () => {
    render(<ChessBoard {...defaultProps} orientation="black" />);
    const board = screen.getByTestId("mock-chessboard");
    expect(board).toHaveAttribute("data-orientation", "black");
  });

  it("has data-testid on wrapper", () => {
    render(<ChessBoard {...defaultProps} />);
    expect(screen.getByTestId("chess-board")).toBeInTheDocument();
  });
});
