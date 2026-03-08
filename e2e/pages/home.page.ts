import type { Locator, Page } from "@playwright/test";

export class HomePage {
  readonly page: Page;
  readonly screen: Locator;
  readonly learnCard: Locator;
  readonly memorizeCard: Locator;
  readonly playCard: Locator;
  readonly settingsButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.screen = page.getByTestId("home-screen");
    this.learnCard = page.getByTestId("learn-card");
    this.memorizeCard = page.getByTestId("memorize-card");
    this.playCard = page.getByTestId("play-card");
    this.settingsButton = page.getByTestId("settings-button");
  }

  async goto() {
    await this.page.goto("/");
  }

  async navigateToLearn() {
    await this.learnCard.click();
  }

  async navigateToMemorize() {
    await this.memorizeCard.click();
  }

  async navigateToPlay() {
    await this.playCard.click();
  }

  async navigateToSettings() {
    await this.settingsButton.click();
  }
}
