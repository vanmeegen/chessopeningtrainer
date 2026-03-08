import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { observer } from "mobx-react-lite";
import { makeAutoObservable, runInAction } from "mobx";
import {
  loadOpeningCatalog,
  loadOpeningData,
} from "../utils/OpeningDataLoader";
import { buildCategoryTrees, searchTree } from "../utils/openingTreeBuilder";
import type {
  OpeningCatalogEntry,
  CategoryGroup,
  OpeningTreeNode,
  ImportanceRating,
  Variation,
} from "../types/OpeningTypes";

const catalog: OpeningCatalogEntry[] = loadOpeningCatalog();
const categoryTrees: CategoryGroup[] = buildCategoryTrees(catalog);

function formatModeTitle(mode: string): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

function importanceStars(importance: ImportanceRating): string {
  if (importance === 3) return "\u2605\u2605\u2605";
  if (importance === 2) return "\u2605\u2605";
  return "\u2605";
}

function importanceClass(importance: ImportanceRating): string {
  if (importance === 3) return "importance-essential";
  if (importance === 2) return "importance-important";
  return "importance-niche";
}

/** Observable state for the tree-based opening selector */
class OpeningTreeSelectorState {
  expandedCategories = new Set<string>(["open"]);
  expandedBranches = new Set<string>();
  showRare = false;
  selectedOpeningId: string | null = null;
  variations: Variation[] = [];
  isLoadingVariations = false;
  loadError: string | null = null;
  searchQuery = "";

  constructor() {
    makeAutoObservable(this);
  }

  get isSearching(): boolean {
    return this.searchQuery.length > 0;
  }

  get searchResults(): {
    matchedIds: Set<string>;
    expandPaths: Set<string>;
    matchedCategories: Set<string>;
  } {
    if (!this.isSearching) {
      return {
        matchedIds: new Set(),
        expandPaths: new Set(),
        matchedCategories: new Set(),
      };
    }

    const allMatchedIds = new Set<string>();
    const allExpandPaths = new Set<string>();
    const matchedCategories = new Set<string>();

    for (const group of categoryTrees) {
      const result = searchTree(group.roots, this.searchQuery);
      if (result.matchedIds.size > 0) {
        matchedCategories.add(group.key);
        for (const id of result.matchedIds) allMatchedIds.add(id);
        for (const path of result.expandPaths) allExpandPaths.add(path);
      }
    }

    return {
      matchedIds: allMatchedIds,
      expandPaths: allExpandPaths,
      matchedCategories,
    };
  }

  setSearch(query: string): void {
    this.searchQuery = query;
  }

  toggleCategory(key: string): void {
    if (this.expandedCategories.has(key)) {
      this.expandedCategories.delete(key);
    } else {
      this.expandedCategories.add(key);
    }
  }

  toggleBranch(path: string): void {
    if (this.expandedBranches.has(path)) {
      this.expandedBranches.delete(path);
    } else {
      this.expandedBranches.add(path);
    }
  }

  toggleShowRare(): void {
    this.showRare = !this.showRare;
  }

  isBranchExpanded(path: string): boolean {
    if (this.isSearching) {
      return this.searchResults.expandPaths.has(path);
    }
    return this.expandedBranches.has(path);
  }

