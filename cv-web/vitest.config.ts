import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environmentOptions: {
      jsdom: { url: "http://127.0.0.1:5173" },
    },
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
