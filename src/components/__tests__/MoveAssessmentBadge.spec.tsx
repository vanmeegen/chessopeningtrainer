import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MoveAssessmentBadge } from "../MoveAssessmentBadge";

describe("MoveAssessmentBadge", () => {
  it("renders nothing when assessment is null", () => {
    const { container } = render(<MoveAssessmentBadge assessment={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders book badge with green checkmark", () => {
    render(<MoveAssessmentBadge assessment="book" />);
    const badge = screen.getByTestId("move-assessment-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("badge-book");
    expect(screen.getByText("Book move")).toBeInTheDocument();
    expect(screen.getByText("\u2713")).toBeInTheDocument();
  });

  it("renders playable badge with tilde", () => {
    render(<MoveAssessmentBadge assessment="playable" />);
    const badge = screen.getByTestId("move-assessment-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("badge-playable");
    expect(screen.getByText("Playable")).toBeInTheDocument();
    expect(screen.getByText("~")).toBeInTheDocument();
  });

  it("renders inaccuracy badge with X", () => {
    render(<MoveAssessmentBadge assessment="inaccuracy" />);
    const badge = screen.getByTestId("move-assessment-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("badge-inaccuracy");
    expect(screen.getByText("Inaccuracy")).toBeInTheDocument();
    expect(screen.getByText("\u2717")).toBeInTheDocument();
  });
});
