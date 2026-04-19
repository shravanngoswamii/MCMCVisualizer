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
    slice(start: number, end?: number): InferenceData;
    filterChains(chainNames: string[]): InferenceData;
    filterVariables(variableNames: string[]): InferenceData;
}
type FileFormat = "turing-csv" | "stan-csv" | "mcmcchains-json" | "unknown";

/**
 * Custom theme for full visual control over Plotly output.
 * Pass as `theme` in PlotOptions to override the built-in 'dark' or 'light' presets.
 *
 * ```ts
 * const myTheme: CustomTheme = { paper_bgcolor: 'transparent', font: { color: '#eee' } };
 * plots.tracePlot(el, data, variable, { theme: myTheme });
 * ```
 */
interface CustomTheme {
    /** Plotly paper_bgcolor — outer background. Use 'transparent' to inherit from parent. */
    paper_bgcolor?: string;
    /** Plotly plot_bgcolor — inner chart area. */
    plot_bgcolor?: string;
    /** Axis/title font. */
    font?: {
        color?: string;
        family?: string;
        size?: number;
    };
    /** Grid line color. */
    gridcolor?: string;
    /** Zero-line color (defaults to gridcolor). */
    zerolinecolor?: string;
    /** Hover label colors. */
    hoverlabel?: {
        bgcolor?: string;
        bordercolor?: string;
        font?: {
            color?: string;
        };
    };
    /** Per-chain colors. Replaces the built-in palette for all plot types. */
    chainColors?: string[];
}
interface PlotOptions {
    height?: number;
    width?: number;
    /** Built-in preset or a full CustomTheme object. Defaults to 'dark'. */
    theme?: "dark" | "light" | CustomTheme;
}
interface PlotHandle {
    destroy(): void;
    update(variable?: string): void;
}
interface PlotSpec {
    readonly data: unknown[];
    readonly layout: Record<string, unknown>;
    readonly config: Record<string, unknown>;
}

/**
 * R-hat diagnostics — Vehtari et al. (2021) https://doi.org/10.1214/20-BA1221
 * Mirrors the reference implementation in MCMCDiagnosticTools.jl.
 */
type RhatKind = "rank" | "bulk" | "tail" | "basic";
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
 * Serialize chain data to a plain JSON string for inspection or storage.
 * Structure: { chainName: { variableName: number[] } }
 */
declare function toJSON(data: InferenceData): string;

/**
 * Pure data structures returned by get*PlotData() functions.
 * These have no dependency on any plotting library — pass them to Plotly,
 * D3, Vega-Lite, ECharts, Canvas, or any other renderer.
 */
interface ChainSeries {
    chain: string;
    /** Iteration indices (x axis) */
    iterations: number[];
    /** Draw values (y axis) */
    values: Float64Array;
    color: string;
}
interface TracePlotData {
    variable: string;
    series: ChainSeries[];
}
interface DensityCurve {
    chain: string;
    /** Evaluation points */
    x: number[];
    /** KDE density values */
    y: number[];
    color: string;
}
interface DensityPlotData {
    variable: string;
    curves: DensityCurve[];
}
interface AutocorSeries {
    chain: string;
    lags: number[];
    values: number[];
    color: string;
}
interface AutocorPlotData {
    variable: string;
    maxLag: number;
    series: AutocorSeries[];
}
interface HistogramSeries {
    chain: string;
    /** Raw draws — let the renderer decide bin count and scale */
    draws: Float64Array;
    color: string;
}
interface HistogramPlotData {
    variable: string;
    series: HistogramSeries[];
}
interface EcdfSeries {
    chain: string;
    /** Sorted draw values (x) */
    x: number[];
    /** Cumulative probabilities (y), same length as x */
    y: number[];
    color: string;
}
interface EcdfPlotData {
    variable: string;
    series: EcdfSeries[];
}
interface CumMeanSeries {
    chain: string;
    /** Running mean at each iteration */
    values: number[];
    color: string;
}
interface CumMeanPlotData {
    variable: string;
    iterations: number[];
    series: CumMeanSeries[];
}
interface ForestRow {
    variable: string;
    mean: number;
    hdiLow: number;
    hdiHigh: number;
    rhat: number;
    essBulk: number;
}
interface ForestPlotData {
    rows: ForestRow[];
    color: string;
}
interface RankSeries {
    chain: string;
    /** Bin left edges */
    bins: number[];
    counts: number[];
    color: string;
}
interface RankPlotData {
    variable: string;
    nBins: number;
    series: RankSeries[];
}
interface RunningRhatData {
    variable: string;
    iterations: number[];
    /** R-hat computed on draws 1..t for each t */
    rhat: number[];
    color: string;
}
interface DiagnosticsRow {
    variable: string;
    essBulk: number;
    essTail: number;
    rhat: number;
}
interface DiagnosticsHeatmapData {
    rows: DiagnosticsRow[];
}

