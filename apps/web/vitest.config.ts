import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

// Node environment on purpose: these suites cover pure logic (formatters, chain
// selection, the fetch wrapper). Component tests would need jsdom +
// @testing-library/react — add those when there is a component worth rendering.
export default defineConfig({
  resolve: {
    alias: { "@": resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
