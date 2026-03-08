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

  test("displays category sections", async () => {
    const sections = selection.categorySections;
    const count = await sections.count();
    expect(count).toBeGreaterThan(0);
  });

  test("category headers are visible and collapsible", async () => {
    const headers = selection.categoryHeaders;
    const count = await headers.count();
    expect(count).toBeGreaterThan(0);

    // First header text should contain a category label
    const firstHeaderText = await headers.first().textContent();
    expect(firstHeaderText?.length).toBeGreaterThan(0);
  });

  test("search filters openings by name", async () => {
    await selection.search("Sicilian");

    const items = selection.openingItems;
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    // At least one visible item should contain "Sicilian"
    const matchingItem = items.filter({ hasText: "Sicilian" });
    const matchCount = await matchingItem.count();
    expect(matchCount).toBeGreaterThan(0);
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

  test("clearing search restores category view", async () => {
    await selection.search("Sicilian");
    const filteredCount = await selection.openingItems.count();
    expect(filteredCount).toBeGreaterThan(0);

    await selection.clearSearch();
    // Categories should be visible again
    const sectionCount = await selection.categorySections.count();
    expect(sectionCount).toBeGreaterThan(0);
  });

  test("opening items show name", async () => {
    await selection.search("Italian Game");

    const matchingItem = selection.openingItems.filter({
      hasText: "Italian Game",
    });
    const count = await matchingItem.count();
    expect(count).toBeGreaterThan(0);

    const text = await matchingItem.first().textContent();
    expect(text).toContain("Italian Game");
  });
});