/** Compute trace plot data — no DOM, no Plotly. Pass to any renderer. */
declare function getTracePlotData(data: InferenceData, variable: string, opts?: PlotOptions): TracePlotData;
/** Plotly JSON spec — no DOM required. */
declare function tracePlotSpec(data: InferenceData, variable: string, opts?: PlotOptions): PlotSpec;
/** Render into an HTMLElement (Plotly adapter). */
declare function tracePlot(container: HTMLElement, data: InferenceData, variable: string, opts?: PlotOptions): PlotHandle;

declare function getHistogramPlotData(data: InferenceData, variable: string, opts?: PlotOptions): HistogramPlotData;
declare function histogramPlot(container: HTMLElement, data: InferenceData, variable: string, options?: PlotOptions): PlotHandle;

declare function getAutocorPlotData(data: InferenceData, variable: string, opts?: PlotOptions): AutocorPlotData;
declare function autocorrelationPlot(container: HTMLElement, data: InferenceData, variable: string, options?: PlotOptions): PlotHandle;

declare function getForestPlotData(data: InferenceData, opts?: PlotOptions): ForestPlotData;
declare function forestPlot(container: HTMLElement, data: InferenceData, options?: PlotOptions): PlotHandle;

declare function getCumMeanPlotData(data: InferenceData, variable: string, opts?: PlotOptions): CumMeanPlotData;
declare function cumulativeMeanPlot(container: HTMLElement, data: InferenceData, variable: string, options?: PlotOptions): PlotHandle;

declare function pairPlot(container: HTMLElement, data: InferenceData, variables?: string[], options?: PlotOptions): PlotHandle;

interface ScatterPlotOptions extends PlotOptions {
    markerSize?: number;
    markerOpacity?: number;
}
declare function scatterPlot(container: HTMLElement, data: InferenceData, variableX: string, variableY: string, options?: ScatterPlotOptions): PlotHandle;
declare function scatter3dPlot(container: HTMLElement, data: InferenceData, variableX: string, variableY: string, variableZ: string, options?: ScatterPlotOptions): PlotHandle;

declare function summaryTable(container: HTMLElement, data: InferenceData, options?: PlotOptions): {
    destroy(): void;
    update(): void;
};

declare function getRankPlotData(data: InferenceData, variable: string, opts?: PlotOptions): RankPlotData;
declare function rankPlot(container: HTMLElement, data: InferenceData, variable: string, options?: PlotOptions): PlotHandle;

declare function getRunningRhatData(data: InferenceData, variable: string, opts?: PlotOptions): RunningRhatData;
declare function runningRhatPlot(container: HTMLElement, data: InferenceData, variable: string, options?: PlotOptions): PlotHandle;

declare function getDensityPlotData(data: InferenceData, variable: string, opts?: PlotOptions): DensityPlotData;
declare function densityPlot(container: HTMLElement, data: InferenceData, variable: string, options?: PlotOptions): PlotHandle;

declare function violinPlot(container: HTMLElement, data: InferenceData, options?: PlotOptions): PlotHandle;

declare function energyPlot(container: HTMLElement, data: InferenceData, options?: PlotOptions): PlotHandle;

declare function getEcdfPlotData(data: InferenceData, variable: string, opts?: PlotOptions): EcdfPlotData;
declare function ecdfPlot(container: HTMLElement, data: InferenceData, variable: string, options?: PlotOptions): PlotHandle;

declare function chainIntervalsPlot(container: HTMLElement, data: InferenceData, variable: string, options?: PlotOptions): PlotHandle;

declare function getDiagnosticsHeatmapData(data: InferenceData): DiagnosticsHeatmapData;
declare function diagnosticsHeatmapPlot(container: HTMLElement, data: InferenceData, options?: PlotOptions): PlotHandle;

