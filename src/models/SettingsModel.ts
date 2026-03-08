import { makeAutoObservable, reaction } from "mobx";

export type ThemeSetting = "light" | "dark" | "system";
export type EffectiveTheme = "light" | "dark";
export type BoardColorScheme = "green" | "blue" | "brown";

type PersistedSettings = {
  theme: ThemeSetting;
  boardColorScheme: BoardColorScheme;
  soundEnabled: boolean;
};

const STORAGE_KEY = "chess-opening-trainer-settings";

export class SettingsModel {
  theme: ThemeSetting = "system";
  boardColorScheme: BoardColorScheme = "green";
  soundEnabled: boolean = true;

  private disposeReaction: (() => void) | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    this.loadFromStorage();
    this.disposeReaction = reaction(
      () => this.toJSON(),
      (json) => {
        try {
          localStorage.setItem(STORAGE_KEY, json);
        } catch {
          // localStorage may be unavailable
        }
      },
    );
  }

  get effectiveTheme(): EffectiveTheme {
    if (this.theme === "system") {
      if (typeof window !== "undefined" && window.matchMedia) {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      }
      return "light";
    }
    return this.theme;
  }

  setTheme(theme: ThemeSetting): void {
    this.theme = theme;
  }

  setBoardColorScheme(scheme: BoardColorScheme): void {
    this.boardColorScheme = scheme;
  }

  toggleSound(): void {
    this.soundEnabled = !this.soundEnabled;
  }

  exportData(): string {
    return this.toJSON();
  }

  importData(json: string): void {
    try {
      const parsed: unknown = JSON.parse(json);
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("Invalid settings data");
      }
      const data = parsed as Record<string, unknown>;

      if (
        data.theme === "light" ||
        data.theme === "dark" ||
        data.theme === "system"
      ) {
        this.theme = data.theme;
      }

      if (
        data.boardColorScheme === "green" ||
        data.boardColorScheme === "blue" ||
        data.boardColorScheme === "brown"
      ) {
        this.boardColorScheme = data.boardColorScheme;
      }

      if (typeof data.soundEnabled === "boolean") {
        this.soundEnabled = data.soundEnabled;
      }
    } catch {
      throw new Error("Invalid JSON data");
    }
  }

  dispose(): void {
    if (this.disposeReaction) {
      this.disposeReaction();
      this.disposeReaction = null;
    }
  }

  private toJSON(): string {
    const settings: PersistedSettings = {
      theme: this.theme,
      boardColorScheme: this.boardColorScheme,
      soundEnabled: this.soundEnabled,
    };
    return JSON.stringify(settings);
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.importData(stored);
      }
    } catch {
      // localStorage may be unavailable or data invalid
    }
  }
}

/** Singleton instance */
export const settingsModel = new SettingsModel();
