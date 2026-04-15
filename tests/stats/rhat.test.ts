import { describe, it, expect } from 'vitest';
import { computeRhat } from '../../src/index';

// Deterministic pseudo-random for reproducible tests
function lcg(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return (s / 0xffffffff) - 0.5; };
}

function makeChain(n: number, mean: number, seed: number): Float64Array {
  const rand = lcg(seed);
  return Float64Array.from({ length: n }, () => mean + rand() * 0.5);
}

describe('computeRhat', () => {
  it('returns NaN for a single chain', () => {
    expect(computeRhat([makeChain(200, 0, 1)])).toBeNaN();
  });

  it('returns ~1 for well-mixed chains from the same distribution', () => {
    const chains = [1, 2, 3, 4].map(s => makeChain(500, 1.0, s * 7));
    const rhat = computeRhat(chains, 'rank');
    expect(rhat).toBeGreaterThan(0.98);
    expect(rhat).toBeLessThan(1.05);
  });

  it('returns >1 for chains with very different means', () => {
    const chains = [
      makeChain(200, 0.0, 11),
      makeChain(200, 5.0, 22),
    ];
    const rhat = computeRhat(chains, 'rank');
    expect(rhat).toBeGreaterThan(1.5);
  });

  it('returns NaN when chains are too short to split', () => {
    const chains = [new Float64Array([1, 2]), new Float64Array([3, 4])];
    expect(computeRhat(chains)).toBeNaN();
  });

  it('basic R-hat ≈ bulk R-hat for normal draws (well-converged)', () => {
    const chains = [1, 2, 3, 4].map(s => makeChain(300, 0, s * 13));
    const basic = computeRhat(chains, 'basic');
    const bulk  = computeRhat(chains, 'bulk');
    // Both should be close to 1; they should agree to within 0.05
    expect(Math.abs(basic - bulk)).toBeLessThan(0.05);
  });

  it('rank R-hat = max(bulk, tail)', () => {
    const chains = [1, 2, 3, 4].map(s => makeChain(300, 0, s * 17));
    const rank = computeRhat(chains, 'rank');
    const bulk = computeRhat(chains, 'bulk');
    const tail = computeRhat(chains, 'tail');
    expect(rank).toBeCloseTo(Math.max(bulk, tail), 6);
  });
});