type index_AutocorPlotData = AutocorPlotData;
type index_AutocorSeries = AutocorSeries;
type index_ChainSeries = ChainSeries;
type index_CumMeanPlotData = CumMeanPlotData;
type index_CumMeanSeries = CumMeanSeries;
type index_DensityCurve = DensityCurve;
type index_DensityPlotData = DensityPlotData;
type index_DiagnosticsHeatmapData = DiagnosticsHeatmapData;
type index_DiagnosticsRow = DiagnosticsRow;
type index_EcdfPlotData = EcdfPlotData;
type index_EcdfSeries = EcdfSeries;
type index_ForestPlotData = ForestPlotData;
type index_ForestRow = ForestRow;
type index_HistogramPlotData = HistogramPlotData;
type index_HistogramSeries = HistogramSeries;
type index_PlotHandle = PlotHandle;
type index_PlotOptions = PlotOptions;
type index_RankPlotData = RankPlotData;
type index_RankSeries = RankSeries;
type index_RunningRhatData = RunningRhatData;
type index_ScatterPlotOptions = ScatterPlotOptions;
type index_TracePlotData = TracePlotData;
declare const index_autocorrelationPlot: typeof autocorrelationPlot;
declare const index_chainIntervalsPlot: typeof chainIntervalsPlot;
declare const index_cumulativeMeanPlot: typeof cumulativeMeanPlot;
declare const index_densityPlot: typeof densityPlot;
declare const index_diagnosticsHeatmapPlot: typeof diagnosticsHeatmapPlot;
declare const index_ecdfPlot: typeof ecdfPlot;
declare const index_energyPlot: typeof energyPlot;
declare const index_forestPlot: typeof forestPlot;
declare const index_getAutocorPlotData: typeof getAutocorPlotData;
declare const index_getCumMeanPlotData: typeof getCumMeanPlotData;
declare const index_getDensityPlotData: typeof getDensityPlotData;
declare const index_getDiagnosticsHeatmapData: typeof getDiagnosticsHeatmapData;
declare const index_getEcdfPlotData: typeof getEcdfPlotData;
declare const index_getForestPlotData: typeof getForestPlotData;
declare const index_getHistogramPlotData: typeof getHistogramPlotData;
declare const index_getRankPlotData: typeof getRankPlotData;
declare const index_getRunningRhatData: typeof getRunningRhatData;
declare const index_getTracePlotData: typeof getTracePlotData;
declare const index_histogramPlot: typeof histogramPlot;
declare const index_pairPlot: typeof pairPlot;
declare const index_rankPlot: typeof rankPlot;
declare const index_runningRhatPlot: typeof runningRhatPlot;
declare const index_scatter3dPlot: typeof scatter3dPlot;
declare const index_scatterPlot: typeof scatterPlot;
declare const index_summaryTable: typeof summaryTable;
declare const index_tracePlot: typeof tracePlot;
declare const index_tracePlotSpec: typeof tracePlotSpec;
declare const index_violinPlot: typeof violinPlot;
declare namespace index {
  export { type index_AutocorPlotData as AutocorPlotData, type index_AutocorSeries as AutocorSeries, type index_ChainSeries as ChainSeries, type index_CumMeanPlotData as CumMeanPlotData, type index_CumMeanSeries as CumMeanSeries, type index_DensityCurve as DensityCurve, type index_DensityPlotData as DensityPlotData, type index_DiagnosticsHeatmapData as DiagnosticsHeatmapData, type index_DiagnosticsRow as DiagnosticsRow, type index_EcdfPlotData as EcdfPlotData, type index_EcdfSeries as EcdfSeries, type index_ForestPlotData as ForestPlotData, type index_ForestRow as ForestRow, type index_HistogramPlotData as HistogramPlotData, type index_HistogramSeries as HistogramSeries, type index_PlotHandle as PlotHandle, type index_PlotOptions as PlotOptions, type index_RankPlotData as RankPlotData, type index_RankSeries as RankSeries, type index_RunningRhatData as RunningRhatData, type index_ScatterPlotOptions as ScatterPlotOptions, type index_TracePlotData as TracePlotData, index_autocorrelationPlot as autocorrelationPlot, index_chainIntervalsPlot as chainIntervalsPlot, index_cumulativeMeanPlot as cumulativeMeanPlot, index_densityPlot as densityPlot, index_diagnosticsHeatmapPlot as diagnosticsHeatmapPlot, index_ecdfPlot as ecdfPlot, index_energyPlot as energyPlot, index_forestPlot as forestPlot, index_getAutocorPlotData as getAutocorPlotData, index_getCumMeanPlotData as getCumMeanPlotData, index_getDensityPlotData as getDensityPlotData, index_getDiagnosticsHeatmapData as getDiagnosticsHeatmapData, index_getEcdfPlotData as getEcdfPlotData, index_getForestPlotData as getForestPlotData, index_getHistogramPlotData as getHistogramPlotData, index_getRankPlotData as getRankPlotData, index_getRunningRhatData as getRunningRhatData, index_getTracePlotData as getTracePlotData, index_histogramPlot as histogramPlot, index_pairPlot as pairPlot, index_rankPlot as rankPlot, index_runningRhatPlot as runningRhatPlot, index_scatter3dPlot as scatter3dPlot, index_scatterPlot as scatterPlot, index_summaryTable as summaryTable, index_tracePlot as tracePlot, index_tracePlotSpec as tracePlotSpec, index_violinPlot as violinPlot };
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

export { type ChainData, type CustomTheme, type FileFormat, type InferenceData, MCMCData, type PlotHandle, type PlotOptions, type PlotSpec, type RhatKind, type SequenceStats, type VariableStats, type VariableSummary, computeESS, computeEssBasic, computeEssBulk, computeEssTail, computeExcessKurtosis, computeGeweke, computeHDI, computeMCSE, computeMCSEMultiChain, computeMCSEQuantile, computeMCSEStd, computeMean, computeQuantiles, computeRhat, computeSkewness, computeSplitRhat, computeStdev, detectFormat, fromArviZJSON, fromAutoDetect, fromChainArrays, fromMCMCChainsJSON, fromStanCSV, fromStanCSVFiles, fromTuringCSV, parseArviZJSON, parseArviZJSONPosterior, index as plots, toJSON };
