interface ChainData {
    readonly name: string;
    readonly draws: ReadonlyMap<string, Float64Array>;
    readonly drawCount: number;
}
interface SequenceStats {
    mean: number;
    stdev: number;
    count: number;
    ess: number;
    essPerDraw: number;
    mcse: number;
    skewness: number;
    excessKurtosis: number;
    autocorrelation: number[];
}
interface VariableStats {
    mean: number;
    stdev: number;
    count: number;
    ess: number;
    essPerDraw: number;
    mcse: number;
    bulkEss: number;
    tailEss: number;
    rhat: number | undefined;
    splitRhat: number | undefined;
    geweke: {
        z: number;
        pValue: number;
    };
    skewness: number;
    excessKurtosis: number;
    quantiles: {
        q5: number;
        q25: number;
        q50: number;
        q75: number;
        q95: number;
    };
    hdi90: [number, number];
    hdi90Width: number;
}
interface VariableSummary extends VariableStats {
    variable: string;
}
interface InferenceData {
    readonly chains: ReadonlyMap<string, ChainData>;
    readonly variableNames: string[];
    readonly chainNames: string[];
    readonly drawCount: number;
    getDraws(variable: string, chain?: string): Float64Array;
    getAllDraws(variable: string): Float64Array;
    sequenceStats(variable: string, chain: string): SequenceStats;
    variableStats(variable: string): VariableStats;
    summary(): VariableSummary[];
    toTuringCSV(): string;
    toMCMCChainsCSV(): string;
    toStanCSV(): string;
    toJSON(): string;
    toMCMCChainsJSON(): string;
    toWideCSV(): string;
    slice(start: number, end?: number): InferenceData;
    filterChains(chainNames: string[]): InferenceData;
    filterVariables(variableNames: string[]): InferenceData;
}
type FileFormat = 'turing-csv' | 'stan-csv' | 'mcmcchains-json' | 'unknown';

interface PlotOptions {
    height?: number;
    width?: number;
    theme?: 'dark' | 'light';
}
interface PlotHandle {
    destroy(): void;
    update(variable?: string): void;
}
/**
 * Framework-agnostic Plotly specification.
 *
 * Returned by all `*Spec` functions — works without a DOM, in Node.js,
 * on the CLI, in React/Vue wrappers, and in AI tool responses.
 *
 * ```ts
 * // Browser
 * Plotly.newPlot(el, spec.data, spec.layout, spec.config);
 *
 * // React
 * <Plot data={spec.data} layout={spec.layout} config={spec.config} />
 *
 * // CLI / AI agent
 * console.log(JSON.stringify(spec));
 * ```
 */
interface PlotSpec {
    readonly data: unknown[];
    readonly layout: Record<string, unknown>;
    readonly config: Record<string, unknown>;
}

/**
 * R-hat diagnostics — Vehtari et al. (2021) https://doi.org/10.1214/20-BA1221
 * Mirrors the reference implementation in MCMCDiagnosticTools.jl.
 */
type RhatKind = 'rank' | 'bulk' | 'tail' | 'basic';
/**
 * Compute R-hat for an array of chains.
 * 'rank' (default) = max(bulk, tail) — strictest, recommended.
 * Returns NaN when undefined (< 2 chains, < 4 draws, zero within-chain variance).
 */
declare function computeRhat(chains: Float64Array[], kind?: RhatKind): number;

declare class MCMCData implements InferenceData {
    readonly chains: ReadonlyMap<string, ChainData>;
    readonly variableNames: string[];
    readonly chainNames: string[];
    readonly drawCount: number;
    constructor(chains: Map<string, ChainData>);
    getDraws(variable: string, chain?: string): Float64Array;
    getAllDraws(variable: string): Float64Array;
    sequenceStats(variable: string, chain: string): SequenceStats;
    variableStats(variable: string): VariableStats;
    summary(): VariableSummary[];
    toTuringCSV(): string;
    toMCMCChainsCSV(): string;
    toStanCSV(): string;
    toWideCSV(): string;
    toJSON(): string;
    toMCMCChainsJSON(): string;
    slice(start: number, end?: number): InferenceData;
    filterChains(chainNames: string[]): InferenceData;
    filterVariables(variableNames: string[]): InferenceData;
}

declare function detectFormat(text: string): FileFormat;

/**
 * ArviZ InferenceData JSON adapter.
 * Parses output from `az.to_json()` (ArviZ >= 0.11).
 * Gives compatibility with PyMC, NumPyro, Stan, and Turing.jl (via ArviZ.jl).
 */

