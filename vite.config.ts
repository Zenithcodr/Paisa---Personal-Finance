import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2022",
    minify: "esbuild",
    cssMinify: true,
    sourcemap: true,
    outDir: "dist"
  },
  server: {
    port: 3000,
    open: false
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false
  }
});
