import { computeMean, computeStdev } from './summary';

export function computeGeweke(
  draws: Float64Array,
  firstFrac = 0.1,
  lastFrac = 0.5,
): { z: number; pValue: number } {
  const n = draws.length;
  if (n < 20) return { z: NaN, pValue: NaN };

  const nFirst = Math.floor(n * firstFrac);
  const nLast = Math.floor(n * lastFrac);

  if (nFirst < 2 || nLast < 2) return { z: NaN, pValue: NaN };

  const firstPart = draws.slice(0, nFirst);
  const lastPart = draws.slice(n - nLast);

  const meanFirst = computeMean(firstPart);
  const meanLast = computeMean(lastPart);

  const seFirst = spectralDensityAt0(firstPart);
  const seLast = spectralDensityAt0(lastPart);

  if (seFirst + seLast <= 0) return { z: NaN, pValue: NaN };

  const z = (meanFirst - meanLast) / Math.sqrt(seFirst / nFirst + seLast / nLast);
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));

  return { z, pValue };
}

function spectralDensityAt0(draws: Float64Array): number {
  const n = draws.length;
  const mean = computeMean(draws);
  const sd = computeStdev(draws);
  if (isNaN(sd) || sd === 0) return 0;

  const maxLag = Math.min(n - 1, Math.floor(n * 0.2));
  let gamma0 = 0;
  for (let i = 0; i < n; i++) gamma0 += (draws[i]! - mean) ** 2;
  gamma0 /= n;

  let s = gamma0;
  for (let lag = 1; lag <= maxLag; lag++) {
    const weight = 1 - lag / (maxLag + 1);
    let gamma = 0;
    for (let i = 0; i < n - lag; i++) {
      gamma += (draws[i]! - mean) * (draws[i + lag]! - mean);
    }
    gamma /= n;
    s += 2 * weight * gamma;
  }

  return Math.max(0, s);
}

function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * x);
  const d = 0.3989422804014327;
  const p = d * Math.exp(-x * x / 2) *
    (t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))));
  return 1 - p;
}
