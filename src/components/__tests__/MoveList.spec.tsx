import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MoveList } from "../MoveList";
import type { Move } from "../../types/ChessTypes";

function makeMoveStub(san: string, color: "w" | "b"): Move {
  return {
    from: "e2",
    to: "e4",
    san,
    piece: "p",
    color,
    flags: "",
  };
}

describe("MoveList", () => {
  const sampleMoves: Move[] = [
    makeMoveStub("e4", "w"),
    makeMoveStub("e5", "b"),
    makeMoveStub("Nf3", "w"),
    makeMoveStub("Nc6", "b"),
  ];

  it("renders the move list container", () => {
    render(
      <MoveList
        moves={sampleMoves}
        currentMoveIndex={-1}
        onNavigate={vi.fn()}
      />,
    );
    expect(screen.getByTestId("move-list")).toBeInTheDocument();
  });

  it("renders correct number of move items", () => {
    render(
      <MoveList
        moves={sampleMoves}
        currentMoveIndex={-1}
        onNavigate={vi.fn()}
      />,
    );
    const items = screen.getAllByTestId("move-item");
    expect(items).toHaveLength(4);
  });

  it("displays move text correctly", () => {
    render(
      <MoveList
        moves={sampleMoves}
        currentMoveIndex={-1}
        onNavigate={vi.fn()}
      />,
    );
    expect(screen.getByText("e4")).toBeInTheDocument();
    expect(screen.getByText("e5")).toBeInTheDocument();
    expect(screen.getByText("Nf3")).toBeInTheDocument();
    expect(screen.getByText("Nc6")).toBeInTheDocument();
  });

  it("calls onNavigate with the correct index when a move is clicked", () => {
    const onNavigate = vi.fn();
    render(
      <MoveList
        moves={sampleMoves}
        currentMoveIndex={-1}
        onNavigate={onNavigate}
      />,
    );
    fireEvent.click(screen.getByText("Nf3"));
    expect(onNavigate).toHaveBeenCalledWith(2);
  });

  it("renders empty list when no moves", () => {
    render(<MoveList moves={[]} currentMoveIndex={-1} onNavigate={vi.fn()} />);
    expect(screen.getByTestId("move-list")).toBeInTheDocument();
    expect(screen.queryAllByTestId("move-item")).toHaveLength(0);
  });

  it("handles odd number of moves (white without black reply)", () => {
    const oddMoves = sampleMoves.slice(0, 3);
    render(
      <MoveList moves={oddMoves} currentMoveIndex={-1} onNavigate={vi.fn()} />,
    );
    const items = screen.getAllByTestId("move-item");
    expect(items).toHaveLength(3);
  });
});
