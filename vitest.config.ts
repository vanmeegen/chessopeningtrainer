import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["**/__tests__/**/*.spec.{ts,tsx}"],
    setupFiles: ["./src/test-setup.ts"],
  },
});
