import { describe, it, expect } from 'vitest';
import { computeMean, computeStdev, computeQuantiles, computeHDI } from '../../src/index';

describe('summary stats', () => {
  const data = new Float64Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  it('computes mean', () => {
    expect(computeMean(data)).toBeCloseTo(5.5);
  });

  it('computes stdev', () => {
    expect(computeStdev(data)).toBeCloseTo(2.872, 2);
  });

  it('computes quantiles', () => {
    const q = computeQuantiles(data);
    expect(q.q50).toBeCloseTo(5.5, 0);
    expect(q.q5).toBeLessThan(q.q95);
    expect(q.q25).toBeLessThan(q.q75);
  });

  it('computes HDI', () => {
    const [lo, hi] = computeHDI(data, 0.9);
    expect(lo).toBeLessThan(hi);
    expect(hi - lo).toBeLessThan(10);
  });

  it('handles empty arrays', () => {
    expect(computeMean(new Float64Array([]))).toBeNaN();
    expect(computeStdev(new Float64Array([]))).toBeNaN();
  });
});
