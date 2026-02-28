import { quantile, sortedCopy } from '../utils';

export function computeMean(arr: Float64Array): number {
  if (arr.length === 0) return NaN;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i]!;
  return sum / arr.length;
}

export function computeStdev(arr: Float64Array): number {
  if (arr.length <= 1) return NaN;
  const m = computeMean(arr);
  let sumsq = 0;
  for (let i = 0; i < arr.length; i++) sumsq += arr[i]! * arr[i]!;
  return Math.sqrt(sumsq / arr.length - m * m);
}

export function computeQuantiles(arr: Float64Array) {
  const sorted = sortedCopy(arr);
  return {
    q5: quantile(sorted, 0.05),
    q25: quantile(sorted, 0.25),
    q50: quantile(sorted, 0.50),
    q75: quantile(sorted, 0.75),
    q95: quantile(sorted, 0.95),
  };
}

export function computeHDI(arr: Float64Array, credMass = 0.9): [number, number] {
  const sorted = sortedCopy(arr);
  const n = sorted.length;
  const intervalSize = Math.ceil(credMass * n);
  if (intervalSize >= n) return [sorted[0]!, sorted[n - 1]!];

  let bestWidth = Infinity;
  let bestLo = 0;

  for (let i = 0; i <= n - intervalSize; i++) {
    const width = sorted[i + intervalSize - 1]! - sorted[i]!;
    if (width < bestWidth) {
      bestWidth = width;
      bestLo = i;
    }
  }

  return [sorted[bestLo]!, sorted[bestLo + intervalSize - 1]!];
}
