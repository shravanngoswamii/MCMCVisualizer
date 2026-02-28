import type {
  ChainData,
  InferenceData,
  SequenceStats,
  VariableStats,
  VariableSummary,
} from './types';
import { computeESS } from './stats/ess';
import { computeRhat } from './stats/rhat';
import { computeMean, computeStdev, computeQuantiles, computeHDI } from './stats/summary';
import { toTuringCSV, toMCMCChainsCSV, toStanCSV, toWideCSV, toJSON, toMCMCChainsJSON } from './exporters';

export class MCMCData implements InferenceData {
  readonly chains: ReadonlyMap<string, ChainData>;
  readonly variableNames: string[];
  readonly chainNames: string[];
  readonly drawCount: number;

  constructor(chains: Map<string, ChainData>) {
    this.chains = chains;
    this.chainNames = Array.from(chains.keys());

    const varSet = new Set<string>();
    let maxDraws = 0;
    for (const chain of chains.values()) {
      for (const v of chain.draws.keys()) varSet.add(v);
      maxDraws = Math.max(maxDraws, chain.drawCount);
    }
    this.variableNames = Array.from(varSet);
    this.drawCount = maxDraws;
  }

  getDraws(variable: string, chain?: string): Float64Array {
    if (chain) {
      const c = this.chains.get(chain);
      if (!c) throw new Error(`Chain "${chain}" not found`);
      const draws = c.draws.get(variable);
      if (!draws) throw new Error(`Variable "${variable}" not found in chain "${chain}"`);
      return draws;
    }
    return this.getAllDraws(variable);
  }

  getAllDraws(variable: string): Float64Array {
    const arrays: Float64Array[] = [];
    let totalLen = 0;
    for (const chain of this.chains.values()) {
      const d = chain.draws.get(variable);
      if (d) {
        arrays.push(d);
        totalLen += d.length;
      }
    }
    const result = new Float64Array(totalLen);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  }

  sequenceStats(variable: string, chain: string): SequenceStats {
    const draws = this.getDraws(variable, chain);
    const mean = computeMean(draws);
    const stdev = computeStdev(draws);
    const { ess, autocorrelation } = computeESS(draws);
    return { mean, stdev, count: draws.length, ess, autocorrelation };
  }

  variableStats(variable: string): VariableStats {
    const chainMeans: number[] = [];
    const chainStdevs: number[] = [];
    const chainCounts: number[] = [];
    let totalESS = 0;

    for (const chainName of this.chainNames) {
      const chain = this.chains.get(chainName)!;
      const draws = chain.draws.get(variable);
      if (!draws || draws.length === 0) continue;

      const m = computeMean(draws);
      const s = computeStdev(draws);
      const { ess } = computeESS(draws);
      chainMeans.push(m);
      chainStdevs.push(isNaN(s) ? 0 : s);
      chainCounts.push(draws.length);
      totalESS += ess;
    }

    const allDraws = this.getAllDraws(variable);
    const quantiles = computeQuantiles(allDraws);
    const hdi90 = computeHDI(allDraws, 0.9);
    const rhat = computeRhat(chainMeans, chainStdevs, chainCounts);

    return {
      mean: computeMean(allDraws),
      stdev: computeStdev(allDraws),
      count: allDraws.length,
      ess: totalESS,
      rhat,
      quantiles,
      hdi90,
    };
  }

  summary(): VariableSummary[] {
    return this.variableNames.map(variable => ({
      variable,
      ...this.variableStats(variable),
    }));
  }

  toTuringCSV(): string {
    return toTuringCSV(this);
  }

  toMCMCChainsCSV(): string {
    return toMCMCChainsCSV(this);
  }

  toStanCSV(): string {
    return toStanCSV(this);
  }

  toWideCSV(): string {
    return toWideCSV(this);
  }

  toJSON(): string {
    return toJSON(this);
  }

  toMCMCChainsJSON(): string {
    return toMCMCChainsJSON(this);
  }

  slice(start: number, end?: number): InferenceData {
    const newChains = new Map<string, ChainData>();
    for (const [name, chain] of this.chains) {
      const newDraws = new Map<string, Float64Array>();
      let maxLen = 0;
      for (const [v, draws] of chain.draws) {
        const sliced = draws.slice(start, end);
        newDraws.set(v, sliced);
        maxLen = Math.max(maxLen, sliced.length);
      }
      newChains.set(name, { name, draws: newDraws, drawCount: maxLen });
    }
    return new MCMCData(newChains);
  }

  filterChains(chainNames: string[]): InferenceData {
    const newChains = new Map<string, ChainData>();
    for (const name of chainNames) {
      const chain = this.chains.get(name);
      if (chain) newChains.set(name, chain);
    }
    return new MCMCData(newChains);
  }

  filterVariables(variableNames: string[]): InferenceData {
    const varSet = new Set(variableNames);
    const newChains = new Map<string, ChainData>();
    for (const [name, chain] of this.chains) {
      const newDraws = new Map<string, Float64Array>();
      let maxLen = 0;
      for (const [v, draws] of chain.draws) {
        if (varSet.has(v)) {
          newDraws.set(v, draws);
          maxLen = Math.max(maxLen, draws.length);
        }
      }
      newChains.set(name, { name, draws: newDraws, drawCount: maxLen });
    }
    return new MCMCData(newChains);
  }
}
