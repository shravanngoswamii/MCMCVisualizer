/**
 * Pure data structures returned by get*PlotData() functions.
 * These have no dependency on any plotting library — pass them to Plotly,
 * D3, Vega-Lite, ECharts, Canvas, or any other renderer.
 */

export interface ChainSeries {
  chain:      string;
  /** Iteration indices (x axis) */
  iterations: number[];
  /** Draw values (y axis) */
  values:     Float64Array;
  color:      string;
}

export interface TracePlotData {
  variable: string;
  series:   ChainSeries[];
}

export interface DensityCurve {
  chain:  string;
  /** Evaluation points */
  x:      number[];
  /** KDE density values */
  y:      number[];
  color:  string;
}

export interface DensityPlotData {
  variable: string;
  curves:   DensityCurve[];
}

export interface AutocorSeries {
  chain:  string;
  lags:   number[];
  values: number[];
  color:  string;
}

export interface AutocorPlotData {
  variable: string;
  maxLag:   number;
  series:   AutocorSeries[];
}

export interface HistogramSeries {
  chain:  string;
  /** Raw draws — let the renderer decide bin count and scale */
  draws:  Float64Array;
  color:  string;
}

export interface HistogramPlotData {
  variable: string;
  series:   HistogramSeries[];
}

export interface EcdfSeries {
  chain:  string;
  /** Sorted draw values (x) */
  x:      number[];
  /** Cumulative probabilities (y), same length as x */
  y:      number[];
  color:  string;
}

export interface EcdfPlotData {
  variable: string;
  series:   EcdfSeries[];
}

export interface CumMeanSeries {
  chain:    string;
  /** Running mean at each iteration */
  values:   number[];
  color:    string;
}

export interface CumMeanPlotData {
  variable:   string;
  iterations: number[];
  series:     CumMeanSeries[];
}

export interface ForestRow {
  variable: string;
  mean:     number;
  hdiLow:   number;
  hdiHigh:  number;
  rhat:     number;
  essBulk:  number;
}

export interface ForestPlotData {
  rows:  ForestRow[];
  color: string;
}

export interface RankSeries {
  chain:  string;
  /** Bin left edges */
  bins:   number[];
  counts: number[];
  color:  string;
}

export interface RankPlotData {
  variable: string;
  nBins:    number;
  series:   RankSeries[];
}

export interface RunningRhatData {
  variable:   string;
  iterations: number[];
  /** R-hat computed on draws 1..t for each t */
  rhat:       number[];
  color:      string;
}

export interface DiagnosticsRow {
  variable: string;
  essBulk:  number;
  essTail:  number;
  rhat:     number;
}

export interface DiagnosticsHeatmapData {
  rows: DiagnosticsRow[];
}
