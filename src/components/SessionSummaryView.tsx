import { observer } from "mobx-react-lite";
import type { SessionSummary } from "../types/CardTypes";

type SessionSummaryViewProps = {
  summary: SessionSummary;
  onRestart?: () => void;
  onBack?: () => void;
};

export const SessionSummaryView = observer(function SessionSummaryView({
  summary,
  onRestart,
  onBack,
}: SessionSummaryViewProps) {
  const accuracy =
    summary.totalCards > 0
      ? Math.round((summary.correct / summary.totalCards) * 100)
      : 0;

  return (
    <div className="session-summary" data-testid="session-summary">
      <h2 className="summary-title">Session Complete</h2>

      <div className="summary-stats">
        <div className="stat" data-testid="summary-total">
          <span className="stat-label">Total Cards</span>
          <span className="stat-value">{summary.totalCards}</span>
        </div>
        <div className="stat" data-testid="summary-correct">
          <span className="stat-label">Correct</span>
          <span className="stat-value">{summary.correct}</span>
        </div>
        <div className="stat" data-testid="summary-incorrect">
          <span className="stat-label">Incorrect</span>
          <span className="stat-value">{summary.incorrect}</span>
        </div>
        <div className="stat" data-testid="summary-accuracy">
          <span className="stat-label">Accuracy</span>
          <span className="stat-value">{accuracy}%</span>
        </div>
      </div>

      <div className="summary-actions">
        {summary.incorrect > 0 && onRestart && (
          <button
            className="btn btn-restart"
            data-testid="btn-restart"
            onClick={onRestart}
          >
            Retry Failed Cards
          </button>
        )}
        {onBack && (
          <button
            className="btn btn-back"
            data-testid="btn-back-to-selection"
            onClick={onBack}
          >
            Back to Selection
          </button>
        )}
      </div>
    </div>
  );
});
