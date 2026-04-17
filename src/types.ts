export interface ChainData {
  readonly name:      string;
  readonly draws:     ReadonlyMap<string, Float64Array>;
  readonly drawCount: number;
}

export interface SequenceStats {
  mean:            number;
  stdev:           number;
  count:           number;
  ess:             number;
  essPerDraw:      number;
  mcse:            number;
  skewness:        number;
  excessKurtosis:  number;
  autocorrelation: number[];
}

export interface VariableStats {
  mean:           number;
  stdev:          number;
  count:          number;
  ess:            number;
  essPerDraw:     number;
  mcse:           number;
  bulkEss:        number;
  tailEss:        number;
  rhat:           number | undefined;
  splitRhat:      number | undefined;
  geweke:         { z: number; pValue: number };
  skewness:       number;
  excessKurtosis: number;
  quantiles:      { q5: number; q25: number; q50: number; q75: number; q95: number };
  hdi90:          [number, number];
  hdi90Width:     number;
}

export interface VariableSummary extends VariableStats {
  variable: string;
}

export interface InferenceData {
  readonly chains:        ReadonlyMap<string, ChainData>;
  readonly variableNames: string[];
  readonly chainNames:    string[];
  readonly drawCount:     number;

  getDraws(variable: string, chain?: string): Float64Array;
  getAllDraws(variable: string): Float64Array;

  sequenceStats(variable: string, chain: string): SequenceStats;
  variableStats(variable: string): VariableStats;
  summary(): VariableSummary[];

  slice(start: number, end?: number): InferenceData;
  filterChains(chainNames: string[]): InferenceData;
  filterVariables(variableNames: string[]): InferenceData;
}

export type FileFormat = 'turing-csv' | 'stan-csv' | 'mcmcchains-json' | 'unknown';