/**
 * Parse an ArviZ JSON string or pre-parsed object.
 * Returns a Map keyed by group name ('posterior', 'sample_stats', etc.).
 */
declare function parseArviZJSON(input: string | object): Map<string, Map<string, ChainData>>;
/**
 * Parse ArviZ JSON and return only the 'posterior' group.
 * Throws if the posterior group is missing.
 */
declare function parseArviZJSONPosterior(input: string | object): Map<string, ChainData>;

/**
 * ESS estimators.
 * Single-chain: IMSE estimator (per-chain sequence diagnostics).
 * Multi-chain:  Geyer's monotone sequence estimator with split chains (Vehtari 2021).
 */
declare function computeESS(chain: Float64Array): {
    ess: number;
    autocorrelation: number[];
};
declare function computeEssBulk(chains: Float64Array[]): number;
declare function computeEssTail(chains: Float64Array[], tailProb?: number): number;
declare function computeEssBasic(chains: Float64Array[]): number;

/**
 * Monte Carlo Standard Error (MCSE) estimators.
 * Mean/Std: ESS-based asymptotic formula.
 * Quantile: Beta distribution approximation (Flegal & Jones 2011).
 */
/** MCSE of the mean for a single chain. */
declare function computeMCSE(draws: Float64Array): number;
/** MCSE of the mean across multiple chains using bulk ESS.
 *  Falls back to pooled single-chain MCSE when chains are too short for bulk ESS. */
declare function computeMCSEMultiChain(chains: Float64Array[]): number;
/**
 * MCSE of a quantile estimator (Flegal & Jones 2011).
 * @param p      quantile level 0–1
 * @param essEff effective sample size
 */
declare function computeMCSEQuantile(draws: Float64Array, p: number, essEff: number): number;
/** MCSE of the standard deviation via delta method on the expectand proxy. */
declare function computeMCSEStd(chains: Float64Array[]): number;

declare function computeGeweke(draws: Float64Array, firstFrac?: number, lastFrac?: number): {
    z: number;
    pValue: number;
};

declare function computeSplitRhat(chains: Float64Array[]): number | undefined;

declare function computeMean(arr: Float64Array): number;
declare function computeStdev(arr: Float64Array): number;
declare function computeSkewness(arr: Float64Array): number;
declare function computeExcessKurtosis(arr: Float64Array): number;
declare function computeQuantiles(arr: Float64Array): {
    q5: number;
    q25: number;
    q50: number;
    q75: number;
    q95: number;
};
declare function computeHDI(arr: Float64Array, credMass?: number): [number, number];

/**
 * Trace plot — sequential parameter values per chain over iterations.
 *
 * Two entry points:
 *   tracePlotSpec()  — returns a plain PlotSpec object. No DOM, no Plotly.
 *                      Works in Node.js, CLI, React/Vue wrappers, AI agents.
 *   tracePlot()      — renders directly to an HTMLElement (browser only).
 */

/** Render a trace plot into an HTMLElement. Returns a handle for updates/cleanup. */
declare function tracePlot(container: HTMLElement, data: InferenceData, variable: string, options?: PlotOptions): PlotHandle;

declare function histogramPlot(container: HTMLElement, data: InferenceData, variable: string, options?: PlotOptions): PlotHandle;

declare function autocorrelationPlot(container: HTMLElement, data: InferenceData, variable: string, options?: PlotOptions): PlotHandle;

declare function forestPlot(container: HTMLElement, data: InferenceData, options?: PlotOptions): PlotHandle;

declare function cumulativeMeanPlot(container: HTMLElement, data: InferenceData, variable: string, options?: PlotOptions): PlotHandle;

declare function pairPlot(container: HTMLElement, data: InferenceData, variables?: string[], options?: PlotOptions): PlotHandle;

declare function summaryTable(container: HTMLElement, data: InferenceData, options?: PlotOptions): {
    destroy(): void;
    update(): void;
};

declare function rankPlot(container: HTMLElement, data: InferenceData, variable: string, options?: PlotOptions): PlotHandle;

declare function runningRhatPlot(container: HTMLElement, data: InferenceData, variable: string, options?: PlotOptions): PlotHandle;

declare function densityPlot(container: HTMLElement, data: InferenceData, variable: string, options?: PlotOptions): PlotHandle;

declare function violinPlot(container: HTMLElement, data: InferenceData, options?: PlotOptions): PlotHandle;

