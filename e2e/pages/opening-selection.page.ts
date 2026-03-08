import type { Locator, Page } from "@playwright/test";

export class OpeningSelectionPage {
  readonly page: Page;
  readonly screen: Locator;
  readonly backButton: Locator;
  readonly searchInput: Locator;
  readonly openingList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.screen = page.getByTestId("opening-selection-screen");
    this.backButton = page.getByTestId("back-button");
    this.searchInput = page.getByTestId("opening-search");
    this.openingList = page.getByTestId("opening-list");
  }

  get openingItems() {
    return this.page.getByTestId("opening-item");
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  async clearSearch() {
    await this.searchInput.clear();
  }

  async selectOpeningByName(name: string) {
    await this.page
      .getByTestId("opening-item")
      .filter({ hasText: name })
      .first()
      .click();
  }

  async goBack() {
    await this.backButton.click();
  }
}
