import type { Locator, Page } from "@playwright/test";

export class SettingsPage {
  readonly page: Page;
  readonly screen: Locator;
  readonly backButton: Locator;
  readonly themeToggle: Locator;
  readonly boardColorPicker: Locator;
  readonly soundToggle: Locator;
  readonly exportButton: Locator;
  readonly importButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.screen = page.getByTestId("settings-screen");
    this.backButton = page.getByTestId("back-button");
    this.themeToggle = page.getByTestId("theme-toggle");
    this.boardColorPicker = page.getByTestId("board-color-picker");
    this.soundToggle = page.getByTestId("sound-toggle");
    this.exportButton = page.getByTestId("export-button");
    this.importButton = page.getByTestId("import-button");
  }

  async goto() {
    await this.page.goto("/settings");
  }

  async goBack() {
    await this.backButton.click();
  }

  async selectTheme(theme: "Light" | "Dark" | "System") {
    await this.themeToggle.getByRole("button", { name: theme }).click();
  }
}
