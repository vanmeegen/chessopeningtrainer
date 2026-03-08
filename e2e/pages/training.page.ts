import type { Locator, Page } from "@playwright/test";

export class TrainingPage {
  readonly page: Page;
  readonly screen: Locator;
  readonly backButton: Locator;
  readonly boardArea: Locator;
  readonly infoPanel: Locator;
  readonly chessBoard: Locator;
  readonly annotationPanel: Locator;
  readonly loadingIndicator: Locator;
  readonly errorMessage: Locator;

  // Learn mode controls
  readonly learnControls: Locator;
  readonly btnStart: Locator;
  readonly btnBack: Locator;
  readonly btnForward: Locator;
  readonly btnEnd: Locator;
  readonly btnAutoplay: Locator;
  readonly branchSelector: Locator;

  // Memorize mode controls
  readonly memorizeControls: Locator;
  readonly btnHint: Locator;
  readonly btnNextCard: Locator;
  readonly progressBar: Locator;
  readonly feedbackMessage: Locator;
  readonly sessionSummary: Locator;

  // Play mode controls
  readonly playControls: Locator;
  readonly btnShowBookMove: Locator;
  readonly btnRestart: Locator;
  readonly moveAssessmentBadge: Locator;
  readonly assessmentMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.screen = page.getByTestId("training-screen");
    this.backButton = page.getByTestId("back-button");
    this.boardArea = page.getByTestId("board-area");
    this.infoPanel = page.getByTestId("info-panel");
    this.chessBoard = page.getByTestId("chess-board");
    this.annotationPanel = page.getByTestId("annotation-panel");
    this.loadingIndicator = page.getByTestId("loading-indicator");
    this.errorMessage = page.getByTestId("error-message");

    // Learn
    this.learnControls = page.getByTestId("learn-controls");
    this.btnStart = page.getByTestId("btn-start");
    this.btnBack = page.getByTestId("btn-back");
    this.btnForward = page.getByTestId("btn-forward");
    this.btnEnd = page.getByTestId("btn-end");
    this.btnAutoplay = page.getByTestId("btn-autoplay");
    this.branchSelector = page.getByTestId("branch-selector");

    // Memorize
    this.memorizeControls = page.getByTestId("memorize-controls");
    this.btnHint = page.getByTestId("btn-hint");
    this.btnNextCard = page.getByTestId("btn-next-card");
    this.progressBar = page.getByTestId("progress-bar");
    this.feedbackMessage = page.getByTestId("feedback-message");
    this.sessionSummary = page.getByTestId("session-summary");

    // Play
    this.playControls = page.getByTestId("play-controls");
    this.btnShowBookMove = page.getByTestId("btn-show-book-move");
    this.btnRestart = page.getByTestId("btn-restart");
    this.moveAssessmentBadge = page.getByTestId("move-assessment-badge");
    this.assessmentMessage = page.getByTestId("assessment-message");
  }

  async goBack() {
    await this.backButton.click();
  }

  async advanceMove() {
    await this.btnForward.click();
  }

  async goBackMove() {
    await this.btnBack.click();
  }

  async goToStart() {
    await this.btnStart.click();
  }

  async goToEnd() {
    await this.btnEnd.click();
  }

  async toggleAutoplay() {
    await this.btnAutoplay.click();
  }

  async selectBranch(move: string) {
    await this.page
      .getByTestId("branch-option")
      .filter({ hasText: move })
      .click();
  }

  async useHint() {
    await this.btnHint.click();
  }

  async showBookMove() {
    await this.btnShowBookMove.click();
  }

  async restart() {
    await this.btnRestart.click();
  }
}
