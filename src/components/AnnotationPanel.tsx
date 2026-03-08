import { CSSProperties } from "react";
import { observer } from "mobx-react-lite";
import type { Annotation } from "../types/OpeningTypes";

export type AnnotationPanelProps = {
  /** Annotation for the current position, or undefined if none */
  annotation: Annotation | undefined;
};

const panelStyle: CSSProperties = {
  padding: "12px",
  borderRadius: "6px",
  backgroundColor: "#f8f8f8",
  border: "1px solid #e0e0e0",
};

const rationaleStyle: CSSProperties = {
  marginBottom: "8px",
  lineHeight: 1.5,
};

const themeStyle: CSSProperties = {
  marginBottom: "8px",
  fontStyle: "italic",
  color: "#555",
};

const sourceLabelStyle: CSSProperties = {
  display: "inline-block",
  fontSize: "11px",
  padding: "2px 6px",
  borderRadius: "3px",
  backgroundColor: "#e0e0e0",
  color: "#666",
};

const SOURCE_LABELS: Record<string, string> = {
  wikibooks: "Wikibooks",
  generated: "Chess Opening Trainer",
};

export const AnnotationPanel = observer(function AnnotationPanel({
  annotation,
}: AnnotationPanelProps) {
  if (!annotation) {
    return (
      <div data-testid="annotation-panel" style={panelStyle}>
        <p style={{ color: "#999" }}>No annotation for this position.</p>
      </div>
    );
  }

  return (
    <div data-testid="annotation-panel" style={panelStyle}>
      <div style={rationaleStyle}>
        <strong>Rationale:</strong> {annotation.moveRationale}
      </div>
      <div style={themeStyle}>
        <strong>Theme:</strong> {annotation.strategicTheme}
      </div>
      <span style={sourceLabelStyle}>
        {SOURCE_LABELS[annotation.source] ?? annotation.source}
      </span>
    </div>
  );
});
