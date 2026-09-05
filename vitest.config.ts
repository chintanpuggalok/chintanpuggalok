import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    environmentOptions: {
      jsdom: { url: "http://localhost:4321/" },
    },
    restoreMocks: true,
    clearMocks: true,
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "@shared": new URL("./shared", import.meta.url).pathname,
    },
  },
});
