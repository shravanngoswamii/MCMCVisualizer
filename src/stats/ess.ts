import { transform, inverseTransform } from './fft';

export function computeESS(chain: Float64Array): { ess: number; autocorrelation: number[] } {
  if (chain.length < 4) return { ess: 0, autocorrelation: [] };

  const acor = autocorrFFT(chain, chain.length);
  const n = firstNegPairStart(acor);

  let prevMin = 1;
  let accum = 0;
  let i = 1;
  while (i + 1 < n) {
    prevMin = Math.min(prevMin, acor[i]! + acor[i + 1]!);
    accum += prevMin;
    i += 2;
  }

  const sigmaSqHat = acor[0]! + 2 * accum;
  const ess = chain.length / sigmaSqHat;
  return {
    ess,
    autocorrelation: acor.map(v => (Number.isNaN(v) ? 0 : v)),
  };
}

function autocorrFFT(chain: Float64Array, n: number): number[] {
  const size = Math.round(Math.pow(2, Math.ceil(Math.log2(2 * chain.length - 1))));
  const variance = computeVariance(chain);
  if (variance === undefined || variance === 0) return [];

  const mean = computeMeanF64(chain);
  const ndata: number[] = new Array(size).fill(0);
  for (let i = 0; i < chain.length; i++) {
    ndata[i] = chain[i]! - mean;
  }

  const ndataImag: number[] = new Array(size).fill(0);
  transform(ndata, ndataImag);

  const pwr = ndata.map((r, i) => r * r + ndataImag[i]! * ndataImag[i]!);
  const acorrImag: number[] = new Array(pwr.length).fill(0);
  inverseTransform(pwr, acorrImag);

  return pwr.slice(0, n).map(x => x / variance / ndata.length / chain.length);
}

function firstNegPairStart(chain: number[]): number {
  const N = chain.length;
  let n = 0;
  while (n + 1 < N) {
    if (chain[n]! + chain[n + 1]! < 0) return n;
    n++;
  }
  return N;
}

function computeMeanF64(arr: Float64Array): number {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i]!;
  return sum / arr.length;
}

function computeVariance(arr: Float64Array): number | undefined {
  if (arr.length === 0) return undefined;
  const mean = computeMeanF64(arr);
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i]! - mean;
    sum += d * d;
  }
  return sum / arr.length;
}
