import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { observer } from "mobx-react-lite";
import {
  settingsModel,
  type ThemeSetting,
  type BoardColorScheme,
} from "../models/SettingsModel";
import InstallButton from "./InstallButton";

type BoardColorConfig = {
  scheme: BoardColorScheme;
  light: string;
  dark: string;
  label: string;
};

const boardColorConfigs: BoardColorConfig[] = [
  { scheme: "green", light: "#eeeed2", dark: "#769656", label: "Green" },
  { scheme: "blue", light: "#dee3e6", dark: "#8ca2ad", label: "Blue" },
  { scheme: "brown", light: "#f0d9b5", dark: "#b58863", label: "Brown" },
];

type ThemeOption = {
  value: ThemeSetting;
  label: string;
};

const themeOptions: ThemeOption[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const SettingsScreen = observer(function SettingsScreen(): React.JSX.Element {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = (): void => {
    const data = settingsModel.exportData();
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cot-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (): void => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>): void => {
      const text = e.target?.result;
      if (typeof text === "string") {
        try {
          settingsModel.importData(text);
        } catch {
          // Import failed - could show a toast in the future
        }
      }
    };
    reader.readAsText(file);
    // Reset the input so the same file can be selected again
    event.target.value = "";
  };

  return (
    <div className="settings-screen" data-testid="settings-screen">
      <div className="screen-header">
        <button
          className="back-button"
          data-testid="back-button"
          onClick={() => navigate("/")}
          aria-label="Back to home"
        >
          &#8592;
        </button>
        <h2 className="screen-header-title">Settings</h2>
      </div>
      <div className="settings-content">
        {/* Theme */}
        <div className="settings-section">
          <div className="settings-section-title">Theme</div>
          <div
            className="theme-toggle-group"
            data-testid="theme-toggle"
            role="group"
            aria-label="Theme selection"
          >
            {themeOptions.map((option) => (
              <button
                key={option.value}
                className={`theme-toggle-btn${settingsModel.theme === option.value ? " active" : ""}`}
                onClick={() => settingsModel.setTheme(option.value)}
                data-testid={`theme-btn-${option.value}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Board Colors */}
        <div className="settings-section">
          <div className="settings-section-title">Board Colors</div>
          <div
            className="board-color-options"
            data-testid="board-color-picker"
            role="group"
            aria-label="Board color selection"
          >
            {boardColorConfigs.map((config) => (
              <button
                key={config.scheme}
                className={`board-color-option${settingsModel.boardColorScheme === config.scheme ? " active" : ""}`}
                onClick={() => settingsModel.setBoardColorScheme(config.scheme)}
                data-testid={`board-color-${config.scheme}`}
                aria-label={`${config.label} board`}
              >
                <div
                  className="board-color-light"
                  style={{ backgroundColor: config.light }}
                />
                <div
                  className="board-color-dark-sq"
                  style={{ backgroundColor: config.dark }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Sound */}
        <div className="settings-section">
          <div className="settings-section-title">Sound</div>
          <div className="sound-toggle" data-testid="sound-toggle">
            <span className="sound-toggle-label">Sound effects</span>
            <button
              className={`toggle-switch${settingsModel.soundEnabled ? " active" : ""}`}
              onClick={() => settingsModel.toggleSound()}
              aria-label={
                settingsModel.soundEnabled ? "Disable sound" : "Enable sound"
              }
            >
              <div className="toggle-switch-knob" />
            </button>
          </div>
        </div>

        {/* Import/Export */}
        <div className="settings-section">
          <div className="settings-section-title">Data</div>
          <div className="settings-actions">
            <button
              className="settings-btn"
              data-testid="export-button"
              onClick={handleExport}
            >
              Export backup
            </button>
            <button
              className="settings-btn"
              data-testid="import-button"
              onClick={handleImport}
            >
              Import backup
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="settings-file-input"
              onChange={handleFileChange}
              data-testid="import-file-input"
            />
          </div>
        </div>

        {/* Install */}
        <div className="settings-section">
          <InstallButton />
        </div>

        {/* Attribution */}
        <div className="settings-attribution">
          Opening data from lichess-org/chess-openings (CC0). Annotations from
          Wikibooks (CC BY-SA 3.0).
        </div>
      </div>
    </div>
  );
});

export default SettingsScreen;
