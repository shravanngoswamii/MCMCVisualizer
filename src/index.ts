import type { InferenceData, FileFormat, ChainData } from './types';
import { MCMCData } from './inference-data';
import { parseTuringCSV } from './parsers/turing-csv';
import { parseStanCSV, parseStanCSVFiles } from './parsers/stan-csv';
import { parseMCMCChainsJSON } from './parsers/mcmcchains-json';
import { detectFormat } from './parsers/detect';

export type { InferenceData, ChainData, SequenceStats, VariableStats, VariableSummary, FileFormat } from './types';
export { MCMCData } from './inference-data';
export { computeESS } from './stats/ess';
export { computeRhat } from './stats/rhat';
export { computeMean, computeStdev, computeQuantiles, computeHDI } from './stats/summary';
export { detectFormat } from './parsers/detect';

export * as plots from './plots';
export type { PlotOptions, PlotHandle } from './plots/types';

export function fromTuringCSV(text: string): InferenceData {
  return new MCMCData(parseTuringCSV(text));
}

export function fromStanCSV(text: string): InferenceData {
  return new MCMCData(parseStanCSV(text));
}

export function fromStanCSVFiles(files: string[]): InferenceData {
  return new MCMCData(parseStanCSVFiles(files));
}

export function fromAutoDetect(text: string): InferenceData {
  const format = detectFormat(text);
  switch (format) {
    case 'turing-csv':
      return fromTuringCSV(text);
    case 'stan-csv':
      return fromStanCSV(text);
    case 'mcmcchains-json':
      return fromMCMCChainsJSON(text);
    default:
      throw new Error(`Unable to detect format. Use fromTuringCSV(), fromStanCSV(), or fromMCMCChainsJSON() directly.`);
  }
}

export function fromMCMCChainsJSON(text: string): InferenceData {
  return new MCMCData(parseMCMCChainsJSON(text));
}

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
