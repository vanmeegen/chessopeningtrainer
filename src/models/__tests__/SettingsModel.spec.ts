import { describe, it, expect, beforeEach, vi } from "vitest";
import { SettingsModel } from "../SettingsModel";
import type { ThemeSetting, BoardColorScheme } from "../SettingsModel";

const STORAGE_KEY = "chess-opening-trainer-settings";

describe("SettingsModel", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("has correct default values", () => {
    const model = new SettingsModel();
    expect(model.theme).toBe("system");
    expect(model.boardColorScheme).toBe("green");
    expect(model.soundEnabled).toBe(true);
    model.dispose();
  });

  it("setTheme changes theme", () => {
    const model = new SettingsModel();
    model.setTheme("dark");
    expect(model.theme).toBe("dark");
    model.setTheme("light");
    expect(model.theme).toBe("light");
    model.setTheme("system");
    expect(model.theme).toBe("system");
    model.dispose();
  });

  it("setBoardColorScheme changes board color scheme", () => {
    const model = new SettingsModel();
    model.setBoardColorScheme("blue");
    expect(model.boardColorScheme).toBe("blue");
    model.setBoardColorScheme("brown");
    expect(model.boardColorScheme).toBe("brown");
    model.setBoardColorScheme("green");
    expect(model.boardColorScheme).toBe("green");
    model.dispose();
  });

  it("toggleSound toggles sound", () => {
    const model = new SettingsModel();
    expect(model.soundEnabled).toBe(true);
    model.toggleSound();
    expect(model.soundEnabled).toBe(false);
    model.toggleSound();
    expect(model.soundEnabled).toBe(true);
    model.dispose();
  });

  it("effectiveTheme resolves system to light/dark", () => {
    const model = new SettingsModel();

    // When theme is explicitly set, effectiveTheme should match
    model.setTheme("dark");
    expect(model.effectiveTheme).toBe("dark");

    model.setTheme("light");
    expect(model.effectiveTheme).toBe("light");

    model.dispose();
  });

  it("effectiveTheme resolves system using matchMedia", () => {
    const model = new SettingsModel();
    model.setTheme("system");

    // In jsdom, matchMedia returns false by default
    expect(model.effectiveTheme).toBe("light");

    // Mock matchMedia to return dark
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    expect(model.effectiveTheme).toBe("dark");
    window.matchMedia = originalMatchMedia;
    model.dispose();
  });

  it("persists settings to localStorage on changes", async () => {
    const model = new SettingsModel();
    model.setTheme("dark");
    model.setBoardColorScheme("blue");
    model.toggleSound();

    // MobX reaction is async, wait a tick
    await new Promise((resolve) => setTimeout(resolve, 10));

    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!) as Record<string, unknown>;
    expect(parsed.theme).toBe("dark");
    expect(parsed.boardColorScheme).toBe("blue");
    expect(parsed.soundEnabled).toBe(false);
    model.dispose();
  });

  it("loads settings from localStorage on construction", () => {
    const settings = {
      theme: "dark" as ThemeSetting,
      boardColorScheme: "brown" as BoardColorScheme,
      soundEnabled: false,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    const model = new SettingsModel();
    expect(model.theme).toBe("dark");
    expect(model.boardColorScheme).toBe("brown");
    expect(model.soundEnabled).toBe(false);
    model.dispose();
  });

  it("handles invalid localStorage data gracefully", () => {
    localStorage.setItem(STORAGE_KEY, "not-valid-json{{{");

    // Should not throw, just use defaults
    const model = new SettingsModel();
    expect(model.theme).toBe("system");
    expect(model.boardColorScheme).toBe("green");
    expect(model.soundEnabled).toBe(true);
    model.dispose();
  });

  it("exportData returns valid JSON with all settings", () => {
    const model = new SettingsModel();
    model.setTheme("dark");
    model.setBoardColorScheme("blue");
    model.toggleSound();

    const exported = model.exportData();
    const parsed = JSON.parse(exported) as Record<string, unknown>;

    expect(parsed.theme).toBe("dark");
    expect(parsed.boardColorScheme).toBe("blue");
    expect(parsed.soundEnabled).toBe(false);
    model.dispose();
  });

  it("importData restores settings from valid JSON", () => {
    const model = new SettingsModel();
    const data = JSON.stringify({
      theme: "light",
      boardColorScheme: "brown",
      soundEnabled: false,
    });

    model.importData(data);

    expect(model.theme).toBe("light");
    expect(model.boardColorScheme).toBe("brown");
    expect(model.soundEnabled).toBe(false);
    model.dispose();
  });

  it("importData throws on invalid JSON", () => {
    const model = new SettingsModel();
    expect(() => model.importData("not-json")).toThrow("Invalid JSON data");
    model.dispose();
  });

  it("importData ignores unknown fields and keeps defaults for missing", () => {
    const model = new SettingsModel();
    model.importData(JSON.stringify({ unknownField: true }));

    // Should keep defaults
    expect(model.theme).toBe("system");
    expect(model.boardColorScheme).toBe("green");
    expect(model.soundEnabled).toBe(true);
    model.dispose();
  });

  it("importData ignores invalid enum values", () => {
    const model = new SettingsModel();
    model.importData(
      JSON.stringify({
        theme: "invalid-theme",
        boardColorScheme: "purple",
        soundEnabled: "not-a-boolean",
      }),
    );

    expect(model.theme).toBe("system");
    expect(model.boardColorScheme).toBe("green");
    expect(model.soundEnabled).toBe(true);
    model.dispose();
  });
});
