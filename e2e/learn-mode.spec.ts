import { test, expect } from "@playwright/test";
import { HomePage } from "./pages/home.page";
import { OpeningSelectionPage } from "./pages/opening-selection.page";
import { TrainingPage } from "./pages/training.page";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

test.describe("Learn Mode", () => {
  let training: TrainingPage;

  test.beforeEach(async ({ page }) => {
    const home = new HomePage(page);
    const selection = new OpeningSelectionPage(page);
    training = new TrainingPage(page);

    await home.goto();
    await home.navigateToLearn();
    await selection.openOpeningByName("Italian Game");

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

  test("advancing a move changes the board position", async () => {
    await expect(training.chessBoard).toBeVisible();
    const initialFen = await training.getBoardFen();

    await training.advanceMove();

    const newFen = await training.getBoardFen();
    expect(newFen).not.toBe(initialFen);
    expect(newFen).not.toBe(STARTING_FEN);
  });

  test("going back restores the previous board position", async () => {
    await expect(training.chessBoard).toBeVisible();
    const initialFen = await training.getBoardFen();

    await training.advanceMove();
    const afterAdvanceFen = await training.getBoardFen();
    expect(afterAdvanceFen).not.toBe(initialFen);

    await training.goBackMove();
    const afterBackFen = await training.getBoardFen();
    expect(afterBackFen).toBe(initialFen);
  });

  test("go to start returns board to initial position", async () => {
    await expect(training.chessBoard).toBeVisible();
    const initialFen = await training.getBoardFen();

    await training.advanceMove();
    await training.advanceMove();
    await training.advanceMove();
    const advancedFen = await training.getBoardFen();
    expect(advancedFen).not.toBe(initialFen);

    await training.goToStart();
    const resetFen = await training.getBoardFen();
    expect(resetFen).toBe(initialFen);
    await expect(training.btnBack).toBeDisabled();
  });

  test("go to end changes board to final position", async () => {
    await expect(training.chessBoard).toBeVisible();
    const initialFen = await training.getBoardFen();

    await training.goToEnd();

    const endFen = await training.getBoardFen();
    expect(endFen).not.toBe(initialFen);
    await expect(training.btnForward).toBeDisabled();
  });

  test("each advance produces a different position", async () => {
    await expect(training.chessBoard).toBeVisible();
    const positions: string[] = [await training.getBoardFen()];

    for (let i = 0; i < 4; i++) {
      await training.advanceMove();
      const fen = await training.getBoardFen();
      expect(positions).not.toContain(fen);
      positions.push(fen);
    }

    // All 5 positions should be unique
    expect(new Set(positions).size).toBe(5);
  });

  test("annotation panel shows strategic explanation", async () => {
    await training.advanceMove();

    const annotation = training.annotationPanel;
    await expect(annotation).toBeVisible();
    const text = await annotation.textContent();
    expect(text?.length).toBeGreaterThan(0);
  });
});
