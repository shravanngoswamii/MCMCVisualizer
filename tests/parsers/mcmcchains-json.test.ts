import { describe, it, expect } from 'vitest';
import { parseMCMCChainsJSON, isMCMCChainsJSON } from '../../src/parsers/mcmcchains-json';

const SAMPLE_JSON = JSON.stringify({
  size: [3, 2, 2],
  value_flat: [
    1.0, 2.0, 3.0,
    0.5, 0.6, 0.7,
    1.1, 2.1, 3.1,
    0.4, 0.5, 0.6,
  ],
  iterations: [1, 2, 3],
  parameters: ['mu', 'sigma'],
  chains: [1, 2],
  logevidence: null,
  name_map: { parameters: ['mu', 'sigma'], internals: [] },
  info: {},
});

describe('parseMCMCChainsJSON', () => {
  it('parses 2 chains x 2 params x 3 iterations', () => {
    const chains = parseMCMCChainsJSON(SAMPLE_JSON);
    expect(chains.size).toBe(2);
    expect(chains.has('chain#1')).toBe(true);
    expect(chains.has('chain#2')).toBe(true);

    const c1 = chains.get('chain#1')!;
    expect(c1.drawCount).toBe(3);
    expect(c1.draws.has('mu')).toBe(true);
    expect(c1.draws.has('sigma')).toBe(true);

    const mu1 = c1.draws.get('mu')!;
    expect(mu1[0]).toBeCloseTo(1.0);
    expect(mu1[1]).toBeCloseTo(2.0);
    expect(mu1[2]).toBeCloseTo(3.0);

    const sigma1 = c1.draws.get('sigma')!;
    expect(sigma1[0]).toBeCloseTo(0.5);
    expect(sigma1[1]).toBeCloseTo(0.6);
    expect(sigma1[2]).toBeCloseTo(0.7);

    const c2 = chains.get('chain#2')!;
    const mu2 = c2.draws.get('mu')!;
    expect(mu2[0]).toBeCloseTo(1.1);
    expect(mu2[1]).toBeCloseTo(2.1);
    expect(mu2[2]).toBeCloseTo(3.1);
  });

  it('skips internal parameters', () => {
    const json = JSON.stringify({
      size: [2, 3, 1],
      value_flat: [1, 2, 0.5, 0.6, -5, -6],
      iterations: [1, 2],
      parameters: ['mu', 'sigma', 'lp'],
      chains: [1],
      name_map: { parameters: ['mu', 'sigma'], internals: ['lp'] },
    });
    const chains = parseMCMCChainsJSON(json);
    const c = chains.get('chain#1')!;
    expect(c.draws.has('mu')).toBe(true);
    expect(c.draws.has('sigma')).toBe(true);
    expect(c.draws.has('lp')).toBe(false);
  });

  it('handles null values as NaN', () => {
    const json = JSON.stringify({
      size: [2, 1, 1],
      value_flat: [1.5, null],
      iterations: [1, 2],
      parameters: ['x'],
      chains: [1],
    });
    const chains = parseMCMCChainsJSON(json);
    const x = chains.get('chain#1')!.draws.get('x')!;
    expect(x[0]).toBeCloseTo(1.5);
    expect(Number.isNaN(x[1])).toBe(true);
  });

  it('throws on size mismatch', () => {
    const json = JSON.stringify({
      size: [2, 2, 2],
      value_flat: [1, 2, 3],
      iterations: [1, 2],
      parameters: ['a', 'b'],
      chains: [1, 2],
    });
    expect(() => parseMCMCChainsJSON(json)).toThrow('size mismatch');
  });
});

describe('isMCMCChainsJSON', () => {
  it('detects valid MCMCChains JSON', () => {
    expect(isMCMCChainsJSON(SAMPLE_JSON)).toBe(true);
  });

  it('rejects plain JSON object', () => {
    expect(isMCMCChainsJSON('{"a": 1}')).toBe(false);
  });

  it('rejects CSV text', () => {
    expect(isMCMCChainsJSON('iteration,chain,mu\n1,chain#1,1.5')).toBe(false);
  });

  it('rejects empty input', () => {
    expect(isMCMCChainsJSON('')).toBe(false);
  });
});
