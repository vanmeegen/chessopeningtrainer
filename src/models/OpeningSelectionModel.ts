import { makeAutoObservable, runInAction } from "mobx";
import type { Opening } from "../types/OpeningTypes";
import { loadOpeningData } from "../utils/OpeningDataLoader";

/**
 * MobX observable model managing the opening selection flow.
 * Handles loading full opening data on demand and tracking the selected variation.
 */
export class OpeningSelectionModel {
  selectedOpening: Opening | null = null;
  isLoading: boolean = false;
  error: string | null = null;

  private _selectedVariationId: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  get selectedVariationId(): string | null {
    return this._selectedVariationId;
  }

  async loadOpening(openingId: string): Promise<void> {
    this.isLoading = true;
    this.error = null;
    this._selectedVariationId = null;

    try {
      const opening = await loadOpeningData(openingId);
      runInAction(() => {
        this.selectedOpening = opening;
        this.isLoading = false;
      });
    } catch (err) {
      runInAction(() => {
        this.error =
          err instanceof Error ? err.message : "Failed to load opening";
        this.isLoading = false;
      });
    }
  }

  selectVariation(variationId: string): void {
    this._selectedVariationId = variationId;
  }

  clearSelection(): void {
    this.selectedOpening = null;
    this._selectedVariationId = null;
    this.error = null;
  }
}
