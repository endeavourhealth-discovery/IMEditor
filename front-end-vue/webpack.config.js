// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("path");

module.exports = {
  entry: "./main.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "app.js"
  },
  resolve: {
    symlinks: false,
    alias: {
      primevue: path.resolve(__dirname, "node_modules/primevue"),
      vue: path.resolve(__dirname, "node_modules/vue"),
      dedupe: ["vue"]
    }
  }
};
