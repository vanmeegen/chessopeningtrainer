import { CSSProperties } from "react";
import { observer } from "mobx-react-lite";

export type LearnControlsProps = {
  canGoBack: boolean;
  canGoForward: boolean;
  isAutoPlaying: boolean;
  onGoToStart: () => void;
  onGoBack: () => void;
  onAdvance: () => void;
  onGoToEnd: () => void;
  onToggleAutoPlay: () => void;
};

const controlsContainerStyle: CSSProperties = {
  display: "flex",
  gap: "4px",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px",
};

const buttonStyle: CSSProperties = {
  padding: "6px 12px",
  fontSize: "16px",
  cursor: "pointer",
  border: "1px solid #ccc",
  borderRadius: "4px",
  backgroundColor: "#fff",
  minWidth: "36px",
};

const disabledButtonStyle: CSSProperties = {
  ...buttonStyle,
  cursor: "not-allowed",
  opacity: 0.4,
};

const autoPlayActiveStyle: CSSProperties = {
  ...buttonStyle,
  backgroundColor: "#4caf50",
  color: "#fff",
  borderColor: "#388e3c",
};

export const LearnControls = observer(function LearnControls(
  props: LearnControlsProps,
) {
  const {
    canGoBack,
    canGoForward,
    isAutoPlaying,
    onGoToStart,
    onGoBack,
    onAdvance,
    onGoToEnd,
    onToggleAutoPlay,
  } = props;

  return (
    <div data-testid="learn-controls" style={controlsContainerStyle}>
      <button
        data-testid="btn-start"
        style={canGoBack ? buttonStyle : disabledButtonStyle}
        disabled={!canGoBack}
        onClick={onGoToStart}
        aria-label="Go to start"
      >
        |&lt;
      </button>
      <button
        data-testid="btn-back"
        style={canGoBack ? buttonStyle : disabledButtonStyle}
        disabled={!canGoBack}
        onClick={onGoBack}
        aria-label="Go back"
      >
        &lt;
      </button>
      <button
        data-testid="btn-forward"
        style={canGoForward ? buttonStyle : disabledButtonStyle}
        disabled={!canGoForward}
        onClick={onAdvance}
        aria-label="Advance"
      >
        &gt;
      </button>
      <button
        data-testid="btn-end"
        style={canGoForward ? buttonStyle : disabledButtonStyle}
        disabled={!canGoForward}
        onClick={onGoToEnd}
        aria-label="Go to end"
      >
        &gt;|
      </button>
      <button
        data-testid="btn-autoplay"
        style={isAutoPlaying ? autoPlayActiveStyle : buttonStyle}
        onClick={onToggleAutoPlay}
        aria-label={isAutoPlaying ? "Pause auto-play" : "Start auto-play"}
      >
        {isAutoPlaying ? "\u23F8" : "\u25B6"}
      </button>
    </div>
  );
});
