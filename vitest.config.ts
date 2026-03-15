import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { loadEnvConfig } from "@next/env";


loadEnvConfig(process.cwd());


export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".")
    }
  }
});

