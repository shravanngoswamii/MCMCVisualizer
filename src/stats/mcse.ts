import { computeESS } from './ess';
import { computeMean, computeStdev, computeQuantiles } from './summary';
import { sortedCopy } from '../utils';

export function computeMCSE(draws: Float64Array): number {
  if (draws.length < 4) return NaN;
  const sd = computeStdev(draws);
  const { ess } = computeESS(draws);
  if (ess <= 0 || isNaN(sd)) return NaN;
  return sd / Math.sqrt(ess);
}

export function computeBulkESS(chains: Float64Array[]): number {
  if (chains.length === 0) return 0;

  const ranked = rankNormalize(chains);
  return computeMultiChainESS(ranked);
}

export function computeTailESS(chains: Float64Array[]): number {
  if (chains.length === 0) return 0;

  const all = concatChains(chains);
  const q05 = computeQuantiles(all).q5;
  const q95 = computeQuantiles(all).q95;

  const indicators: Float64Array[] = chains.map(chain => {
    const ind = new Float64Array(chain.length);
    for (let i = 0; i < chain.length; i++) {
      ind[i] = (chain[i]! <= q05 || chain[i]! >= q95) ? 1 : 0;
    }
    return ind;
  });

  return computeMultiChainESS(indicators);
}

function rankNormalize(chains: Float64Array[]): Float64Array[] {
  const all = concatChains(chains);
  const sorted = sortedCopy(all);
  const n = all.length;

  const rankMap = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let lo = 0, hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid]! < all[i]!) lo = mid + 1;
      else hi = mid;
    }
    let count = 1;
    while (lo + count < n && sorted[lo + count] === sorted[lo]) count++;
    rankMap[i] = (lo + (lo + count - 1)) / 2 + 1;
  }

  const result: Float64Array[] = [];
  let offset = 0;
  for (const chain of chains) {
    const ranked = new Float64Array(chain.length);
    for (let i = 0; i < chain.length; i++) {
      const r = rankMap[offset + i]!;
      const p = (r - 0.375) / (n + 0.25);
      ranked[i] = normalQuantile(p);
    }
    result.push(ranked);
    offset += chain.length;
  }

  return result;
}

function computeMultiChainESS(chains: Float64Array[]): number {
  let totalESS = 0;
  for (const chain of chains) {
    const { ess } = computeESS(chain);
    totalESS += ess;
  }
  return totalESS;
}

function concatChains(chains: Float64Array[]): Float64Array {
  let len = 0;
  for (const c of chains) len += c.length;
  const result = new Float64Array(len);
  let offset = 0;
  for (const c of chains) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}

function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  const a = [
    -3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02,
    -3.066479806614716e+01, 2.506628277459239e+00,
  ];
  const b = [
    -5.447609879822406e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01,
    -1.328068155288572e+01,
  ];
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
    4.374664141464968e+00, 2.938163982698783e+00,
  ];
  const d = [
    7.784695709041462e-03, 3.224671290700398e-01,
    2.445134137142996e+00, 3.754408661907416e+00,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]!*q + c[1]!)*q + c[2]!)*q + c[3]!)*q + c[4]!)*q + c[5]!) /
           ((((d[0]!*q + d[1]!)*q + d[2]!)*q + d[3]!)*q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    const r = q * q;
    return (((((a[0]!*r + a[1]!)*r + a[2]!)*r + a[3]!)*r + a[4]!)*r + a[5]!) * q /
           (((((b[0]!*r + b[1]!)*r + b[2]!)*r + b[3]!)*r + b[4]!)*r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]!*q + c[1]!)*q + c[2]!)*q + c[3]!)*q + c[4]!)*q + c[5]!) /
            ((((d[0]!*q + d[1]!)*q + d[2]!)*q + d[3]!)*q + 1);
  }
}
