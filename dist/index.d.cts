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

declare function computeESS(chain: Float64Array): {
    ess: number;
    autocorrelation: number[];
};

declare function computeRhat(chainMeans: number[], chainStdevs: number[], chainCounts: number[]): number | undefined;

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

declare function computeMCSE(draws: Float64Array): number;
declare function computeBulkESS(chains: Float64Array[]): number;
declare function computeTailESS(chains: Float64Array[]): number;

declare function computeGeweke(draws: Float64Array, firstFrac?: number, lastFrac?: number): {
    z: number;
    pValue: number;
};

declare function computeSplitRhat(chains: Float64Array[]): number | undefined;

declare function detectFormat(text: string): FileFormat;

interface PlotOptions {
    height?: number;
    width?: number;
    theme?: 'dark' | 'light';
}
interface PlotHandle {
    destroy(): void;
    update(variable?: string): void;
}

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

declare function fromTuringCSV(text: string): InferenceData;
declare function fromStanCSV(text: string): InferenceData;
declare function fromStanCSVFiles(files: string[]): InferenceData;
declare function fromAutoDetect(text: string): InferenceData;
declare function fromMCMCChainsJSON(text: string): InferenceData;
declare function fromChainArrays(data: Record<string, Record<string, number[]>>): InferenceData;

export { type ChainData, type FileFormat, type InferenceData, MCMCData, type PlotHandle, type PlotOptions, type SequenceStats, type VariableStats, type VariableSummary, computeBulkESS, computeESS, computeExcessKurtosis, computeGeweke, computeHDI, computeMCSE, computeMean, computeQuantiles, computeRhat, computeSkewness, computeSplitRhat, computeStdev, computeTailESS, detectFormat, fromAutoDetect, fromChainArrays, fromMCMCChainsJSON, fromStanCSV, fromStanCSVFiles, fromTuringCSV, index as plots };
