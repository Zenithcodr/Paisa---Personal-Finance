import { defineConfig } from "vite";

export default defineConfig({
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
  }
});
