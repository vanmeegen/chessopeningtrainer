import { useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { observer } from "mobx-react-lite";
import { observable, runInAction } from "mobx";
import {
  loadOpeningCatalog,
  loadOpeningData,
} from "../utils/OpeningDataLoader";
import { mergeVariationTrees } from "../utils/mergeVariationTrees";
import { LearnModel } from "../models/LearnModel";
import { PlayModel } from "../models/PlayModel";
import { MemorizeModel } from "../models/MemorizeModel";
import { ReviewSessionModel } from "../models/ReviewSessionModel";
import { CardStore } from "../models/CardStore";
import { ChessBoard } from "./ChessBoard";
import { AnnotationPanel } from "./AnnotationPanel";
import { LearnControls } from "./LearnControls";
import { BranchSelector } from "./BranchSelector";
import { PlayControls } from "./PlayControls";
import { MemorizeControls } from "./MemorizeControls";
import { SessionSummaryView } from "./SessionSummaryView";
import type { OpeningCatalogEntry } from "../types/OpeningTypes";
import type { Square } from "../types/ChessTypes";

const catalog: OpeningCatalogEntry[] = loadOpeningCatalog();

type LearnState = {
  learnModel: LearnModel | null;
  loading: boolean;
  error: string | null;
};

function createLearnState(): LearnState {
  return observable({
    learnModel: null,
    loading: true,
    error: null,
  });
}

/** Move list display for learn mode using SAN strings */
function LearnMoveList({
  moves,
  currentMoveIndex,
}: {
  moves: string[];
  currentMoveIndex: number;
}): React.JSX.Element {
  const pairs: Array<{
    moveNumber: number;
    white: { san: string; index: number };
    black?: { san: string; index: number };
  }> = [];
  for (let i = 0; i < moves.length; i += 2) {
    const white = moves[i]!;
    const black = moves[i + 1];
    pairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: { san: white, index: i },
      black: black ? { san: black, index: i + 1 } : undefined,
    });
  }

  return (
    <div
      data-testid="learn-move-list"
      style={{
        maxHeight: "200px",
        overflowY: "auto",
        padding: "8px",
        fontFamily: "monospace",
        fontSize: "14px",
      }}
    >
      {pairs.map((pair) => (
        <div
          key={pair.moveNumber}
          style={{ display: "flex", gap: "4px", marginBottom: "2px" }}
        >
          <span
            style={{
              minWidth: "28px",
              textAlign: "right",
              color: "var(--text-secondary)",
              marginRight: "4px",
            }}
          >
            {pair.moveNumber}.
          </span>
          <span
            data-testid="learn-move-item"
            style={{
              padding: "2px 6px",
              borderRadius: "3px",
              minWidth: "48px",
              ...(currentMoveIndex === pair.white.index
                ? {
                    backgroundColor: "rgba(155, 199, 0, 0.5)",
                    fontWeight: "bold",
                  }
                : {}),
            }}
          >
            {pair.white.san}
          </span>
          {pair.black != null && (
            <span
              data-testid="learn-move-item"
              style={{
                padding: "2px 6px",
                borderRadius: "3px",
                minWidth: "48px",
                ...(currentMoveIndex === pair.black.index
                  ? {
                      backgroundColor: "rgba(155, 199, 0, 0.5)",
                      fontWeight: "bold",
                    }
                  : {}),
              }}
            >
              {pair.black.san}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

const LearnModeContent = observer(function LearnModeContent({
  learnModel,
}: {
  learnModel: LearnModel;
}) {
  const orientation = learnModel.playerColor === "w" ? "white" : "black";

  const handleMove = (): boolean => {
    // In learn mode, the board is not interactive for making moves
    return false;
  };

  const handleSquareClick = (): void => {
    // No-op in learn mode
  };

  const handleToggleAutoPlay = (): void => {
    if (learnModel.isAutoPlaying) {
      learnModel.stopAutoPlay();
    } else {
      learnModel.startAutoPlay();
    }
  };

  return (
    <>
      <div className="board-area" data-testid="board-area">
        <ChessBoard
          position={learnModel.chessGame.position}
          orientation={orientation}
          onMove={handleMove}
          interactive={false}
          selectedSquare={null}
          legalMoveSquares={[]}
          lastMoveFrom={null}
          lastMoveTo={null}
          onSquareClick={handleSquareClick}
        />
      </div>
      <div className="info-panel" data-testid="info-panel">
        <LearnControls
          canGoBack={learnModel.canGoBack}
          canGoForward={learnModel.canGoForward}
          isAutoPlaying={learnModel.isAutoPlaying}
          onGoToStart={() => learnModel.goToStart()}
          onGoBack={() => learnModel.goBack()}
          onAdvance={() => learnModel.advance()}
          onGoToEnd={() => learnModel.goToEnd()}
          onToggleAutoPlay={handleToggleAutoPlay}
        />
        <AnnotationPanel annotation={learnModel.currentAnnotation} />
        <LearnMoveList
          moves={learnModel.moveHistory}
          currentMoveIndex={learnModel.currentMoveIndex}
        />
        {learnModel.hasBranches && (
          <BranchSelector
            branches={learnModel.availableBranches}
            onSelectBranch={(move) => learnModel.selectBranch(move)}
          />
        )}
      </div>
    </>
  );
});

type PlayState = {
  playModel: PlayModel | null;
  loading: boolean;
  error: string | null;
};

function createPlayState(): PlayState {
  return observable({
    playModel: null,
    loading: true,
    error: null,
  });
}

const PlayModeContent = observer(function PlayModeContent({
  playModel,
}: {
  playModel: PlayModel;
}) {
  const orientation = playModel.playerColor === "w" ? "white" : "black";
  const isPlayerTurn = playModel.chessGame.turn === playModel.playerColor;

  const handleMove = (from: Square, to: Square): boolean => {
    if (!isPlayerTurn) return false;
    return playModel.handleUserMove(from, to);
  };

  const handleSquareClick = (): void => {
    // Click-to-move could be implemented here in the future
  };

  const lastMove =
    playModel.chessGame.moveHistory.length > 0
      ? playModel.chessGame.moveHistory[
          playModel.chessGame.moveHistory.length - 1
        ]!
      : null;

  return (
    <>
      <div className="board-area" data-testid="board-area">
        <ChessBoard
          position={playModel.chessGame.position}
          orientation={orientation}
          onMove={handleMove}
          interactive={isPlayerTurn}
          selectedSquare={null}
          legalMoveSquares={[]}
          lastMoveFrom={lastMove?.from ?? null}
          lastMoveTo={lastMove?.to ?? null}
          onSquareClick={handleSquareClick}
        />
      </div>
      <div className="info-panel" data-testid="info-panel">
        {playModel.currentOpeningName && (
          <div className="info-panel-title" data-testid="play-opening-name">
            {playModel.currentOpeningName}
            {playModel.currentVariationName && (
              <span> &mdash; {playModel.currentVariationName}</span>
            )}
          </div>
        )}
        <PlayControls
          assessment={playModel.lastMoveAssessment}
          assessmentMessage={playModel.assessmentMessage}
          bookMoveHint={playModel.bookMoveHint}
          isOutOfBook={playModel.isOutOfBook}
          canGoBack={playModel.canGoBack}
          canGoForward={playModel.canGoForward}
          onShowBookMove={() => playModel.showBookMove()}
          onRestart={() => playModel.restart()}
          onUndo={() => playModel.undoMove()}
          onRedo={() => playModel.redoMove()}
        />
      </div>
    </>
  );
});

type MemorizeState = {
  memorizeModel: MemorizeModel | null;
  loading: boolean;
  error: string | null;
};

function createMemorizeState(): MemorizeState {
  return observable({
    memorizeModel: null,
    loading: true,
    error: null,
  });
}

const MemorizeModeContent = observer(function MemorizeModeContent({
  memorizeModel,
  onBack,
}: {
  memorizeModel: MemorizeModel;
  onBack: () => void;
}) {
  const orientation = memorizeModel.playerColor === "w" ? "white" : "black";

  if (memorizeModel.isSessionComplete) {
    return (
      <div className="info-panel" data-testid="info-panel">
        <SessionSummaryView
          summary={memorizeModel.session.summary}
          onRestart={() => {
            memorizeModel.session.restart();
            memorizeModel.nextCard();
          }}
          onBack={onBack}
        />
      </div>
    );
  }

  const isPlayerTurn =
    memorizeModel.chessGame.turn === memorizeModel.playerColor;

  const handleMove = (from: Square, to: Square): boolean => {
    if (!isPlayerTurn) return false;
    memorizeModel.attemptMove(from, to);
    return memorizeModel.lastMoveCorrect === true;
  };

  const handleSquareClick = (): void => {
    // Click-to-move could be implemented here in the future
  };

  const lastMove =
    memorizeModel.chessGame.moveHistory.length > 0
      ? memorizeModel.chessGame.moveHistory[
          memorizeModel.chessGame.moveHistory.length - 1
        ]!
      : null;

  return (
    <>
      <div className="board-area" data-testid="board-area">
        <ChessBoard
          position={memorizeModel.chessGame.position}
          orientation={orientation}
          onMove={handleMove}
          interactive={isPlayerTurn && memorizeModel.lastMoveCorrect === null}
          selectedSquare={memorizeModel.hintSquare}
          legalMoveSquares={[]}
          lastMoveFrom={lastMove?.from ?? null}
          lastMoveTo={lastMove?.to ?? null}
          onSquareClick={handleSquareClick}
        />
      </div>
      <div className="info-panel" data-testid="info-panel">
        <MemorizeControls model={memorizeModel} />
      </div>
    </>
  );
});

const TrainingScreen = observer(function TrainingScreen(): React.JSX.Element {
  const { mode, openingId } = useParams<{
    mode: string;
    openingId: string;
  }>();
  const [searchParams] = useSearchParams();
  const variationParam = searchParams.get("variation");
  const navigate = useNavigate();

  const opening = catalog.find((o) => o.id === openingId);
  const openingName = opening?.name ?? "Unknown Opening";

  const learnStateRef = useRef<LearnState | null>(null);
  if (learnStateRef.current === null) {
    learnStateRef.current = createLearnState();
  }
  const learnState = learnStateRef.current;

  const playStateRef = useRef<PlayState | null>(null);
  if (playStateRef.current === null) {
    playStateRef.current = createPlayState();
  }
  const playState = playStateRef.current;

  const memorizeStateRef = useRef<MemorizeState | null>(null);
  if (memorizeStateRef.current === null) {
    memorizeStateRef.current = createMemorizeState();
  }
  const memorizeState = memorizeStateRef.current;

  useEffect(() => {
    if (mode !== "learn" || !openingId) {
      return;
    }

    let disposed = false;

    async function load(): Promise<void> {
      try {
        const openingData = await loadOpeningData(openingId!);
        if (disposed) return;
        let effectiveOpening = openingData;
        let variationId = variationParam ?? "";
        if (!variationParam && openingData.variations.length > 1) {
          // "Train All": merge all variation trees into one
          const mergedMoves = mergeVariationTrees(openingData.variations);
          const mergedVariation = {
            id: "__merged__",
            name: "All Variations",
            moves: mergedMoves,
            pgn: "",
          };
          effectiveOpening = {
            ...openingData,
            variations: [mergedVariation],
          };
          variationId = "__merged__";
        } else if (!variationParam && openingData.variations.length > 0) {
          variationId = openingData.variations[0]!.id;
        }
        const model = new LearnModel(effectiveOpening, variationId, "w");
        runInAction(() => {
          learnState.learnModel = model;
          learnState.loading = false;
        });
      } catch (err) {
        if (disposed) return;
        runInAction(() => {
          learnState.error =
            err instanceof Error ? err.message : "Failed to load opening data";
          learnState.loading = false;
        });
      }
    }

    void load();

    return () => {
      disposed = true;
      if (learnState.learnModel) {
        learnState.learnModel.dispose();
      }
    };
  }, [mode, openingId, variationParam, learnState]);

  useEffect(() => {
    if (mode !== "play" || !openingId) {
      return;
    }

    let disposed = false;

    async function load(): Promise<void> {
      try {
        let playOpeningData = await loadOpeningData(openingId!);
        if (disposed) return;
        let playVariationId = variationParam;
        if (!variationParam && playOpeningData.variations.length > 1) {
          const mergedMoves = mergeVariationTrees(playOpeningData.variations);
          playOpeningData = {
            ...playOpeningData,
            variations: [
              {
                id: "__merged__",
                name: "All Variations",
                moves: mergedMoves,
                pgn: "",
              },
            ],
          };
          playVariationId = "__merged__";
        }
        const model = new PlayModel(
          playOpeningData,
          playVariationId ?? undefined,
          "w",
        );
        runInAction(() => {
          playState.playModel = model;
          playState.loading = false;
        });
      } catch (err) {
        if (disposed) return;
        runInAction(() => {
          playState.error =
            err instanceof Error ? err.message : "Failed to load opening data";
          playState.loading = false;
        });
      }
    }

    void load();

    return () => {
      disposed = true;
    };
  }, [mode, openingId, variationParam, playState]);

  useEffect(() => {
    if (mode !== "memorize" || !openingId) {
      return;
    }

    let disposed = false;

    async function load(): Promise<void> {
      try {
        const openingData = await loadOpeningData(openingId!);
        if (disposed) return;

        const cardStore = new CardStore();
        const playerColor = "w" as const;

        // Create cards for all variations
        for (const variation of openingData.variations) {
          cardStore.createCardsForVariation(
            openingData,
            variation.id,
            playerColor,
          );
        }

        const dueCards = cardStore.getCardsDueToday();
        const session = new ReviewSessionModel(dueCards);
        const model = new MemorizeModel(session, playerColor, openingData);

        runInAction(() => {
          memorizeState.memorizeModel = model;
          memorizeState.loading = false;
        });
      } catch (err) {
        if (disposed) return;
        runInAction(() => {
          memorizeState.error =
            err instanceof Error ? err.message : "Failed to load opening data";
          memorizeState.loading = false;
        });
      }
    }

    void load();

    return () => {
      disposed = true;
    };
  }, [mode, openingId, memorizeState]);

  const isLearnMode = mode === "learn";
  const isPlayMode = mode === "play";
  const isMemorizeMode = mode === "memorize";

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
        {isLearnMode && learnState.loading && (
          <div data-testid="loading-indicator" className="board-area">
            Loading...
          </div>
        )}
        {isLearnMode && learnState.error && (
          <div data-testid="error-message" className="board-area">
            Error: {learnState.error}
          </div>
        )}
        {isLearnMode && learnState.learnModel && (
          <LearnModeContent learnModel={learnState.learnModel} />
        )}
        {isPlayMode && playState.loading && (
          <div data-testid="loading-indicator" className="board-area">
            Loading...
          </div>
        )}
        {isPlayMode && playState.error && (
          <div data-testid="error-message" className="board-area">
            Error: {playState.error}
          </div>
        )}
        {isPlayMode && playState.playModel && (
          <PlayModeContent playModel={playState.playModel} />
        )}
        {isMemorizeMode && memorizeState.loading && (
          <div data-testid="loading-indicator" className="board-area">
            Loading...
          </div>
        )}
        {isMemorizeMode && memorizeState.error && (
          <div data-testid="error-message" className="board-area">
            Error: {memorizeState.error}
          </div>
        )}
        {isMemorizeMode && memorizeState.memorizeModel && (
          <MemorizeModeContent
            memorizeModel={memorizeState.memorizeModel}
            onBack={() => navigate(`/select/${mode ?? "learn"}`)}
          />
        )}
        {!isLearnMode && !isPlayMode && !isMemorizeMode && (
          <>
            <div className="board-area" data-testid="board-area">
              Board goes here
            </div>
            <div className="info-panel" data-testid="info-panel">
              <div className="info-panel-title">{openingName}</div>
              <p>
                Mode: {mode ?? "learn"} | ECO: {opening?.eco ?? "\u2014"}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export default TrainingScreen;
