#!rollup --config
import babelPresetTypescript from "@babel/preset-typescript"
import { babel } from "@rollup/plugin-babel"
import { nodeResolve } from "@rollup/plugin-node-resolve"
import { findFiles } from "@samual/lib/findFiles"
import babelPluginHere from "babel-plugin-here"
import packageJson from "./package.json" assert { type: "json" }

/** @typedef {import("rollup").RollupOptions} RollupOptions */

const SOURCE_FOLDER = "src"

/** @type {RollupOptions} */ export default {
	external: Object.keys(packageJson.dependencies).map(name => new RegExp(`^${name}(?:$|/)`)),
	input: Object.fromEntries(
		(await findFiles(SOURCE_FOLDER)).filter(path => path.endsWith(".ts") && !path.endsWith(".d.ts"))
			.map(path => [ path.slice(SOURCE_FOLDER.length + 1, -3), path ])
	),
	output: {
		dir: "dist",
		sourcemap: true,
		sourcemapPathTransform: relativeSourcePath => relativeSourcePath.slice(2)
	},
	plugins: [
		nodeResolve({ extensions: [ ".ts" ] }),
		babel({ babelHelpers: "bundled", extensions: [ ".ts" ], presets: [ babelPresetTypescript ], plugins: [ babelPluginHere ] })
	],
	strictDeprecations: true,
	treeshake: { moduleSideEffects: false }
}
