import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { loadOpeningCatalog } from "../utils/OpeningDataLoader";
import type { OpeningCatalogEntry } from "../types/OpeningTypes";

const catalog: OpeningCatalogEntry[] = loadOpeningCatalog();

function formatModeTitle(mode: string): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

function OpeningSelectionScreen(): React.JSX.Element {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  // useState is acceptable here for local input state that doesn't need MobX
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOpenings = catalog.filter(
    (opening) =>
      opening.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opening.eco.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div
      className="opening-selection-screen"
      data-testid="opening-selection-screen"
    >
      <div className="screen-header">
        <button
          className="back-button"
          data-testid="back-button"
          onClick={() => navigate("/")}
          aria-label="Back to home"
        >
          &#8592;
        </button>
        <h2 className="screen-header-title">
          {formatModeTitle(mode ?? "")} — Select Opening
        </h2>
      </div>
      <div className="opening-search-container">
        <input
          className="opening-search"
          data-testid="opening-search"
          type="text"
          placeholder="Search openings by name or ECO code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="opening-list" data-testid="opening-list">
        {filteredOpenings.length === 0 && (
          <div className="empty-state">No openings match your search.</div>
        )}
        {filteredOpenings.map((opening) => (
          <div
            key={opening.id}
            className="opening-item"
            data-testid="opening-item"
            onClick={() => navigate(`/train/${mode ?? "learn"}/${opening.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                navigate(`/train/${mode ?? "learn"}/${opening.id}`);
              }
            }}
          >
            <div className="opening-item-info">
              <span className="opening-item-name">{opening.name}</span>
              <span className="opening-item-eco">{opening.eco}</span>
            </div>
            <span className="opening-item-variations">
              {opening.variationCount}{" "}
              {opening.variationCount === 1 ? "variation" : "variations"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OpeningSelectionScreen;
