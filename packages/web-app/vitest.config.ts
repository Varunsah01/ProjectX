import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx"],
    exclude: ["__tests__/tenant-isolation.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    pool: "forks",
    maxWorkers: 1,
    environment: "jsdom",
    setupFiles: ["__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      include: [
        "lib/billing.ts",
        "lib/query-utils.ts",
        "lib/razorpay.ts",
        "lib/security/**/*.ts",
        "lib/cron/**/*.ts",
        "lib/mobile/auth.ts",
        "lib/actions/settings.ts",
        "lib/actions/notifications.ts",
        "lib/notifications.ts",
        "app/api/mobile/**/*.ts",
      ],
      exclude: [
        "**/*.d.ts",
        "**/__tests__/**",
        "**/node_modules/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
});
