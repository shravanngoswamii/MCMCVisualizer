import { describe, it, expect } from 'vitest';
import { fromTuringCSV, fromStanCSVFiles, fromChainArrays, fromAutoDetect, fromMCMCChainsJSON, detectFormat } from '../src/index';

const TURING_DATA = [
  'chain#1,mu,0,1.5',
  'chain#1,mu,1,2.3',
  'chain#1,mu,2,1.8',
  'chain#1,mu,3,2.1',
  'chain#1,mu,4,1.9',
  'chain#1,sigma,0,0.5',
  'chain#1,sigma,1,0.7',
  'chain#1,sigma,2,0.6',
  'chain#1,sigma,3,0.8',
  'chain#1,sigma,4,0.55',
  'chain#2,mu,0,1.6',
  'chain#2,mu,1,2.4',
  'chain#2,mu,2,1.7',
  'chain#2,mu,3,2.0',
  'chain#2,mu,4,2.2',
  'chain#2,sigma,0,0.45',
  'chain#2,sigma,1,0.65',
  'chain#2,sigma,2,0.55',
  'chain#2,sigma,3,0.75',
  'chain#2,sigma,4,0.6',
].join('\n');

describe('InferenceData integration', () => {
  it('computes full summary', () => {
    const data = fromTuringCSV(TURING_DATA);
    const summaries = data.summary();
    expect(summaries).toHaveLength(2);

    const muSummary = summaries.find(s => s.variable === 'mu');
    expect(muSummary).toBeDefined();
    expect(muSummary!.mean).toBeCloseTo(1.95, 1);
    expect(muSummary!.count).toBe(10);
    expect(muSummary!.quantiles.q50).toBeDefined();
    expect(muSummary!.hdi90).toBeDefined();
  });

  it('exports to Turing CSV round-trip', () => {
    const data = fromTuringCSV(TURING_DATA);
    const csv = data.toTuringCSV();
    const data2 = fromTuringCSV(csv);
    expect(data2.chainNames).toEqual(data.chainNames);
    expect(data2.variableNames.sort()).toEqual(data.variableNames.sort());
    const original = data.getDraws('mu', 'chain#1');
    const roundTripped = data2.getDraws('mu', 'chain#1');
    for (let i = 0; i < original.length; i++) {
      expect(roundTripped[i]).toBeCloseTo(original[i]!, 10);
    }
  });

  it('exports to wide CSV', () => {
    const data = fromTuringCSV(TURING_DATA);
    const csv = data.toWideCSV();
    expect(csv).toContain('chain_,draw_');
    expect(csv.split('\n').length).toBe(11);
  });

  it('exports to JSON', () => {
    const data = fromTuringCSV(TURING_DATA);
    const json = data.toJSON();
    const parsed = JSON.parse(json);
    expect(parsed['chain#1']).toBeDefined();
    expect(parsed['chain#1']['mu']).toHaveLength(5);
  });

  it('slices draws', () => {
    const data = fromTuringCSV(TURING_DATA);
    const sliced = data.slice(2, 4);
    expect(sliced.getDraws('mu', 'chain#1')).toHaveLength(2);
  });

  it('filters chains', () => {
    const data = fromTuringCSV(TURING_DATA);
    const filtered = data.filterChains(['chain#1']);
    expect(filtered.chainNames).toEqual(['chain#1']);
  });

  it('filters variables', () => {
    const data = fromTuringCSV(TURING_DATA);
    const filtered = data.filterVariables(['mu']);
    expect(filtered.variableNames).toEqual(['mu']);
  });

  it('fromChainArrays constructs correctly', () => {
    const data = fromChainArrays({
      'chain#1': { x: [1, 2, 3], y: [4, 5, 6] },
      'chain#2': { x: [7, 8, 9], y: [10, 11, 12] },
    });
    expect(data.chainNames).toHaveLength(2);
    expect(data.variableNames).toContain('x');
    expect(data.getDraws('x', 'chain#1')[0]).toBe(1);
  });

  it('autodetects Turing long format', () => {
    const data = fromAutoDetect(TURING_DATA);
    expect(data.chainNames).toHaveLength(2);
    expect(data.variableNames).toContain('mu');
  });

  it('sequenceStats returns per-chain stats', () => {
    const data = fromTuringCSV(TURING_DATA);
    const stats = data.sequenceStats('mu', 'chain#1');
    expect(stats.mean).toBeCloseTo(1.92, 1);
    expect(stats.count).toBe(5);
    expect(stats.ess).toBeGreaterThanOrEqual(0);
  });

  it('exports to MCMCChains CSV round-trip', () => {
    const data = fromTuringCSV(TURING_DATA);
    const csv = data.toMCMCChainsCSV();
    expect(csv).toContain('iteration,chain');
    const data2 = fromAutoDetect(csv);
    expect(data2.chainNames).toHaveLength(2);
    expect(data2.variableNames.sort()).toEqual(data.variableNames.sort());
    const orig = data.getDraws('mu', 'chain#1');
    const rt = data2.getDraws('mu', 'chain#1');
    expect(rt.length).toBe(orig.length);
    for (let i = 0; i < orig.length; i++) {
      expect(rt[i]).toBeCloseTo(orig[i]!, 10);
    }
  });

  it('exports to MCMCChains JSON round-trip', () => {
    const data = fromTuringCSV(TURING_DATA);
    const json = data.toMCMCChainsJSON();
    const data2 = fromMCMCChainsJSON(json);
    expect(data2.chainNames).toHaveLength(2);
    expect(data2.variableNames.sort()).toEqual(data.variableNames.sort());
    const orig = data.getDraws('sigma', 'chain#2');
    const rt = data2.getDraws('sigma', 'chain#2');
    expect(rt.length).toBe(orig.length);
    for (let i = 0; i < orig.length; i++) {
      expect(rt[i]).toBeCloseTo(orig[i]!, 10);
    }
  });

  it('autodetects MCMCChains JSON format', () => {
    const data = fromChainArrays({
      'chain#1': { x: [1, 2, 3] },
    });
    const json = data.toMCMCChainsJSON();
    expect(detectFormat(json)).toBe('mcmcchains-json');
    const data2 = fromAutoDetect(json);
    expect(data2.variableNames).toContain('x');
  });
});
