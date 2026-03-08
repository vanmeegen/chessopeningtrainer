import type { Locator, Page } from "@playwright/test";

export class OpeningSelectionPage {
  readonly page: Page;
  readonly screen: Locator;
  readonly backButton: Locator;
  readonly searchInput: Locator;
  readonly openingList: Locator;
  readonly masterList: Locator;
  readonly variationList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.screen = page.getByTestId("opening-selection-screen");
    this.backButton = page.getByTestId("back-button");
    this.searchInput = page.getByTestId("opening-search");
    this.openingList = page.getByTestId("opening-list");
    this.masterList = page.getByTestId("opening-master-list");
    this.variationList = page.getByTestId("variation-list");
  }

  get openingItems() {
    return this.page.getByTestId("opening-item");
  }

  get variationItems() {
    return this.page.getByTestId("variation-item");
  }

  get trainAllButton() {
    return this.page.getByTestId("train-all-button");
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  async clearSearch() {
    await this.searchInput.clear();
  }

  /** Select an opening in the master list (loads its variations) */
  async selectOpeningByName(name: string) {
    await this.page
      .getByTestId("opening-item")
      .filter({ hasText: name })
      .first()
      .click();
  }

  /** Double-click an opening to navigate directly to training */
  async openOpeningByName(name: string) {
    await this.page
      .getByTestId("opening-item")
      .filter({ hasText: name })
      .first()
      .dblclick();
  }

  /** Click a variation to navigate to training with that variation */
  async selectVariationByName(name: string) {
    await this.page
      .getByTestId("variation-item")
      .filter({ hasText: name })
      .first()
      .click();
  }

  async goBack() {
    await this.backButton.click();
  }
}
