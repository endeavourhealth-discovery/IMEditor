import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
const path = require("path");
import { esbuildCommonjs } from "@originjs/vite-plugin-commonjs";

export default defineConfig({
  base: "./",
  plugins: [vue()],
  resolve: {
    dedupe: ["vue"],
    alias: { "@": path.resolve(__dirname, "./src"), "./runtimeConfig": "./runtimeConfig.browser" }
  },
  server: {
    port: 8082,
    proxy: {
      "/imapi": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: p => p.replace(/^\/imapi/, "")
      },
      "/nodeapi": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: p => p.replace(/^\/nodeapi/, "")
      }
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [esbuildCommonjs(["google-palette"])]
    },
    exclude: ["im-library"]
  },
  test: {
    globals: true,
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://localhost"
      }
    },
    coverage: {
      reporter: ["text", "lcov"]
    },
    setupFiles: "./tests/setupFiles.js"
  }
});
