import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AnnotationPanel } from "../AnnotationPanel";
import type { Annotation } from "../../types/OpeningTypes";

describe("AnnotationPanel", () => {
  const sampleAnnotation: Annotation = {
    moveRationale: "Controls the center and opens lines for the bishop.",
    strategicTheme: "Center control",
    source: "wikibooks",
  };

  it("renders the panel container", () => {
    render(<AnnotationPanel annotation={sampleAnnotation} />);
    expect(screen.getByTestId("annotation-panel")).toBeInTheDocument();
  });

  it("displays the move rationale", () => {
    render(<AnnotationPanel annotation={sampleAnnotation} />);
    expect(
      screen.getByText(/Controls the center and opens lines/),
    ).toBeInTheDocument();
  });

  it("displays the strategic theme", () => {
    render(<AnnotationPanel annotation={sampleAnnotation} />);
    expect(screen.getByText(/Center control/)).toBeInTheDocument();
  });

  it("shows Wikibooks source label", () => {
    render(<AnnotationPanel annotation={sampleAnnotation} />);
    expect(screen.getByText("Wikibooks")).toBeInTheDocument();
  });

  it("shows AI Generated source label", () => {
    const aiAnnotation: Annotation = {
      moveRationale: "Develops the knight.",
      strategicTheme: "Development",
      source: "generated",
    };
    render(<AnnotationPanel annotation={aiAnnotation} />);
    expect(screen.getByText("AI Generated")).toBeInTheDocument();
  });

  it("shows placeholder when annotation is undefined", () => {
    render(<AnnotationPanel annotation={undefined} />);
    expect(screen.getByTestId("annotation-panel")).toBeInTheDocument();
    expect(
      screen.getByText("No annotation for this position."),
    ).toBeInTheDocument();
  });
});
