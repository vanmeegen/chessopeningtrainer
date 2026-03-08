import { test, expect } from "@playwright/test";
import { HomePage } from "./pages/home.page";
import { SettingsPage } from "./pages/settings.page";

test.describe("Settings", () => {
  let settings: SettingsPage;

  test.beforeEach(async ({ page }) => {
    const home = new HomePage(page);
    settings = new SettingsPage(page);
    await home.goto();
    await home.navigateToSettings();
    await expect(settings.screen).toBeVisible();
  });

  test("settings screen shows all controls", async () => {
    await expect(settings.themeToggle).toBeVisible();
    await expect(settings.boardColorPicker).toBeVisible();
    await expect(settings.soundToggle).toBeVisible();
    await expect(settings.exportButton).toBeVisible();
    await expect(settings.importButton).toBeVisible();
  });

  test("can toggle dark theme", async ({ page }) => {
    await settings.selectTheme("Dark");

    // Verify the theme attribute is set on the document
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );
    expect(theme).toBe("dark");
  });

  test("can toggle light theme", async ({ page }) => {
    // First set dark, then light
    await settings.selectTheme("Dark");
    await settings.selectTheme("Light");

    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );
    expect(theme).toBe("light");
  });

  test("theme persists after navigating away and back", async ({ page }) => {
    await settings.selectTheme("Dark");

    // Navigate away
    await settings.goBack();
    const home = new HomePage(page);
    await expect(home.screen).toBeVisible();

    // Navigate back to settings
    await home.navigateToSettings();
    await expect(settings.screen).toBeVisible();

    // Theme should still be dark
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );
    expect(theme).toBe("dark");
  });
});
