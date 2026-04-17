/**
 * mcmc-visualizer — public API
 *
 * Core: zero runtime dependencies. Plotly.js is an optional peer dep used
 * only by the DOM-rendering plot functions; all *Spec functions work without it.
 */

// ============================================================================
// Types
// ============================================================================
export type {
	InferenceData,
	ChainData,
	SequenceStats,
	VariableStats,
	VariableSummary,
	FileFormat,
} from "./types";

export type {
	PlotOptions,
	PlotHandle,
	PlotSpec,
	CustomTheme,
} from "./plots/types";
export { BAYES_DARK_THEME } from "./plots/types";
export type { RhatKind } from "./stats/rhat";

// ============================================================================
// Main data class
// ============================================================================
export { MCMCData } from "./inference-data";

// ============================================================================
// Parsers / loaders
// ============================================================================
import { MCMCData } from "./inference-data";
import { parseTuringCSV } from "./parsers/turing-csv";
import { parseStanCSV, parseStanCSVFiles } from "./parsers/stan-csv";
import { parseMCMCChainsJSON } from "./parsers/mcmcchains-json";
import { parseArviZJSONPosterior, parseArviZJSON } from "./parsers/arviz-json";
import { detectFormat } from "./parsers/detect";
import type { InferenceData, ChainData, FileFormat } from "./types";

export { detectFormat } from "./parsers/detect";
export { parseArviZJSON, parseArviZJSONPosterior } from "./parsers/arviz-json";

/**
 * Load from ArviZ JSON (produced by `az.to_json()` in Python).
 * Compatible with PyMC, NumPyro, Stan (via ArviZ), and Turing.jl (via ArviZ.jl).
 * Only the `posterior` group is loaded; use `parseArviZJSON` for all groups.
 */
export function fromArviZJSON(input: string | object): InferenceData {
	return new MCMCData(parseArviZJSONPosterior(input));
}

/** Load from a Turing.jl CSV (long or wide format). */
export function fromTuringCSV(text: string): InferenceData {
	return new MCMCData(parseTuringCSV(text));
}

/** Load from a single Stan CSV file. */
export function fromStanCSV(text: string): InferenceData {
	return new MCMCData(parseStanCSV(text));
}

/** Load from multiple Stan CSV file contents (one string per chain). */
export function fromStanCSVFiles(files: string[]): InferenceData {
	return new MCMCData(parseStanCSVFiles(files));
}

/** Load from MCMCChains.jl JSON export. */
export function fromMCMCChainsJSON(text: string): InferenceData {
	return new MCMCData(parseMCMCChainsJSON(text));
}

/** Auto-detect format and load. Throws if format cannot be determined. */
export function fromAutoDetect(text: string): InferenceData {
	const format = detectFormat(text);
	switch (format) {
		case "turing-csv":
			return fromTuringCSV(text);
		case "stan-csv":
			return fromStanCSV(text);
		case "mcmcchains-json":
			return fromMCMCChainsJSON(text);
		default:
			throw new Error(
				"Unable to auto-detect format. " +
					"Use fromTuringCSV(), fromStanCSV(), fromArviZJSON(), or fromMCMCChainsJSON() explicitly.",
			);
	}
}

/**
 * Load from a plain JavaScript object.
 * Shape: `{ chain_name: { var_name: number[] } }`
 *
 * This is the lowest-friction entry point when you already have samples
 * in memory (e.g. from a custom sampler or streaming API).
 *
 * @example
 * const data = fromChainArrays({
 *   chain_1: { mu: [1.2, 1.3, ...], sigma: [0.5, 0.6, ...] },
 *   chain_2: { mu: [1.1, 1.4, ...], sigma: [0.4, 0.5, ...] },
 * });
 */
export function fromChainArrays(
	data: Record<string, Record<string, number[]>>,
): InferenceData {
	const chains = new Map<string, ChainData>();
	for (const [chainName, vars] of Object.entries(data)) {
		const draws = new Map<string, Float64Array>();
		let maxLen = 0;
		for (const [varName, values] of Object.entries(vars)) {
			const arr = new Float64Array(values);
			draws.set(varName, arr);
			maxLen = Math.max(maxLen, arr.length);
		}
		chains.set(chainName, { name: chainName, draws, drawCount: maxLen });
	}
	return new MCMCData(chains);
}

// ============================================================================
// Diagnostics (functional API — operate on raw Float64Array chains)
// ============================================================================
export {
	computeESS,
	computeEssBulk,
	computeEssTail,
	computeEssBasic,
} from "./stats/ess";
export { computeRhat } from "./stats/rhat";
export {
	computeMCSE,
	computeMCSEMultiChain,
	computeMCSEQuantile,
	computeMCSEStd,
} from "./stats/mcse";
export { computeGeweke } from "./stats/geweke";
export { computeSplitRhat } from "./stats/split-rhat";

export {
	computeMean,
	computeStdev,
	computeQuantiles,
	computeHDI,
	computeSkewness,
	computeExcessKurtosis,
} from "./stats/summary";

// ============================================================================
// Serialization (generic JSON only — format-specific exports removed)
// ============================================================================
export { toJSON } from "./exporters";

// ============================================================================
// Plot data functions (no DOM, no Plotly — pass to any renderer)
// Plot DOM adapters (Plotly convenience wrappers, optional)
// ============================================================================
export * as plots from "./plots";
