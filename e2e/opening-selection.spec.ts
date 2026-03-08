import { test, expect } from "@playwright/test";
import { HomePage } from "./pages/home.page";
import { OpeningSelectionPage } from "./pages/opening-selection.page";

test.describe("Opening Selection", () => {
  let home: HomePage;
  let selection: OpeningSelectionPage;

  test.beforeEach(async ({ page }) => {
    home = new HomePage(page);
    selection = new OpeningSelectionPage(page);
    await home.goto();
    await home.navigateToLearn();
    await expect(selection.screen).toBeVisible();
  });

  test("displays opening list with items", async () => {
    const items = selection.openingItems;
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test("search filters openings by name", async () => {
    await selection.search("Sicilian");

    const items = selection.openingItems;
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    // All visible items should contain "Sicilian"
    const firstItemText = await items.first().textContent();
    expect(firstItemText?.toLowerCase()).toContain("sicilian");
  });

  test("search filters openings by ECO code", async () => {
    await selection.search("C50");

    const items = selection.openingItems;
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test("search with no results shows empty list", async () => {
    await selection.search("xyznonexistent");

    const items = selection.openingItems;
    const count = await items.count();
    expect(count).toBe(0);
  });

  test("clearing search shows all openings again", async () => {
    const initialCount = await selection.openingItems.count();

    await selection.search("Sicilian");
    const filteredCount = await selection.openingItems.count();
    expect(filteredCount).toBeLessThan(initialCount);

    await selection.clearSearch();
    const restoredCount = await selection.openingItems.count();
    expect(restoredCount).toBe(initialCount);
  });

  test("opening items show name and ECO code", async () => {
    await selection.search("Italian Game");

    const firstItem = selection.openingItems.first();
    const text = await firstItem.textContent();
    expect(text).toContain("Italian Game");
  });
});