  isCategoryExpanded(key: string): boolean {
    if (this.isSearching) {
      return this.searchResults.matchedCategories.has(key);
    }
    return this.expandedCategories.has(key);
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

/** Renders a single tree node and its children recursively */
const TreeNode = observer(function TreeNode({
  node,
  depth,
  parentPath,
  state,
  onSelect,
  onDirect,
}: {
  node: OpeningTreeNode;
  depth: number;
  parentPath: string;
  state: OpeningTreeSelectorState;
  onSelect: (id: string) => void;
  onDirect: (id: string) => void;
}): React.JSX.Element {
  const nodePath = parentPath ? `${parentPath}/${node.move}` : node.move;
  const hasChildren = node.children.length > 0;
  const isExpanded = state.isBranchExpanded(nodePath);
  const isSearching = state.isSearching;
  const matchedIds = isSearching ? state.searchResults.matchedIds : null;

  const showRareChildren = state.showRare || isSearching;

  // Filter children: hide rare unless showRare or searching
  const visibleChildren = hasChildren
    ? node.children.filter((child) => {
        if (showRareChildren) return true;
        if (isSearching && matchedIds) {
          return hasMatchInSubtree(child, matchedIds);
        }
        const maxImp = getSubtreeMaxImportance(child);
        return maxImp >= 2;
      })
    : [];

  const hiddenCount = node.children.length - visibleChildren.length;

  const isSelected = node.opening?.id === state.selectedOpeningId;

  return (
    <div className="tree-node" data-testid="tree-node">
      <div
        className={`tree-node-row${isSelected ? " tree-node-selected" : ""}`}
        style={{ paddingLeft: `${depth * 1.25 + 0.5}rem` }}
        data-testid={node.opening ? "opening-item" : "tree-branch"}
        onClick={() => {
          if (node.opening) {
            onSelect(node.opening.id);
          }
          if (hasChildren) {
            state.toggleBranch(nodePath);
          }
        }}
        onDoubleClick={() => {
          if (node.opening) {
            onDirect(node.opening.id);
          }
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" && node.opening) {
            onDirect(node.opening.id);
          } else if (e.key === " ") {
            e.preventDefault();
            if (node.opening) onSelect(node.opening.id);
            if (hasChildren) state.toggleBranch(nodePath);
          }
        }}
      >
        {hasChildren && (
          <span className="tree-chevron">
            {isExpanded ? "\u25BE" : "\u25B8"}
          </span>
        )}
        <span className="tree-move">{node.move}</span>
        {node.opening && (
          <>
            <span className="tree-opening-name">{node.opening.name}</span>
            <span
              className={`tree-importance ${importanceClass(node.opening.importance)}`}
            >
              {importanceStars(node.opening.importance)}
            </span>
            <span className="tree-var-count">
              {node.opening.variationCount}{" "}
              {node.opening.variationCount === 1 ? "var" : "vars"}
            </span>
          </>
        )}
      </div>
      {isExpanded && visibleChildren.length > 0 && (
        <div className="tree-children">
          {visibleChildren.map((child) => (
            <TreeNode
              key={child.move}
              node={child}
              depth={depth + 1}
              parentPath={nodePath}
              state={state}
              onSelect={onSelect}
              onDirect={onDirect}
            />
          ))}
          {hiddenCount > 0 && !showRareChildren && (
            <div
              className="tree-show-more"
              style={{ paddingLeft: `${(depth + 1) * 1.25 + 0.5}rem` }}
              data-testid="show-more-link"
              onClick={() => state.toggleShowRare()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  state.toggleShowRare();
                }
              }}
            >
              ({hiddenCount} more...)
            </div>
          )}
        </div>
      )}
    </div>
  );
});

function hasMatchInSubtree(
  node: OpeningTreeNode,
  matchedIds: Set<string>,
): boolean {
  if (node.opening && matchedIds.has(node.opening.id)) return true;
  return node.children.some((child) => hasMatchInSubtree(child, matchedIds));
}

function getSubtreeMaxImportance(node: OpeningTreeNode): ImportanceRating {
  let max: ImportanceRating = node.opening?.importance ?? 1;
  for (const child of node.children) {
    const childMax = getSubtreeMaxImportance(child);
    if (childMax > max) max = childMax;
  }
  return max;
}

const OpeningSelectionScreen = observer(
  function OpeningSelectionScreen(): React.JSX.Element {
    const { mode } = useParams<{ mode: string }>();
    const navigate = useNavigate();

    const stateRef = useRef<OpeningTreeSelectorState | null>(null);
    if (stateRef.current === null) {
      stateRef.current = new OpeningTreeSelectorState();
    }
    const state = stateRef.current;

    // Auto-select first important opening if none selected
    useEffect(() => {
      if (!state.selectedOpeningId) {
        const firstImportant = catalog.find((o) => o.importance >= 2);
        if (firstImportant) {
          void state.selectOpening(firstImportant.id);
        }
      }
    }, [state]);

    const handleSelectVariation = (variationId: string): void => {
      navigate(
        `/train/${mode ?? "learn"}/${state.selectedOpeningId}?variation=${variationId}`,
      );
    };

    const handleSelectOpeningDirect = (openingId: string): void => {
      navigate(`/train/${mode ?? "learn"}/${openingId}`);
    };

    const handleSelectOpening = (openingId: string): void => {
      void state.selectOpening(openingId);
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
          {/* Left panel: category tree */}
          <div
            className="opening-master-list"
            data-testid="opening-master-list"
          >
            {categoryTrees.map((group) => {
              const isExpanded = state.isCategoryExpanded(group.key);
              const isSearching = state.isSearching;

              // When searching, skip categories with no matches
              if (
                isSearching &&
                !state.searchResults.matchedCategories.has(group.key)
              ) {
                return null;
              }

              return (
                <div
                  key={group.key}
                  className="category-section"
                  data-testid="category-section"
                >
                  <div
                    className="category-header"
                    data-testid="category-header"
                    onClick={() => state.toggleCategory(group.key)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        state.toggleCategory(group.key);
                      }
                    }}
                  >
                    <span className="category-chevron">
                      {isExpanded ? "\u25BE" : "\u25B8"}
                    </span>
                    <span className="category-label">{group.label}</span>
                    <span className="category-subtitle">{group.subtitle}</span>
                  </div>
                  {isExpanded && (
                    <div className="category-tree">
                      {group.roots.map((root) => (
                        <TreeNode
                          key={root.move}
                          node={root}
                          depth={0}
                          parentPath=""
                          state={state}
                          onSelect={handleSelectOpening}
                          onDirect={handleSelectOpeningDirect}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {state.isSearching && state.searchResults.matchedIds.size === 0 && (
              <div className="empty-state">No openings match your search.</div>
            )}
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
