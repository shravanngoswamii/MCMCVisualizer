import { describe, it, expect } from 'vitest';
import { computeRhat } from '../../src/index';

describe('computeRhat', () => {
  it('returns undefined for a single chain', () => {
    expect(computeRhat([1.5], [0.3], [100])).toBeUndefined();
  });

  it('returns ~1 for chains with identical distributions', () => {
    const rhat = computeRhat([1.0, 1.01], [0.5, 0.5], [500, 500]);
    expect(rhat).toBeDefined();
    expect(rhat!).toBeCloseTo(1.0, 1);
  });

  it('returns >1 for chains with different means', () => {
    const rhat = computeRhat([0.0, 5.0], [1.0, 1.0], [500, 500]);
    expect(rhat).toBeDefined();
    expect(rhat!).toBeGreaterThan(1.5);
  });

  it('returns undefined when counts <= 1', () => {
    expect(computeRhat([1.0, 2.0], [0.5, 0.5], [1, 1])).toBeUndefined();
  });
});
