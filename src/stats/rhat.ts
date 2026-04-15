/**
 * R-hat diagnostics — Vehtari et al. (2021) https://doi.org/10.1214/20-BA1221
 * Mirrors the reference implementation in MCMCDiagnosticTools.jl.
 */

import { computeQuantile, sortedCopy } from '../utils';
import { _norminvcdf } from './math';

export type RhatKind = 'rank' | 'bulk' | 'tail' | 'basic';

/**
 * Compute R-hat for an array of chains.
 * 'rank' (default) = max(bulk, tail) — strictest, recommended.
 * Returns NaN when undefined (< 2 chains, < 4 draws, zero within-chain variance).
 */
export function computeRhat(chains: Float64Array[], kind: RhatKind = 'rank'): number {
  if (chains.length < 2) return NaN;
  switch (kind) {
    case 'basic': return _rhatBasic(chains);
    case 'bulk':  return _rhatBasic(_rankNormalize(chains));
    case 'tail':  return _rhatBasic(_rankNormalize(_foldAroundMedian(chains)));
    case 'rank': {
      const bulk = _rhatBasic(_rankNormalize(chains));
      const tail = _rhatBasic(_rankNormalize(_foldAroundMedian(chains)));
      if (isNaN(bulk) && isNaN(tail)) return NaN;
      if (isNaN(bulk)) return tail;
      if (isNaN(tail)) return bulk;
      return Math.max(bulk, tail);
    }
  }
}

// Gelman-Rubin with chain splitting (Vehtari 2021 Eq. 4)
/** @internal */
export function _rhatBasic(chains: Float64Array[], splitN = 2): number {
  const splits = _splitChains(chains, splitN);
  const m      = splits.length;
  if (m < 2) return NaN;
  const n = splits[0]!.length;
  if (n < 3) return NaN;

  const chainMeans = splits.map(_mean);
  const chainVars  = splits.map((c, i) => _biasedVariance(c, chainMeans[i]!));
  const W          = _arrayMean(chainVars);
  if (!isFinite(W) || W === 0) return NaN;

  const grandMean = _arrayMean(chainMeans);
  let bSum        = 0;
  for (let i = 0; i < m; i++) bSum += (chainMeans[i]! - grandMean) ** 2;
  const B       = (n / (m - 1)) * bSum;
  const varPlus = ((n - 1) / n) * W + B / n;
  return Math.sqrt(varPlus / W);
}

/** @internal */
export function _rankNormalize(chains: Float64Array[]): Float64Array[] {
  const total  = chains.reduce((a, c) => a + c.length, 0);
  const pooled = new Float64Array(total);
  let offset   = 0;
  for (const c of chains) { pooled.set(c, offset); offset += c.length; }

  const order = Array.from({ length: total }, (_, i) => i);
  order.sort((a, b) => pooled[a]! - pooled[b]!);

  const ranks = new Float64Array(total);
  let i = 0;
  while (i < total) {
    let j = i;
    while (j + 1 < total && pooled[order[j]!]! === pooled[order[j + 1]!]!) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[order[k]!] = avg;
    i = j + 1;
  }

  // Blom's correction then probit
  const out = new Float64Array(total);
  for (let idx = 0; idx < total; idx++) {
    out[idx] = _norminvcdf((ranks[idx]! - 0.375) / (total + 0.25));
  }

  const result: Float64Array[] = [];
  offset = 0;
  for (const c of chains) { result.push(out.slice(offset, offset + c.length)); offset += c.length; }
  return result;
}

/** @internal */
export function _foldAroundMedian(chains: Float64Array[]): Float64Array[] {
  const total  = chains.reduce((a, c) => a + c.length, 0);
  const pooled = new Float64Array(total);
  let offset   = 0;
  for (const c of chains) { pooled.set(c, offset); offset += c.length; }
  const median = computeQuantile(sortedCopy(pooled), 0.5);
  return chains.map(c => {
    const f = new Float64Array(c.length);
    for (let i = 0; i < c.length; i++) f[i] = Math.abs(c[i]! - median);
    return f;
  });
}

/**
 * Split each chain into splitN equal halves.
 * Discards one draw after each of the first `rem` splits when length is uneven.
 * @internal
 */
export function _splitChains(chains: Float64Array[], splitN = 2): Float64Array[] {
  const result: Float64Array[] = [];
  for (const chain of chains) {
    const nIter  = Math.floor(chain.length / splitN);
    if (nIter < 3) continue;
    const extra  = chain.length % splitN;
    let   cursor = 0;
    for (let s = 0; s < splitN; s++) {
      result.push(chain.slice(cursor, cursor + nIter));
      cursor += nIter + (s < extra ? 1 : 0);
    }
  }
  return result;
}

/** @internal */
export function _mean(arr: Float64Array): number {
  if (arr.length === 0) return NaN;
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i]!;
  return s / arr.length;
}

/** @internal */
export function _biasedVariance(arr: Float64Array, mean: number): number {
  if (arr.length < 2) return NaN;
  let ss = 0;
  for (let i = 0; i < arr.length; i++) ss += (arr[i]! - mean) ** 2;
  return ss / arr.length;
}

/** @internal */
export function _arrayMean(arr: number[]): number {
  if (arr.length === 0) return NaN;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}
