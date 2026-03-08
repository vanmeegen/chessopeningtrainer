import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const cacheDir =
  process.env.PLAYWRIGHT_BROWSERS_PATH ||
  join(homedir(), ".cache", "ms-playwright");

const hasBrowsers = (() => {
  if (!existsSync(cacheDir)) return false;
  const entries = readdirSync(cacheDir);
  return entries.some((e) => e.startsWith("chromium"));
})();

if (!hasBrowsers) {
  console.error(
    [
      "",
      "\x1b[1;31mPlaywright browsers not found.\x1b[0m",
      "",
      "Install them first:",
      "",
      "  npm run playwright:install",
      "",
      "On Linux, you may also need system dependencies:",
      "",
      "  sudo npx playwright install-deps",
      "",
    ].join("\n"),
  );
  process.exit(1);
}
