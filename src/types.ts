export interface ChainData {
  readonly name: string;
  readonly draws: ReadonlyMap<string, Float64Array>;
  readonly drawCount: number;
}

export interface SequenceStats {
  mean: number;
  stdev: number;
  count: number;
  ess: number;
  autocorrelation: number[];
}

export interface VariableStats {
  mean: number;
  stdev: number;
  count: number;
  ess: number;
  rhat: number | undefined;
  quantiles: {
    q5: number;
    q25: number;
    q50: number;
    q75: number;
    q95: number;
  };
  hdi90: [number, number];
}

export interface VariableSummary extends VariableStats {
  variable: string;
}

export interface InferenceData {
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

export type FileFormat = 'turing-csv' | 'stan-csv' | 'mcmcchains-json' | 'unknown';
