import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PlayControls } from "../PlayControls";

describe("PlayControls", () => {
  const defaultProps = {
    assessment: null,
    assessmentMessage: "",
    bookMoveHint: null,
    isOutOfBook: false,
    canGoBack: false,
    canGoForward: false,
    onShowBookMove: vi.fn(),
    onRestart: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
  };

  it("renders the play controls container", () => {
    render(<PlayControls {...defaultProps} />);
    expect(screen.getByTestId("play-controls")).toBeInTheDocument();
  });

  it("renders show book move button", () => {
    render(<PlayControls {...defaultProps} />);
    const btn = screen.getByTestId("btn-show-book-move");
    expect(btn).toBeInTheDocument();
    expect(btn).toBeEnabled();
  });

  it("renders restart button", () => {
    render(<PlayControls {...defaultProps} />);
    const btn = screen.getByTestId("btn-restart");
    expect(btn).toBeInTheDocument();
  });

  it("calls onShowBookMove when show book move button is clicked", () => {
    const onShowBookMove = vi.fn();
    render(<PlayControls {...defaultProps} onShowBookMove={onShowBookMove} />);
    fireEvent.click(screen.getByTestId("btn-show-book-move"));
    expect(onShowBookMove).toHaveBeenCalledOnce();
  });

  it("calls onRestart when restart button is clicked", () => {
    const onRestart = vi.fn();
    render(<PlayControls {...defaultProps} onRestart={onRestart} />);
    fireEvent.click(screen.getByTestId("btn-restart"));
    expect(onRestart).toHaveBeenCalledOnce();
  });

  it("disables show book move button when out of book", () => {
    render(<PlayControls {...defaultProps} isOutOfBook={true} />);
    const btn = screen.getByTestId("btn-show-book-move");
    expect(btn).toBeDisabled();
  });

  it("displays assessment message when provided", () => {
    render(<PlayControls {...defaultProps} assessmentMessage="Book move!" />);
    expect(screen.getByTestId("assessment-message")).toHaveTextContent(
      "Book move!",
    );
  });

  it("does not display assessment message when empty", () => {
    render(<PlayControls {...defaultProps} assessmentMessage="" />);
    expect(screen.queryByTestId("assessment-message")).not.toBeInTheDocument();
  });

  it("displays book move hint when provided", () => {
    render(<PlayControls {...defaultProps} bookMoveHint="e4" />);
    expect(screen.getByTestId("book-move-hint")).toHaveTextContent("e4");
  });

  it("does not display book move hint when null", () => {
    render(<PlayControls {...defaultProps} bookMoveHint={null} />);
    expect(screen.queryByTestId("book-move-hint")).not.toBeInTheDocument();
  });

  it("shows MoveAssessmentBadge when assessment is provided", () => {
    render(<PlayControls {...defaultProps} assessment="book" />);
    expect(screen.getByTestId("move-assessment-badge")).toBeInTheDocument();
  });
});
