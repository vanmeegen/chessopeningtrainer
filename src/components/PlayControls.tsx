import { observer } from "mobx-react-lite";
import { MoveAssessmentBadge } from "./MoveAssessmentBadge";
import type { MoveAssessment } from "../models/PlayModel";

export type PlayControlsProps = {
  /** Current move assessment */
  assessment: MoveAssessment | null;
  /** Assessment message to display */
  assessmentMessage: string;
  /** The book move hint, shown when user clicks "Show book move" */
  bookMoveHint: string | null;
  /** Whether the game is out of book */
  isOutOfBook: boolean;
  /** Whether undo is possible */
  canGoBack: boolean;
  /** Whether redo is possible */
  canGoForward: boolean;
  /** Callback when "Show book move" is clicked */
  onShowBookMove: () => void;
  /** Callback when "Restart" is clicked */
  onRestart: () => void;
  /** Callback when "Undo" is clicked */
  onUndo: () => void;
  /** Callback when "Redo" is clicked */
  onRedo: () => void;
};

export const PlayControls = observer(function PlayControls(
  props: PlayControlsProps,
) {
  const {
    assessment,
    assessmentMessage,
    bookMoveHint,
    isOutOfBook,
    canGoBack,
    canGoForward,
    onShowBookMove,
    onRestart,
    onUndo,
    onRedo,
  } = props;

  return (
    <div className="play-controls" data-testid="play-controls">
      <div className="play-controls-nav" data-testid="play-nav-controls">
        <button
          className="btn-undo"
          data-testid="btn-undo"
          onClick={onUndo}
          disabled={!canGoBack}
          aria-label="Undo move"
        >
          &lt;
        </button>
        <button
          className="btn-redo"
          data-testid="btn-redo"
          onClick={onRedo}
          disabled={!canGoForward}
          aria-label="Redo move"
        >
          &gt;
        </button>
      </div>

      <MoveAssessmentBadge assessment={assessment} />

      {assessmentMessage && (
        <p className="assessment-message" data-testid="assessment-message">
          {assessmentMessage}
        </p>
      )}

      {bookMoveHint && (
        <p className="book-move-hint" data-testid="book-move-hint">
          Book move: <strong>{bookMoveHint}</strong>
        </p>
      )}

      <div className="play-controls-buttons">
        <button
          className="btn-show-book-move"
          data-testid="btn-show-book-move"
          onClick={onShowBookMove}
          disabled={isOutOfBook}
        >
          Show Book Move
        </button>
        <button
          className="btn-restart"
          data-testid="btn-restart"
          onClick={onRestart}
        >
          Restart
        </button>
      </div>
    </div>
  );
});
