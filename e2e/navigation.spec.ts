import { test, expect } from "@playwright/test";
import { HomePage } from "./pages/home.page";
import { OpeningSelectionPage } from "./pages/opening-selection.page";
import { TrainingPage } from "./pages/training.page";
import { SettingsPage } from "./pages/settings.page";

test.describe("Navigation", () => {
  test("home screen renders all three mode cards", async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.screen).toBeVisible();
    await expect(home.learnCard).toBeVisible();
    await expect(home.memorizeCard).toBeVisible();
    await expect(home.playCard).toBeVisible();
    await expect(home.settingsButton).toBeVisible();
  });

  test("navigate from home to learn opening selection", async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.navigateToLearn();

    const selection = new OpeningSelectionPage(page);
    await expect(selection.screen).toBeVisible();
    await expect(selection.searchInput).toBeVisible();
    await expect(selection.openingList).toBeVisible();
  });

  test("navigate from home to memorize opening selection", async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.navigateToMemorize();

    const selection = new OpeningSelectionPage(page);
    await expect(selection.screen).toBeVisible();
  });

  test("navigate from home to play opening selection", async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.navigateToPlay();

    const selection = new OpeningSelectionPage(page);
    await expect(selection.screen).toBeVisible();
  });

  test("navigate from home to settings and back", async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.navigateToSettings();

    const settings = new SettingsPage(page);
    await expect(settings.screen).toBeVisible();

    await settings.goBack();
    await expect(home.screen).toBeVisible();
  });

  test("navigate from opening selection back to home", async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.navigateToLearn();

    const selection = new OpeningSelectionPage(page);
    await expect(selection.screen).toBeVisible();

    await selection.goBack();
    await expect(home.screen).toBeVisible();
  });

  test("navigate from opening selection to training screen", async ({
    page,
  }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.navigateToLearn();

    const selection = new OpeningSelectionPage(page);
    await selection.selectOpeningByName("Italian Game");

    // Wait for variations to load and click Train All
    await expect(selection.trainAllButton).toBeVisible();
    await selection.trainAllButton.click();

    const training = new TrainingPage(page);
    await expect(training.screen).toBeVisible();
  });

  test("navigate from training screen back to opening selection", async ({
    page,
  }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.navigateToLearn();

    const selection = new OpeningSelectionPage(page);
    await selection.openOpeningByName("Italian Game");

    const training = new TrainingPage(page);
    await expect(training.screen).toBeVisible();

    await training.goBack();
    await expect(selection.screen).toBeVisible();
  });
});
