import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { observer } from "mobx-react-lite";
import { makeAutoObservable, runInAction } from "mobx";
import {
  loadOpeningCatalog,
  loadOpeningData,
} from "../utils/OpeningDataLoader";
import type { OpeningCatalogEntry, Variation } from "../types/OpeningTypes";

const catalog: OpeningCatalogEntry[] = loadOpeningCatalog();

function formatModeTitle(mode: string): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

/** Observable state for the two-panel opening selector */
class OpeningSelectorState {
  searchQuery = "";
  selectedOpeningId: string | null = null;
  variations: Variation[] = [];
  isLoadingVariations = false;
  loadError: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  get filteredOpenings(): OpeningCatalogEntry[] {
    const q = this.searchQuery.toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (o) =>
        o.name.toLowerCase().includes(q) || o.eco.toLowerCase().includes(q),
    );
  }

  setSearch(query: string): void {
    this.searchQuery = query;
  }

  async selectOpening(openingId: string): Promise<void> {
    if (this.selectedOpeningId === openingId) return;
    this.selectedOpeningId = openingId;
    this.variations = [];
    this.isLoadingVariations = true;
    this.loadError = null;

    try {
      const opening = await loadOpeningData(openingId);
      runInAction(() => {
        if (this.selectedOpeningId === openingId) {
          this.variations = opening.variations;
          this.isLoadingVariations = false;
        }
      });
    } catch (err) {
      runInAction(() => {
        if (this.selectedOpeningId === openingId) {
          this.loadError =
            err instanceof Error ? err.message : "Failed to load variations";
          this.isLoadingVariations = false;
        }
      });
    }
  }
}

const OpeningSelectionScreen = observer(
  function OpeningSelectionScreen(): React.JSX.Element {
    const { mode } = useParams<{ mode: string }>();
    const navigate = useNavigate();

    const stateRef = useRef<OpeningSelectorState | null>(null);
    if (stateRef.current === null) {
      stateRef.current = new OpeningSelectorState();
    }
    const state = stateRef.current;

    // Auto-select first opening if none selected
    useEffect(() => {
      if (!state.selectedOpeningId && state.filteredOpenings.length > 0) {
        void state.selectOpening(state.filteredOpenings[0]!.id);
      }
    }, [state]);

    const handleSelectVariation = (variationId: string): void => {
      navigate(
        `/train/${mode ?? "learn"}/${state.selectedOpeningId}?variation=${variationId}`,
      );
    };

    const handleSelectOpeningDirect = (openingId: string): void => {
      // If opening has only one variation or user double-clicks, go directly
      navigate(`/train/${mode ?? "learn"}/${openingId}`);
    };

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
            {formatModeTitle(mode ?? "")} &mdash; Select Opening
          </h2>
        </div>
        <div className="opening-search-container">
          <input
            className="opening-search"
            data-testid="opening-search"
            type="text"
            placeholder="Search openings by name or ECO code..."
            value={state.searchQuery}
            onChange={(e) => state.setSearch(e.target.value)}
          />
        </div>
        <div className="opening-browser" data-testid="opening-list">
          {/* Left panel: opening list */}
          <div
            className="opening-master-list"
            data-testid="opening-master-list"
          >
            {state.filteredOpenings.length === 0 && (
              <div className="empty-state">No openings match your search.</div>
            )}
            {state.filteredOpenings.map((opening) => (
              <div
                key={opening.id}
                className={`opening-item${state.selectedOpeningId === opening.id ? " opening-item-selected" : ""}`}
                data-testid="opening-item"
                onClick={() => void state.selectOpening(opening.id)}
                onDoubleClick={() => handleSelectOpeningDirect(opening.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSelectOpeningDirect(opening.id);
                  } else if (e.key === " ") {
                    e.preventDefault();
                    void state.selectOpening(opening.id);
                  }
                }}
              >
                <div className="opening-item-info">
                  <span className="opening-item-name">{opening.name}</span>
                  <span className="opening-item-eco">{opening.eco}</span>
                </div>
                <span className="opening-item-variations">
                  {opening.variationCount}{" "}
                  {opening.variationCount === 1 ? "var" : "vars"}
                </span>
              </div>
            ))}
          </div>

          {/* Right panel: variations list */}
          <div className="opening-detail-panel" data-testid="variation-list">
            {!state.selectedOpeningId && (
              <div className="empty-state">
                Select an opening to see its variations.
              </div>
            )}
            {state.isLoadingVariations && (
              <div className="empty-state" data-testid="loading-indicator">
                Loading variations...
              </div>
            )}
            {state.loadError && (
              <div className="empty-state" data-testid="error-message">
                {state.loadError}
              </div>
            )}
            {!state.isLoadingVariations &&
              !state.loadError &&
              state.variations.length > 0 && (
                <>
                  <div className="variation-panel-header">
                    <span className="variation-panel-title">
                      {catalog.find((o) => o.id === state.selectedOpeningId)
                        ?.name ?? ""}
                    </span>
                    <button
                      className="variation-train-all-btn"
                      data-testid="train-all-button"
                      onClick={() =>
                        handleSelectOpeningDirect(state.selectedOpeningId!)
                      }
                    >
                      Train All
                    </button>
                  </div>
                  {state.variations.map((variation) => (
                    <div
                      key={variation.id}
                      className="variation-item"
                      data-testid="variation-item"
                      onClick={() => handleSelectVariation(variation.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          handleSelectVariation(variation.id);
                        }
                      }}
                    >
                      <span className="variation-item-name">
                        {variation.name}
                      </span>
                      <span className="variation-item-pgn">
                        {variation.pgn}
                      </span>
                    </div>
                  ))}
                </>
              )}
            {!state.isLoadingVariations &&
              !state.loadError &&
              state.selectedOpeningId &&
              state.variations.length === 0 && (
                <div className="empty-state">No variations found.</div>
              )}
          </div>
        </div>
      </div>
    );
  },
);

export default OpeningSelectionScreen;
