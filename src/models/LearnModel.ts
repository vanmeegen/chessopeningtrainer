import { action, computed, makeObservable, observable } from "mobx";
import { ChessGameModel } from "./ChessGameModel";
import { MoveTreeModel } from "./MoveTreeModel";
import type { BranchInfo } from "./MoveTreeModel";
import type { Color } from "../types/ChessTypes";
import type { Annotation, Opening } from "../types/OpeningTypes";

/**
 * Presentation model for Learn mode.
 * Drives both a MoveTreeModel (opening tree navigation) and
 * a ChessGameModel (board position display) in sync.
 */
export class LearnModel {
  readonly chessGame: ChessGameModel;
  readonly moveTree: MoveTreeModel;
  readonly playerColor: Color;

  isAutoPlaying = false;
  autoPlaySpeed = 1500;

  private _currentMoveIndex = 0;
  private _moveHistory: string[] = [];
  private autoPlayTimerId: ReturnType<typeof setInterval> | null = null;

  constructor(opening: Opening, variationId: string, playerColor: Color) {
    const variation = opening.variations.find((v) => v.id === variationId);
    if (!variation) {
      throw new Error(
        `Variation "${variationId}" not found in opening "${opening.id}"`,
      );
    }

    this.playerColor = playerColor;
    this.moveTree = new MoveTreeModel(variation.moves);
    this.chessGame = new ChessGameModel();

    // Initialize: sync the chess game to the root position
    this.chessGame.loadFen(this.moveTree.currentFen);
    this._moveHistory = [this.moveTree.currentMove];
    this._currentMoveIndex = 0;

    makeObservable<LearnModel, "_currentMoveIndex" | "_moveHistory">(this, {
      isAutoPlaying: observable,
      autoPlaySpeed: observable,
      _currentMoveIndex: observable,
      _moveHistory: observable,
      currentAnnotation: computed,
      availableBranches: computed,
      hasBranches: computed,
      canGoForward: computed,
      canGoBack: computed,
      currentMoveIndex: computed,
      moveHistory: computed,
      advance: action,
      goBack: action,
      goToStart: action,
      goToEnd: action,
      selectBranch: action,
      startAutoPlay: action,
      stopAutoPlay: action,
    });
  }

  get currentAnnotation(): Annotation | undefined {
    return this.moveTree.currentAnnotation;
  }

  get availableBranches(): BranchInfo[] {
    return this.moveTree.getBranches();
  }

  get hasBranches(): boolean {
    return this.availableBranches.length > 1;
  }

  get canGoForward(): boolean {
    return !this.moveTree.isAtEnd;
  }

  get canGoBack(): boolean {
    return !this.moveTree.isAtStart;
  }

  get currentMoveIndex(): number {
    return this._currentMoveIndex;
  }

  get moveHistory(): string[] {
    return [...this._moveHistory];
  }

  advance(): void {
    if (this.moveTree.isAtEnd) {
      return;
    }
    this.moveTree.advance();
    this._syncChessGame();
    this._currentMoveIndex++;
    this._moveHistory.push(this.moveTree.currentMove);
  }

  goBack(): void {
    if (this.moveTree.isAtStart) {
      return;
    }
    this.moveTree.goBack();
    this._syncChessGame();
    this._currentMoveIndex--;
    this._moveHistory.pop();
  }

  goToStart(): void {
    this.moveTree.goToStart();
    this._syncChessGame();
    this._currentMoveIndex = 0;
    this._moveHistory = [this.moveTree.currentMove];
  }

  goToEnd(): void {
    this.moveTree.goToEnd();
    this._syncChessGame();
    // Rebuild history by walking the tree from root via getMainLine
    const mainLine = this.moveTree.getMainLine();
    this._moveHistory = mainLine;
    this._currentMoveIndex = mainLine.length - 1;
  }

  selectBranch(move: string): void {
    const branches = this.moveTree.getBranches();
    const exists = branches.some((b) => b.move === move);
    if (!exists) {
      return;
    }
    this.moveTree.advance(move);
    this._syncChessGame();
    this._currentMoveIndex++;
    this._moveHistory.push(this.moveTree.currentMove);
  }

  startAutoPlay(): void {
    if (this.isAutoPlaying) {
      return;
    }
    this.isAutoPlaying = true;
    this.autoPlayTimerId = setInterval(() => {
      if (this.moveTree.isAtEnd) {
        this.stopAutoPlay();
        return;
      }
      this.advance();
    }, this.autoPlaySpeed);
  }

  stopAutoPlay(): void {
    this.isAutoPlaying = false;
    if (this.autoPlayTimerId !== null) {
      clearInterval(this.autoPlayTimerId);
      this.autoPlayTimerId = null;
    }
  }

  dispose(): void {
    this.stopAutoPlay();
  }

  private _syncChessGame(): void {
    this.chessGame.loadFen(this.moveTree.currentFen);
  }
}
