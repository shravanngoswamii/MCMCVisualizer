/**
 * ESS estimators.
 * Single-chain: IMSE estimator (per-chain sequence diagnostics).
 * Multi-chain:  Geyer's monotone sequence estimator with split chains (Vehtari 2021).
 */

import { transform, inverseTransform } from './fft';
import { _rankNormalize, _splitChains, _mean, _biasedVariance, _arrayMean } from './rhat';
import { _nextPow2 } from './math';
import { computeQuantile, sortedCopy } from '../utils';

export function computeESS(chain: Float64Array): { ess: number; autocorrelation: number[] } {
  if (chain.length < 4) return { ess: 0, autocorrelation: [] };
  const acor = _autocorrFFT(chain, chain.length);
  if (acor.length === 0) return { ess: 0, autocorrelation: [] };
  const n = _firstNegPairStart(acor);
  let prev = 1, acc = 0, i = 1;
  while (i + 1 < n) { prev = Math.min(prev, acor[i]! + acor[i + 1]!); acc += prev; i += 2; }
  const ess = chain.length / (acor[0]! + 2 * acc);
  return { ess, autocorrelation: acor.map(v => (Number.isNaN(v) ? 0 : v)) };
}

export function computeEssBulk(chains: Float64Array[]): number {
  if (chains.length < 2) return NaN;
  return _essBasic(_rankNormalize(chains));
}

export function computeEssTail(chains: Float64Array[], tailProb = 0.1): number {
  if (chains.length < 2) return NaN;
  const total  = chains.reduce((a, c) => a + c.length, 0);
  const pooled = new Float64Array(total);
  let offset   = 0;
  for (const c of chains) { pooled.set(c, offset); offset += c.length; }
  const sorted = sortedCopy(pooled);
  const ql     = computeQuantile(sorted, tailProb / 2);
  const qu     = computeQuantile(sorted, 1 - tailProb / 2);

  const lower = chains.map(c => { const ind = new Float64Array(c.length); for (let i = 0; i < c.length; i++) ind[i] = c[i]! <= ql ? 1 : 0; return ind; });
  const upper = chains.map(c => { const ind = new Float64Array(c.length); for (let i = 0; i < c.length; i++) ind[i] = c[i]! >= qu ? 1 : 0; return ind; });

  const lo = _essBasic(lower), hi = _essBasic(upper);
  if (isNaN(lo) && isNaN(hi)) return NaN;
  if (isNaN(lo)) return hi;
  if (isNaN(hi)) return lo;
  return Math.min(lo, hi);
}

export function computeEssBasic(chains: Float64Array[]): number {
  return _essBasic(chains);
}

// Geyer's initial monotone positive sequence estimator with split chains.
/** @internal */
export function _essBasic(chains: Float64Array[], splitN = 2): number {
  const splits = _splitChains(chains, splitN);
  const m      = splits.length;
  if (m < 2) return NaN;
  const n = splits[0]!.length;
  if (n < 4) return NaN;

  const ntotal     = m * n;
  const chainMeans = splits.map(_mean);
  const chainVars  = splits.map((c, i) => _biasedVariance(c, chainMeans[i]!));
  const W          = _arrayMean(chainVars);
  if (!isFinite(W) || W === 0) return NaN;

  const grandMean = _arrayMean(chainMeans);
  let bSum        = 0;
  for (let i = 0; i < m; i++) bSum += (chainMeans[i]! - grandMean) ** 2;
  const B        = (n / (m - 1)) * bSum;
  const varPlus  = ((n - 1) / n) * W + B / n;
  if (!isFinite(varPlus) || varPlus === 0) return NaN;

  const invV = 1 / varPlus;
  const centered = splits.map((c, i) => {
    const mu = chainMeans[i]!, out = new Float64Array(c.length);
    for (let j = 0; j < c.length; j++) out[j] = c[j]! - mu;
    return out;
  });

  const autocovs = centered.map(_chainAutocovFFT);
  const meanCov  = (k: number) => { let s = 0; for (let i = 0; i < m; i++) s += autocovs[i]![k] ?? 0; return s / m; };

  const maxlag = Math.min(n - 4, 250);
  let rhoOdd   = 1 - invV * (W - meanCov(1));
  let pT       = 1 + rhoOdd, sumPT = pT;
  let k        = 2;

  while (k < maxlag - 1) {
    const rhoEven = 1 - invV * (W - meanCov(k));
    rhoOdd        = 1 - invV * (W - meanCov(k + 1));
    const delta   = rhoEven + rhoOdd;
    if (delta <= 0) break;
    pT     = Math.min(delta, pT);
    sumPT += pT;
    k     += 2;
  }

  // Antithetic correction (Vehtari 2021 §3.2)
  const rhoFinal = maxlag > 1 ? 1 - invV * (W - meanCov(k)) : 0;
  const tau      = Math.max(0, 2 * sumPT + Math.max(0, rhoFinal) - 1);
  if (!isFinite(tau) || tau <= 0) return NaN;

  return Math.min(1 / tau, Math.log10(ntotal)) * ntotal;
}

/**
 * Biased autocovariance via FFT for a centred chain.
 * Returns cov[k] = (1/n) * Σ_{j=0}^{n-k-1} x[j]*x[j+k]
 *
 * Nayuki's inverseTransform does NOT divide by the FFT size (it is unscaled),
 * so pwr[k] after IFFT = size * Σ x[j]*x[j+k].
 * Dividing by (size * n) gives the biased autocovariance.
 */
export function _chainAutocovFFT(centred: Float64Array): Float64Array {
  const n    = centred.length;
  const size = _nextPow2(2 * n - 1);
  const real = new Array<number>(size).fill(0);
  const imag = new Array<number>(size).fill(0);
  for (let i = 0; i < n; i++) real[i] = centred[i]!;
  transform(real, imag);
  const pwr     = real.map((r, i) => r * r + imag[i]! * imag[i]!);
  const pwrImag = new Array<number>(pwr.length).fill(0);
  inverseTransform(pwr, pwrImag);
  // pwr[k] = size * Σ_{j=0}^{n-k-1} centred[j]*centred[j+k]
  // biased autocov[k] = pwr[k] / (size * n)
  const scale = size * n;
  const out   = new Float64Array(n);
  for (let k = 0; k < n; k++) out[k] = pwr[k]! / scale;
  return out;
}

function _autocorrFFT(chain: Float64Array, n: number): number[] {
  const size = _nextPow2(2 * chain.length - 1);
  let   mu   = 0, variance = 0;
  for (let i = 0; i < chain.length; i++) mu += chain[i]!;
  mu /= chain.length;
  for (let i = 0; i < chain.length; i++) variance += (chain[i]! - mu) ** 2;
  variance /= chain.length;
  if (!isFinite(variance) || variance === 0) return [];

  const real = new Array<number>(size).fill(0);
  const imag = new Array<number>(size).fill(0);
  for (let i = 0; i < chain.length; i++) real[i] = chain[i]! - mu;
  transform(real, imag);
  const pwr     = real.map((r, i) => r * r + imag[i]! * imag[i]!);
  const pwrImag = new Array<number>(pwr.length).fill(0);
  inverseTransform(pwr, pwrImag);
  return pwr.slice(0, n).map(x => x / variance / size / chain.length);
}

function _firstNegPairStart(arr: number[]): number {
  let i = 0;
  while (i + 1 < arr.length) { if (arr[i]! + arr[i + 1]! < 0) return i; i++; }
  return arr.length;
}
