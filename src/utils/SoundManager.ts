import { settingsModel } from "../models/SettingsModel";

/**
 * Placeholder sound manager.
 * All methods are no-ops for now but respect the soundEnabled setting.
 * Ready for actual sound files to be added later.
 */
export function playMoveSound(): void {
  if (!settingsModel.soundEnabled) return;
  // TODO: play actual move sound
}

export function playCaptureSound(): void {
  if (!settingsModel.soundEnabled) return;
  // TODO: play actual capture sound
}

export function playCheckSound(): void {
  if (!settingsModel.soundEnabled) return;
  // TODO: play actual check sound
}
