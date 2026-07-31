import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/interfaces/index.ts", "src/adapters/rn/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: "es2020",
});
