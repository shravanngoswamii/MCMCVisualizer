import { describe, it, expect } from 'vitest';
import { computeESS } from '../../src/index';

describe('computeESS', () => {
  it('returns 0 for very short chains', () => {
    const { ess } = computeESS(new Float64Array([1, 2, 3]));
    expect(ess).toBe(0);
  });

  it('returns positive ESS for uncorrelated data', () => {
    const n = 1000;
    const data = new Float64Array(n);
    let seed = 42;
    for (let i = 0; i < n; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      data[i] = seed / 0x7fffffff;
    }
    const { ess, autocorrelation } = computeESS(data);
    expect(ess).toBeGreaterThan(0);
    expect(ess).toBeLessThanOrEqual(n);
    expect(autocorrelation.length).toBe(n);
    expect(autocorrelation[0]).toBeCloseTo(1, 0);
  });

  it('returns lower ESS for autocorrelated data', () => {
    const n = 1000;
    const data = new Float64Array(n);
    data[0] = 0;
    let seed = 7;
    for (let i = 1; i < n; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const noise = (seed / 0x7fffffff - 0.5) * 0.1;
      data[i] = 0.95 * data[i - 1]! + noise;
    }
    const { ess: essCorrelated } = computeESS(data);

    const uncorr = new Float64Array(n);
    seed = 42;
    for (let i = 0; i < n; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      uncorr[i] = seed / 0x7fffffff;
    }
    const { ess: essUncorrelated } = computeESS(uncorr);

    expect(essCorrelated).toBeLessThan(essUncorrelated);
  });
});
