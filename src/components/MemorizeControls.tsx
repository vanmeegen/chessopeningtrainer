import { observer } from "mobx-react-lite";
import type { MemorizeModel } from "../models/MemorizeModel";

type MemorizeControlsProps = {
  model: MemorizeModel;
};

export const MemorizeControls = observer(function MemorizeControls({
  model,
}: MemorizeControlsProps) {
  const progress = model.sessionProgress;
  const progressPercent =
    progress.total > 0 ? (progress.done / progress.total) * 100 : 0;

  return (
    <div className="memorize-controls" data-testid="memorize-controls">
      <div className="memorize-progress" data-testid="progress-bar">
        <div className="progress-label">
          {progress.done} / {progress.total}
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {model.feedbackMessage && (
        <div
          className={`feedback-message ${model.lastMoveCorrect ? "feedback-correct" : "feedback-incorrect"}`}
          data-testid="feedback-message"
        >
          {model.feedbackMessage}
        </div>
      )}

      <div className="memorize-actions">
        {!model.isSessionComplete && model.lastMoveCorrect === null && (
          <button
            className="btn btn-hint"
            data-testid="btn-hint"
            onClick={() => model.useHint()}
            disabled={model.hintUsed}
          >
            {model.hintUsed ? "Hint used" : "Hint"}
          </button>
        )}

        {model.canRetry && (
          <button
            className="btn btn-retry"
            data-testid="btn-retry"
            onClick={() => model.retryMove()}
          >
            Try Again
          </button>
        )}

        {model.lastMoveCorrect !== null && !model.isSessionComplete && (
          <button
            className="btn btn-next"
            data-testid="btn-next-card"
            onClick={() => model.nextCard()}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
});
