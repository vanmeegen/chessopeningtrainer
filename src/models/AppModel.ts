import { makeAutoObservable } from "mobx";
import type { Color } from "../types/ChessTypes";

/** Available training modes in the application */
export type TrainingMode = "learn" | "memorize" | "play";

/**
 * Root application store managing navigation and UI state.
 * Tracks the current mode, selected opening/variation, and player color.
 */
export class AppModel {
  currentMode: TrainingMode | null = null;
  selectedOpeningId: string | null = null;
  selectedVariationId: string | null = null;
  playerColor: Color = "w";

  constructor() {
    makeAutoObservable(this);
  }

  setMode(mode: TrainingMode | null): void {
    this.currentMode = mode;
  }

  selectOpening(openingId: string, variationId?: string): void {
    this.selectedOpeningId = openingId;
    this.selectedVariationId = variationId ?? null;
  }

  setPlayerColor(color: Color): void {
    this.playerColor = color;
  }

  resetSelection(): void {
    this.selectedOpeningId = null;
    this.selectedVariationId = null;
  }
}