declare function energyPlot(container: HTMLElement, data: InferenceData, options?: PlotOptions): PlotHandle;

declare function ecdfPlot(container: HTMLElement, data: InferenceData, variable: string, options?: PlotOptions): PlotHandle;

declare function chainIntervalsPlot(container: HTMLElement, data: InferenceData, variable: string, options?: PlotOptions): PlotHandle;

declare function diagnosticsHeatmapPlot(container: HTMLElement, data: InferenceData, options?: PlotOptions): PlotHandle;

type index_PlotHandle = PlotHandle;
type index_PlotOptions = PlotOptions;
declare const index_autocorrelationPlot: typeof autocorrelationPlot;
declare const index_chainIntervalsPlot: typeof chainIntervalsPlot;
declare const index_cumulativeMeanPlot: typeof cumulativeMeanPlot;
declare const index_densityPlot: typeof densityPlot;
declare const index_diagnosticsHeatmapPlot: typeof diagnosticsHeatmapPlot;
declare const index_ecdfPlot: typeof ecdfPlot;
declare const index_energyPlot: typeof energyPlot;
declare const index_forestPlot: typeof forestPlot;
declare const index_histogramPlot: typeof histogramPlot;
declare const index_pairPlot: typeof pairPlot;
declare const index_rankPlot: typeof rankPlot;
declare const index_runningRhatPlot: typeof runningRhatPlot;
declare const index_summaryTable: typeof summaryTable;
declare const index_tracePlot: typeof tracePlot;
declare const index_violinPlot: typeof violinPlot;
declare namespace index {
  export { type index_PlotHandle as PlotHandle, type index_PlotOptions as PlotOptions, index_autocorrelationPlot as autocorrelationPlot, index_chainIntervalsPlot as chainIntervalsPlot, index_cumulativeMeanPlot as cumulativeMeanPlot, index_densityPlot as densityPlot, index_diagnosticsHeatmapPlot as diagnosticsHeatmapPlot, index_ecdfPlot as ecdfPlot, index_energyPlot as energyPlot, index_forestPlot as forestPlot, index_histogramPlot as histogramPlot, index_pairPlot as pairPlot, index_rankPlot as rankPlot, index_runningRhatPlot as runningRhatPlot, index_summaryTable as summaryTable, index_tracePlot as tracePlot, index_violinPlot as violinPlot };
}

/**
 * mcmc-visualizer — public API
 *
 * Core: zero runtime dependencies. Plotly.js is an optional peer dep used
 * only by the DOM-rendering plot functions; all *Spec functions work without it.
 */

/**
 * Load from ArviZ JSON (produced by `az.to_json()` in Python).
 * Compatible with PyMC, NumPyro, Stan (via ArviZ), and Turing.jl (via ArviZ.jl).
 * Only the `posterior` group is loaded; use `parseArviZJSON` for all groups.
 */
declare function fromArviZJSON(input: string | object): InferenceData;
/** Load from a Turing.jl CSV (long or wide format). */
declare function fromTuringCSV(text: string): InferenceData;
/** Load from a single Stan CSV file. */
declare function fromStanCSV(text: string): InferenceData;
/** Load from multiple Stan CSV file contents (one string per chain). */
declare function fromStanCSVFiles(files: string[]): InferenceData;
/** Load from MCMCChains.jl JSON export. */
declare function fromMCMCChainsJSON(text: string): InferenceData;
/** Auto-detect format and load. Throws if format cannot be determined. */
declare function fromAutoDetect(text: string): InferenceData;
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
declare function fromChainArrays(data: Record<string, Record<string, number[]>>): InferenceData;

export { type ChainData, type FileFormat, type InferenceData, MCMCData, type PlotHandle, type PlotOptions, type PlotSpec, type RhatKind, type SequenceStats, type VariableStats, type VariableSummary, computeESS, computeEssBasic, computeEssBulk, computeEssTail, computeExcessKurtosis, computeGeweke, computeHDI, computeMCSE, computeMCSEMultiChain, computeMCSEQuantile, computeMCSEStd, computeMean, computeQuantiles, computeRhat, computeSkewness, computeSplitRhat, computeStdev, detectFormat, fromArviZJSON, fromAutoDetect, fromChainArrays, fromMCMCChainsJSON, fromStanCSV, fromStanCSVFiles, fromTuringCSV, parseArviZJSON, parseArviZJSONPosterior, index as plots };
