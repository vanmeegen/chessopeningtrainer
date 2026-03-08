import { useNavigate, useParams } from "react-router-dom";
import { loadOpeningCatalog } from "../utils/OpeningDataLoader";
import type { OpeningCatalogEntry } from "../types/OpeningTypes";

const catalog: OpeningCatalogEntry[] = loadOpeningCatalog();

function TrainingScreen(): React.JSX.Element {
  const { mode, openingId } = useParams<{
    mode: string;
    openingId: string;
  }>();
  const navigate = useNavigate();

  const opening = catalog.find((o) => o.id === openingId);
  const openingName = opening?.name ?? "Unknown Opening";

  return (
    <div className="training-screen" data-testid="training-screen">
      <div className="screen-header">
        <button
          className="back-button"
          data-testid="back-button"
          onClick={() => navigate(`/select/${mode ?? "learn"}`)}
          aria-label="Back to opening selection"
        >
          &#8592;
        </button>
        <h2 className="screen-header-title">{openingName}</h2>
      </div>
      <div className="training-content">
        <div className="board-area" data-testid="board-area">
          Board goes here
        </div>
        <div className="info-panel" data-testid="info-panel">
          <div className="info-panel-title">{openingName}</div>
          <p>
            Mode: {mode ?? "learn"} | ECO: {opening?.eco ?? "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default TrainingScreen;
