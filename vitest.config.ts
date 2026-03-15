import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["app/**/*.test.{ts,tsx}"],
    reporters: ["default"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      clean: true,
      reportsDirectory: "./coverage",
      reporter: ["text", "text-summary", "html", "json-summary", "lcov"],
      include: ["app/**/*.ts", "app/**/*.tsx"],
      exclude: [
        "app/**/*.test.ts",
        "app/**/*.test.tsx",
        "app/**/index.ts",
        "app/**/page.tsx",
        "app/**/layout.tsx",
        "app/**/*.d.ts",
        "app/_server/supabase/database.types.ts",
      ],
    },
  },
});
