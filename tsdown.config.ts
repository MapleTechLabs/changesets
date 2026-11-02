import { defineConfig } from "tsdown"

export default defineConfig({
	entry: { index: "./src/index.ts", bin: "./src/bin.ts" },
	format: "esm",
	dts: true,
	outDir: "dist",
	deps: { neverBundle: ["effect", "@effect/platform-node"] },
})
