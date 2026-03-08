import { test, expect } from "@playwright/test";
import { HomePage } from "./pages/home.page";
import { OpeningSelectionPage } from "./pages/opening-selection.page";
import { TrainingPage } from "./pages/training.page";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

test.describe("Play Mode", () => {
  let training: TrainingPage;

  test.beforeEach(async ({ page }) => {
    const home = new HomePage(page);
    const selection = new OpeningSelectionPage(page);
    training = new TrainingPage(page);

    await home.goto();
    await home.navigateToPlay();
    await selection.openOpeningByName("Italian Game");

    await expect(training.screen).toBeVisible();
    await expect(training.boardArea).toBeVisible();
  });

  test("play controls are visible", async () => {
    await expect(training.playControls).toBeVisible();
    await expect(training.btnShowBookMove).toBeVisible();
    await expect(training.btnRestart).toBeVisible();
  });

  test("board starts at initial position", async () => {
    await expect(training.chessBoard).toBeVisible();
    const fen = await training.getBoardFen();
    expect(fen).toBe(STARTING_FEN);
  });

  test("restart button resets board to initial position", async () => {
    await expect(training.chessBoard).toBeVisible();
    const initialFen = await training.getBoardFen();

    await training.restart();

    const resetFen = await training.getBoardFen();
    expect(resetFen).toBe(initialFen);
    expect(resetFen).toBe(STARTING_FEN);
    await expect(training.boardArea).toBeVisible();
    await expect(training.playControls).toBeVisible();
  });
});
