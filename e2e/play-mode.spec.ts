import { test, expect } from "@playwright/test";
import { HomePage } from "./pages/home.page";
import { OpeningSelectionPage } from "./pages/opening-selection.page";
import { TrainingPage } from "./pages/training.page";

test.describe("Play Mode", () => {
  let training: TrainingPage;

  test.beforeEach(async ({ page }) => {
    const home = new HomePage(page);
    const selection = new OpeningSelectionPage(page);
    training = new TrainingPage(page);

    await home.goto();
    await home.navigateToPlay();
    await selection.selectOpeningByName("Italian Game");

    await expect(training.screen).toBeVisible();
    await expect(training.boardArea).toBeVisible();
  });

  test("play controls are visible", async () => {
    await expect(training.playControls).toBeVisible();
    await expect(training.btnShowBookMove).toBeVisible();
    await expect(training.btnRestart).toBeVisible();
  });

  test("show book move button is present", async () => {
    await expect(training.btnShowBookMove).toBeVisible();
  });

  test("restart button resets the game", async () => {
    await training.restart();

    // After restart, the board should still be visible
    await expect(training.boardArea).toBeVisible();
    await expect(training.playControls).toBeVisible();
  });
});
