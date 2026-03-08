import { test, expect } from "@playwright/test";
import { HomePage } from "./pages/home.page";
import { OpeningSelectionPage } from "./pages/opening-selection.page";
import { TrainingPage } from "./pages/training.page";

test.describe("Learn Mode", () => {
  let training: TrainingPage;

  test.beforeEach(async ({ page }) => {
    const home = new HomePage(page);
    const selection = new OpeningSelectionPage(page);
    training = new TrainingPage(page);

    await home.goto();
    await home.navigateToLearn();
    await selection.selectOpeningByName("Italian Game");

    // Wait for training screen to load
    await expect(training.screen).toBeVisible();
    await expect(training.boardArea).toBeVisible();
  });

  test("training screen shows board and info panel", async () => {
    await expect(training.boardArea).toBeVisible();
    await expect(training.infoPanel).toBeVisible();
  });

  test("learn controls are visible", async () => {
    await expect(training.learnControls).toBeVisible();
    await expect(training.btnForward).toBeVisible();
    await expect(training.btnBack).toBeVisible();
    await expect(training.btnStart).toBeVisible();
    await expect(training.btnEnd).toBeVisible();
  });

  test("can advance through moves with forward button", async () => {
    // Get initial annotation text
    await expect(training.annotationPanel).toBeVisible();

    // Advance a move
    await training.advanceMove();

    // Board should have updated (annotation panel should still be visible)
    await expect(training.annotationPanel).toBeVisible();
  });

  test("can go back after advancing", async () => {
    await training.advanceMove();
    await training.advanceMove();

    // Go back
    await training.goBackMove();

    // Should still show board and controls
    await expect(training.boardArea).toBeVisible();
    await expect(training.learnControls).toBeVisible();
  });

  test("go to start returns to initial position", async () => {
    await training.advanceMove();
    await training.advanceMove();
    await training.advanceMove();

    await training.goToStart();

    // Back button should be disabled at start
    await expect(training.btnBack).toBeDisabled();
  });

  test("go to end advances to last move", async () => {
    await training.goToEnd();

    // Forward button should be disabled at end
    await expect(training.btnForward).toBeDisabled();
  });

  test("annotation panel shows strategic explanation", async () => {
    await training.advanceMove();

    const annotation = training.annotationPanel;
    await expect(annotation).toBeVisible();
    const text = await annotation.textContent();
    expect(text?.length).toBeGreaterThan(0);
  });
});
