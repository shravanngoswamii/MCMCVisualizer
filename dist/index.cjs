"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  MCMCData: () => MCMCData,
  computeBulkESS: () => computeBulkESS,
  computeESS: () => computeESS,
  computeExcessKurtosis: () => computeExcessKurtosis,
  computeGeweke: () => computeGeweke,
  computeHDI: () => computeHDI,
  computeMCSE: () => computeMCSE,
  computeMean: () => computeMean,
  computeQuantiles: () => computeQuantiles,
  computeRhat: () => computeRhat,
  computeSkewness: () => computeSkewness,
  computeSplitRhat: () => computeSplitRhat,
  computeStdev: () => computeStdev,
  computeTailESS: () => computeTailESS,
  detectFormat: () => detectFormat,
  fromAutoDetect: () => fromAutoDetect,
  fromChainArrays: () => fromChainArrays,
  fromMCMCChainsJSON: () => fromMCMCChainsJSON,
  fromStanCSV: () => fromStanCSV,
  fromStanCSVFiles: () => fromStanCSVFiles,
  fromTuringCSV: () => fromTuringCSV,
  plots: () => plots_exports
});
module.exports = __toCommonJS(index_exports);

// src/stats/fft.ts
function transform(real, imag) {
  const n = real.length;
  if (n !== imag.length) throw new RangeError("Mismatched lengths");
  if (n === 0) return;
  if ((n & n - 1) === 0) transformRadix2(real, imag);
  else transformBluestein(real, imag);
}
function inverseTransform(real, imag) {
  transform(imag, real);
}
function transformRadix2(real, imag) {
  const n = real.length;
  if (n === 1) return;
  let levels = -1;
  for (let i = 0; i < 32; i++) {
    if (1 << i === n) levels = i;
  }
  if (levels === -1) throw new RangeError("Length is not a power of 2");
  const cosTable = new Array(n / 2);
  const sinTable = new Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    cosTable[i] = Math.cos(2 * Math.PI * i / n);
    sinTable[i] = Math.sin(2 * Math.PI * i / n);
  }
  for (let i = 0; i < n; i++) {
    const j = reverseBits(i, levels);
    if (j > i) {
      let temp = real[i];
      real[i] = real[j];
      real[j] = temp;
      temp = imag[i];
      imag[i] = imag[j];
      imag[j] = temp;
    }
  }
  for (let size = 2; size <= n; size *= 2) {
    const halfsize = size / 2;
    const tablestep = n / size;
    for (let i = 0; i < n; i += size) {
      for (let j = i, k = 0; j < i + halfsize; j++, k += tablestep) {
        const l = j + halfsize;
        const tpre = real[l] * cosTable[k] + imag[l] * sinTable[k];
        const tpim = -real[l] * sinTable[k] + imag[l] * cosTable[k];
        real[l] = real[j] - tpre;
        imag[l] = imag[j] - tpim;
        real[j] = real[j] + tpre;
        imag[j] = imag[j] + tpim;
      }
    }
  }
}
function reverseBits(val, width) {
  let result = 0;
  for (let i = 0; i < width; i++) {
    result = result << 1 | val & 1;
    val >>>= 1;
  }
  return result;
}
function transformBluestein(real, imag) {
  const n = real.length;
  let m = 1;
  while (m < n * 2 + 1) m *= 2;
  const cosTable = new Array(n);
  const sinTable = new Array(n);
  for (let i = 0; i < n; i++) {
    const j = i * i % (n * 2);
    cosTable[i] = Math.cos(Math.PI * j / n);
    sinTable[i] = Math.sin(Math.PI * j / n);
  }
  const areal = zeros(m);
  const aimag = zeros(m);
  for (let i = 0; i < n; i++) {
    areal[i] = real[i] * cosTable[i] + imag[i] * sinTable[i];
    aimag[i] = -real[i] * sinTable[i] + imag[i] * cosTable[i];
  }
  const breal = zeros(m);
  const bimag = zeros(m);
  breal[0] = cosTable[0];
  bimag[0] = sinTable[0];
  for (let i = 1; i < n; i++) {
    breal[i] = breal[m - i] = cosTable[i];
    bimag[i] = bimag[m - i] = sinTable[i];
  }
  const creal = new Array(m);
  const cimag = new Array(m);
  convolveComplex(areal, aimag, breal, bimag, creal, cimag);
  for (let i = 0; i < n; i++) {
    real[i] = creal[i] * cosTable[i] + cimag[i] * sinTable[i];
    imag[i] = -creal[i] * sinTable[i] + cimag[i] * cosTable[i];
  }
}
function convolveComplex(xreal, ximag, yreal, yimag, outreal, outimag) {
  const n = xreal.length;
  xreal = xreal.slice();
  ximag = ximag.slice();
  yreal = yreal.slice();
  yimag = yimag.slice();
  transform(xreal, ximag);
  transform(yreal, yimag);
  for (let i = 0; i < n; i++) {
    const temp = xreal[i] * yreal[i] - ximag[i] * yimag[i];
    ximag[i] = ximag[i] * yreal[i] + xreal[i] * yimag[i];
    xreal[i] = temp;
  }
  inverseTransform(xreal, ximag);
  for (let i = 0; i < n; i++) {
    outreal[i] = xreal[i] / n;
    outimag[i] = ximag[i] / n;
  }
}
function zeros(n) {
  const result = [];
  for (let i = 0; i < n; i++) result.push(0);
  return result;
}

// src/stats/ess.ts
function computeESS(chain) {
  if (chain.length < 4) return { ess: 0, autocorrelation: [] };
  const acor = autocorrFFT(chain, chain.length);
  const n = firstNegPairStart(acor);
  let prevMin = 1;
  let accum = 0;
  let i = 1;
  while (i + 1 < n) {
    prevMin = Math.min(prevMin, acor[i] + acor[i + 1]);
    accum += prevMin;
    i += 2;
  }
  const sigmaSqHat = acor[0] + 2 * accum;
  const ess = chain.length / sigmaSqHat;
  return {
    ess,
    autocorrelation: acor.map((v) => Number.isNaN(v) ? 0 : v)
  };
}
function autocorrFFT(chain, n) {
  const size = Math.round(Math.pow(2, Math.ceil(Math.log2(2 * chain.length - 1))));
  const variance = computeVariance(chain);
  if (variance === void 0 || variance === 0) return [];
  const mean2 = computeMeanF64(chain);
  const ndata = new Array(size).fill(0);
  for (let i = 0; i < chain.length; i++) {
    ndata[i] = chain[i] - mean2;
  }
  const ndataImag = new Array(size).fill(0);
  transform(ndata, ndataImag);
  const pwr = ndata.map((r, i) => r * r + ndataImag[i] * ndataImag[i]);
  const acorrImag = new Array(pwr.length).fill(0);
  inverseTransform(pwr, acorrImag);
  return pwr.slice(0, n).map((x) => x / variance / ndata.length / chain.length);
}
function firstNegPairStart(chain) {
  const N = chain.length;
  let n = 0;
  while (n + 1 < N) {
    if (chain[n] + chain[n + 1] < 0) return n;
    n++;
  }
  return N;
}
function computeMeanF64(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  return sum / arr.length;
}
function computeVariance(arr) {
  if (arr.length === 0) return void 0;
  const mean2 = computeMeanF64(arr);
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i] - mean2;
    sum += d * d;
  }
  return sum / arr.length;
}

// src/stats/rhat.ts
function computeRhat(chainMeans, chainStdevs, chainCounts) {
  if (chainMeans.length <= 1) return void 0;
  for (const c of chainCounts) {
    if (c <= 1) return void 0;
  }
  const m = chainMeans.length;
  const meanChainLength = mean(chainCounts);
  if (meanChainLength === void 0) return void 0;
  const vars = chainStdevs.map((s, i) => s * s * chainCounts[i] / (chainCounts[i] - 1));
  const stdevOfMeans = stdev(chainMeans);
  if (stdevOfMeans === void 0) return void 0;
  const varOfMeans = stdevOfMeans * stdevOfMeans * m / (m - 1);
  const meanOfVars = mean(vars);
  if (meanOfVars === void 0 || meanOfVars === 0) return void 0;
  return Math.sqrt((meanChainLength - 1) / meanChainLength + varOfMeans / meanOfVars);
}
function mean(arr) {
  if (arr.length === 0) return void 0;
  let sum = 0;
  for (const v of arr) sum += v;
  return sum / arr.length;
}
function stdev(arr) {
  if (arr.length <= 1) return void 0;
  const m = mean(arr);
  let sumsq = 0;
  for (const v of arr) sumsq += v * v;
  return Math.sqrt(sumsq / arr.length - m * m);
}

// src/utils.ts
function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}
function splitLines(text) {
  return text.split(/\r?\n/).filter((line) => line.trim().length > 0);
}
function quantile(sorted, q) {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0];
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const frac = pos - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}
function sortedCopy(arr) {
  const copy = new Float64Array(arr);
  copy.sort();
  return copy;
}
function fromStanName(name) {
  if (!name.includes(".")) return name;
  const parts = name.split(".");
  const base = parts[0];
  const indices = parts.slice(1);
  if (indices.length > 0 && indices.every((p) => p.length > 0 && /^\d+$/.test(p))) {
    return `${base}[${indices.join(",")}]`;
  }
  return name;
}
function toStanName(name) {
  const m = name.match(/^(.+)\[(.+)\]$/);
  if (!m) return name;
  return `${m[1]}.${m[2].replace(/,/g, ".")}`;
}

// src/stats/summary.ts
function computeMean(arr) {
  if (arr.length === 0) return NaN;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  return sum / arr.length;
}
function computeStdev(arr) {
  if (arr.length <= 1) return NaN;
  const m = computeMean(arr);
  let sumsq = 0;
  for (let i = 0; i < arr.length; i++) sumsq += arr[i] * arr[i];
  return Math.sqrt(sumsq / arr.length - m * m);
}
function computeSkewness(arr) {
  if (arr.length < 3) return NaN;
  const mean2 = computeMean(arr);
  const sd = computeStdev(arr);
  if (!isFinite(sd) || sd === 0) return 0;
  let thirdMoment = 0;
  for (let i = 0; i < arr.length; i++) {
    thirdMoment += (arr[i] - mean2) ** 3;
  }
  return thirdMoment / arr.length / sd ** 3;
}
function computeExcessKurtosis(arr) {
  if (arr.length < 4) return NaN;
  const mean2 = computeMean(arr);
  const sd = computeStdev(arr);
  if (!isFinite(sd) || sd === 0) return 0;
  let fourthMoment = 0;
  for (let i = 0; i < arr.length; i++) {
    fourthMoment += (arr[i] - mean2) ** 4;
  }
  return fourthMoment / arr.length / sd ** 4 - 3;
}
function computeQuantiles(arr) {
  const sorted = sortedCopy(arr);
  return {
    q5: quantile(sorted, 0.05),
    q25: quantile(sorted, 0.25),
    q50: quantile(sorted, 0.5),
    q75: quantile(sorted, 0.75),
    q95: quantile(sorted, 0.95)
  };
}
function computeHDI(arr, credMass = 0.9) {
  const sorted = sortedCopy(arr);
  const n = sorted.length;
  const intervalSize = Math.ceil(credMass * n);
  if (intervalSize >= n) return [sorted[0], sorted[n - 1]];
  let bestWidth = Infinity;
  let bestLo = 0;
  for (let i = 0; i <= n - intervalSize; i++) {
    const width = sorted[i + intervalSize - 1] - sorted[i];
    if (width < bestWidth) {
      bestWidth = width;
      bestLo = i;
    }
  }
  return [sorted[bestLo], sorted[bestLo + intervalSize - 1]];
}

// src/stats/mcse.ts
function computeMCSE(draws) {
  if (draws.length < 4) return NaN;
  const sd = computeStdev(draws);
  const { ess } = computeESS(draws);
  if (ess <= 0 || isNaN(sd)) return NaN;
  return sd / Math.sqrt(ess);
}
function computeBulkESS(chains) {
  if (chains.length === 0) return 0;
  const ranked = rankNormalize(chains);
  return computeMultiChainESS(ranked);
}
function computeTailESS(chains) {
  if (chains.length === 0) return 0;
  const all = concatChains(chains);
  const q05 = computeQuantiles(all).q5;
  const q95 = computeQuantiles(all).q95;
  const indicators = chains.map((chain) => {
    const ind = new Float64Array(chain.length);
    for (let i = 0; i < chain.length; i++) {
      ind[i] = chain[i] <= q05 || chain[i] >= q95 ? 1 : 0;
    }
    return ind;
  });
  return computeMultiChainESS(indicators);
}
function rankNormalize(chains) {
  const all = concatChains(chains);
  const sorted = sortedCopy(all);
  const n = all.length;
  const rankMap = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let lo = 0, hi = n - 1;
    while (lo < hi) {
      const mid = lo + hi >> 1;
      if (sorted[mid] < all[i]) lo = mid + 1;
      else hi = mid;
    }
    let count = 1;
    while (lo + count < n && sorted[lo + count] === sorted[lo]) count++;
    rankMap[i] = (lo + (lo + count - 1)) / 2 + 1;
  }
  const result = [];
  let offset = 0;
  for (const chain of chains) {
    const ranked = new Float64Array(chain.length);
    for (let i = 0; i < chain.length; i++) {
      const r = rankMap[offset + i];
      const p = (r - 0.375) / (n + 0.25);
      ranked[i] = normalQuantile(p);
    }
    result.push(ranked);
    offset += chain.length;
  }
  return result;
}
function computeMultiChainESS(chains) {
  let totalESS = 0;
  for (const chain of chains) {
    const { ess } = computeESS(chain);
    totalESS += ess;
  }
  return totalESS;
}
function concatChains(chains) {
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
function normalQuantile(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;
  const a = [
    -39.69683028665376,
    220.9460984245205,
    -275.9285104469687,
    138.357751867269,
    -30.66479806614716,
    2.506628277459239
  ];
  const b = [
    -54.47609879822406,
    161.5858368580409,
    -155.6989798598866,
    66.80131188771972,
    -13.28068155288572
  ];
  const c = [
    -0.007784894002430293,
    -0.3223964580411365,
    -2.400758277161838,
    -2.549732539343734,
    4.374664141464968,
    2.938163982698783
  ];
  const d = [
    0.007784695709041462,
    0.3224671290700398,
    2.445134137142996,
    3.754408661907416
  ];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    const r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

// src/stats/geweke.ts
function computeGeweke(draws, firstFrac = 0.1, lastFrac = 0.5) {
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
function spectralDensityAt0(draws) {
  const n = draws.length;
  const mean2 = computeMean(draws);
  const sd = computeStdev(draws);
  if (isNaN(sd) || sd === 0) return 0;
  const maxLag = Math.min(n - 1, Math.floor(n * 0.2));
  let gamma0 = 0;
  for (let i = 0; i < n; i++) gamma0 += (draws[i] - mean2) ** 2;
  gamma0 /= n;
  let s = gamma0;
  for (let lag = 1; lag <= maxLag; lag++) {
    const weight = 1 - lag / (maxLag + 1);
    let gamma = 0;
    for (let i = 0; i < n - lag; i++) {
      gamma += (draws[i] - mean2) * (draws[i + lag] - mean2);
    }
    gamma /= n;
    s += 2 * weight * gamma;
  }
  return Math.max(0, s);
}
function normalCDF(x) {
  const t = 1 / (1 + 0.2316419 * x);
  const d = 0.3989422804014327;
  const p = d * Math.exp(-x * x / 2) * (t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))));
  return 1 - p;
}

// src/stats/split-rhat.ts
function computeSplitRhat(chains) {
  if (chains.length === 0) return void 0;
  const splitChains = [];
  for (const chain of chains) {
    const half = Math.floor(chain.length / 2);
    if (half < 2) return void 0;
    splitChains.push(chain.slice(0, half));
    splitChains.push(chain.slice(half, half * 2));
  }
  const m = splitChains.length;
  if (m <= 1) return void 0;
  const means = splitChains.map((c) => computeMean(c));
  const sds = splitChains.map((c) => computeStdev(c));
  const counts = splitChains.map((c) => c.length);
  for (const c of counts) {
    if (c <= 1) return void 0;
  }
  const n = counts.reduce((a, b) => a + b, 0) / m;
  const grandMean = means.reduce((a, b) => a + b, 0) / m;
  let B = 0;
  for (let i = 0; i < m; i++) {
    B += (means[i] - grandMean) ** 2;
  }
  B = n / (m - 1) * B;
  let W = 0;
  for (let i = 0; i < m; i++) {
    W += sds[i] * sds[i] * counts[i] / (counts[i] - 1);
  }
  W /= m;
  if (W === 0) return void 0;
  const varHat = (n - 1) / n * W + B / n;
  return Math.sqrt(varHat / W);
}

// src/exporters/index.ts
function toTuringCSV(data) {
  const lines = [];
  for (const chainName of data.chainNames) {
    const chain = data.chains.get(chainName);
    for (const varName of data.variableNames) {
      const draws = chain.draws.get(varName);
      if (!draws) continue;
      for (let i = 0; i < draws.length; i++) {
        lines.push(`${chainName},${varName},${i},${draws[i]}`);
      }
    }
  }
  return lines.join("\n");
}
function toMCMCChainsCSV(data) {
  const lines = [];
  lines.push(["iteration", "chain", ...data.variableNames].join(","));
  for (const chainName of data.chainNames) {
    const chain = data.chains.get(chainName);
    for (let i = 0; i < chain.drawCount; i++) {
      const vals = [`${i + 1}`, chainName];
      for (const v of data.variableNames) {
        const draws = chain.draws.get(v);
        vals.push(draws && i < draws.length ? `${draws[i]}` : "");
      }
      lines.push(vals.join(","));
    }
  }
  return lines.join("\n");
}
function toStanCSV(data) {
  const sections = [];
  for (let ci = 0; ci < data.chainNames.length; ci++) {
    const chainName = data.chainNames[ci];
    const chain = data.chains.get(chainName);
    const lines = [];
    lines.push(`# Stan CSV export - ${chainName}`);
    lines.push(`# model = mcmc-visualizer export`);
    lines.push(`# method = sample`);
    const stanNames = data.variableNames.map(toStanName);
    const headerCols = ["lp__", "accept_stat__", ...stanNames];
    lines.push(headerCols.join(","));
    for (let i = 0; i < chain.drawCount; i++) {
      const vals = ["0", "1"];
      for (const v of data.variableNames) {
        const draws = chain.draws.get(v);
        vals.push(draws && i < draws.length ? `${draws[i]}` : "");
      }
      lines.push(vals.join(","));
    }
    sections.push(lines.join("\n"));
  }
  return sections.join("\n\n");
}
function toWideCSV(data) {
  const lines = [];
  lines.push(["chain_", "draw_", ...data.variableNames].join(","));
  for (const chainName of data.chainNames) {
    const chain = data.chains.get(chainName);
    for (let i = 0; i < chain.drawCount; i++) {
      const vals = [chainName, `${i + 1}`];
      for (const v of data.variableNames) {
        const draws = chain.draws.get(v);
        vals.push(draws && i < draws.length ? `${draws[i]}` : "");
      }
      lines.push(vals.join(","));
    }
  }
  return lines.join("\n");
}
function toJSON(data) {
  const result = {};
  for (const chainName of data.chainNames) {
    const chain = data.chains.get(chainName);
    const chainObj = {};
    for (const varName of data.variableNames) {
      const draws = chain.draws.get(varName);
      chainObj[varName] = draws ? Array.from(draws) : [];
    }
    result[chainName] = chainObj;
  }
  return JSON.stringify(result, null, 2);
}
function toMCMCChainsJSON(data) {
  const nIter = data.drawCount;
  const nParams = data.variableNames.length;
  const nChains = data.chainNames.length;
  const flat = new Array(nIter * nParams * nChains);
  for (let c = 0; c < nChains; c++) {
    const chain = data.chains.get(data.chainNames[c]);
    for (let p = 0; p < nParams; p++) {
      const draws = chain.draws.get(data.variableNames[p]);
      for (let i = 0; i < nIter; i++) {
        const flatIdx = i + p * nIter + c * nIter * nParams;
        flat[flatIdx] = draws && i < draws.length ? draws[i] : null;
      }
    }
  }
  const obj = {
    size: [nIter, nParams, nChains],
    value_flat: flat,
    iterations: Array.from({ length: nIter }, (_, i) => i + 1),
    parameters: data.variableNames,
    chains: Array.from({ length: nChains }, (_, i) => i + 1),
    logevidence: null,
    name_map: { parameters: data.variableNames, internals: [] },
    info: {}
  };
  return JSON.stringify(obj);
}

// src/inference-data.ts
var MCMCData = class _MCMCData {
  constructor(chains) {
    this.chains = chains;
    this.chainNames = Array.from(chains.keys());
    const varSet = /* @__PURE__ */ new Set();
    let maxDraws = 0;
    for (const chain of chains.values()) {
      for (const v of chain.draws.keys()) varSet.add(v);
      maxDraws = Math.max(maxDraws, chain.drawCount);
    }
    this.variableNames = Array.from(varSet);
    this.drawCount = maxDraws;
  }
  getDraws(variable, chain) {
    if (chain) {
      const c = this.chains.get(chain);
      if (!c) throw new Error(`Chain "${chain}" not found`);
      const draws = c.draws.get(variable);
      if (!draws) throw new Error(`Variable "${variable}" not found in chain "${chain}"`);
      return draws;
    }
    return this.getAllDraws(variable);
  }
  getAllDraws(variable) {
    const arrays = [];
    let totalLen = 0;
    for (const chain of this.chains.values()) {
      const d = chain.draws.get(variable);
      if (d) {
        arrays.push(d);
        totalLen += d.length;
      }
    }
    const result = new Float64Array(totalLen);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  }
  sequenceStats(variable, chain) {
    const draws = this.getDraws(variable, chain);
    const mean2 = computeMean(draws);
    const stdev2 = computeStdev(draws);
    const { ess, autocorrelation } = computeESS(draws);
    return {
      mean: mean2,
      stdev: stdev2,
      count: draws.length,
      ess,
      essPerDraw: draws.length > 0 ? ess / draws.length : NaN,
      mcse: computeMCSE(draws),
      skewness: computeSkewness(draws),
      excessKurtosis: computeExcessKurtosis(draws),
      autocorrelation
    };
  }
  variableStats(variable) {
    const chainMeans = [];
    const chainStdevs = [];
    const chainCounts = [];
    let totalESS = 0;
    const chainDraws = [];
    for (const chainName of this.chainNames) {
      const chain = this.chains.get(chainName);
      const draws = chain.draws.get(variable);
      if (!draws || draws.length === 0) continue;
      const m = computeMean(draws);
      const s = computeStdev(draws);
      const { ess } = computeESS(draws);
      chainMeans.push(m);
      chainStdevs.push(isNaN(s) ? 0 : s);
      chainCounts.push(draws.length);
      chainDraws.push(draws);
      totalESS += ess;
    }
    const allDraws = this.getAllDraws(variable);
    const quantiles = computeQuantiles(allDraws);
    const hdi90 = computeHDI(allDraws, 0.9);
    const rhat = computeRhat(chainMeans, chainStdevs, chainCounts);
    const mcse = computeMCSE(allDraws);
    const bulkEss = computeBulkESS(chainDraws);
    const tailEss = computeTailESS(chainDraws);
    const splitRhat = computeSplitRhat(chainDraws);
    const geweke = computeGeweke(allDraws);
    return {
      mean: computeMean(allDraws),
      stdev: computeStdev(allDraws),
      count: allDraws.length,
      ess: totalESS,
      essPerDraw: allDraws.length > 0 ? totalESS / allDraws.length : NaN,
      mcse,
      bulkEss,
      tailEss,
      rhat,
      splitRhat,
      geweke,
      skewness: computeSkewness(allDraws),
      excessKurtosis: computeExcessKurtosis(allDraws),
      quantiles,
      hdi90,
      hdi90Width: hdi90[1] - hdi90[0]
    };
  }
  summary() {
    return this.variableNames.map((variable) => ({
      variable,
      ...this.variableStats(variable)
    }));
  }
  toTuringCSV() {
    return toTuringCSV(this);
  }
  toMCMCChainsCSV() {
    return toMCMCChainsCSV(this);
  }
  toStanCSV() {
    return toStanCSV(this);
  }
  toWideCSV() {
    return toWideCSV(this);
  }
  toJSON() {
    return toJSON(this);
  }
  toMCMCChainsJSON() {
    return toMCMCChainsJSON(this);
  }
  slice(start, end) {
    const newChains = /* @__PURE__ */ new Map();
    for (const [name, chain] of this.chains) {
      const newDraws = /* @__PURE__ */ new Map();
      let maxLen = 0;
      for (const [v, draws] of chain.draws) {
        const sliced = draws.slice(start, end);
        newDraws.set(v, sliced);
        maxLen = Math.max(maxLen, sliced.length);
      }
      newChains.set(name, { name, draws: newDraws, drawCount: maxLen });
    }
    return new _MCMCData(newChains);
  }
  filterChains(chainNames) {
    const newChains = /* @__PURE__ */ new Map();
    for (const name of chainNames) {
      const chain = this.chains.get(name);
      if (chain) newChains.set(name, chain);
    }
    return new _MCMCData(newChains);
  }
  filterVariables(variableNames) {
    const varSet = new Set(variableNames);
    const newChains = /* @__PURE__ */ new Map();
    for (const [name, chain] of this.chains) {
      const newDraws = /* @__PURE__ */ new Map();
      let maxLen = 0;
      for (const [v, draws] of chain.draws) {
        if (varSet.has(v)) {
          newDraws.set(v, draws);
          maxLen = Math.max(maxLen, draws.length);
        }
      }
      newChains.set(name, { name, draws: newDraws, drawCount: maxLen });
    }
    return new _MCMCData(newChains);
  }
};

// src/parsers/turing-csv.ts
function parseTuringCSV(text) {
  const lines = splitLines(text);
  if (lines.length === 0) throw new Error("Empty input");
  const firstFields = parseCSVLine(lines[0]);
  if (firstFields[0] === "iteration" && firstFields[1] === "chain") {
    return parseWideFormat(lines, "iteration", "chain");
  }
  if (firstFields[0] === "chain_" && firstFields[1] === "draw_") {
    return parseWideFormat(lines, "chain_", "draw_");
  }
  if (firstFields.length === 4 && !isNaN(parseFloat(firstFields[2]))) {
    return parseLongFormat(lines);
  }
  throw new Error("Unrecognized Turing CSV format");
}
function parseLongFormat(lines) {
  const raw = /* @__PURE__ */ new Map();
  for (const line of lines) {
    const fields = parseCSVLine(line);
    if (fields.length < 4) continue;
    const chainName = fields[0];
    const varName = fields[1];
    const value = parseFloat(fields[3]);
    if (isNaN(value)) continue;
    let chainVars = raw.get(chainName);
    if (!chainVars) {
      chainVars = /* @__PURE__ */ new Map();
      raw.set(chainName, chainVars);
    }
    let values = chainVars.get(varName);
    if (!values) {
      values = [];
      chainVars.set(varName, values);
    }
    values.push(value);
  }
  return buildChainData(raw);
}
function parseWideFormat(lines, chainCol, drawCol) {
  const headers = parseCSVLine(lines[0]);
  const chainIdx = headers.indexOf(chainCol === "chain_" ? "chain_" : "chain");
  const drawIdx = headers.indexOf(drawCol === "draw_" ? "draw_" : "iteration");
  const isChainFirst = chainCol === "chain_";
  const variableNames = headers.filter(
    (_, i) => i !== (isChainFirst ? 0 : headers.indexOf("iteration")) && i !== (isChainFirst ? 1 : headers.indexOf("chain"))
  );
  const variableIndices = variableNames.map((v) => headers.indexOf(v));
  const raw = /* @__PURE__ */ new Map();
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < headers.length) continue;
    const chainName = isChainFirst ? fields[0] : fields[chainIdx];
    let chainVars = raw.get(chainName);
    if (!chainVars) {
      chainVars = /* @__PURE__ */ new Map();
      raw.set(chainName, chainVars);
    }
    for (let j = 0; j < variableNames.length; j++) {
      const varName = variableNames[j];
      const value = parseFloat(fields[variableIndices[j]]);
      if (isNaN(value)) continue;
      let values = chainVars.get(varName);
      if (!values) {
        values = [];
        chainVars.set(varName, values);
      }
      values.push(value);
    }
  }
  return buildChainData(raw);
}
function buildChainData(raw) {
  const chains = /* @__PURE__ */ new Map();
  for (const [chainName, vars] of raw) {
    const draws = /* @__PURE__ */ new Map();
    let maxLen = 0;
    for (const [varName, values] of vars) {
      const arr = new Float64Array(values);
      draws.set(varName, arr);
      maxLen = Math.max(maxLen, arr.length);
    }
    chains.set(chainName, { name: chainName, draws, drawCount: maxLen });
  }
  return chains;
}

// src/parsers/stan-csv.ts
function parseStanCSV(text) {
  return parseStanCSVFiles([text]);
}
function parseStanCSVFiles(files) {
  const chains = /* @__PURE__ */ new Map();
  for (let idx = 0; idx < files.length; idx++) {
    const text = files[idx];
    const chainName = `chain#${idx + 1}`;
    const lines = splitLines(text);
    const dataLines = lines.filter((l) => !l.startsWith("#"));
    if (dataLines.length < 2) continue;
    const headers = parseCSVLine(dataLines[0]);
    const keepIndices = [];
    const varNames = [];
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      if (!h.endsWith("__")) {
        keepIndices.push(i);
        varNames.push(fromStanName(h));
      }
    }
    const draws = /* @__PURE__ */ new Map();
    for (const v of varNames) draws.set(v, []);
    for (let i = 1; i < dataLines.length; i++) {
      const fields = parseCSVLine(dataLines[i]);
      if (fields.length < headers.length) continue;
      for (let j = 0; j < keepIndices.length; j++) {
        const value = parseFloat(fields[keepIndices[j]]);
        if (!isNaN(value)) {
          draws.get(varNames[j]).push(value);
        }
      }
    }
    const typedDraws = /* @__PURE__ */ new Map();
    let maxLen = 0;
    for (const [v, arr] of draws) {
      const typed = new Float64Array(arr);
      typedDraws.set(v, typed);
      maxLen = Math.max(maxLen, typed.length);
    }
    chains.set(chainName, { name: chainName, draws: typedDraws, drawCount: maxLen });
  }
  return chains;
}

// src/parsers/mcmcchains-json.ts
function parseMCMCChainsJSON(text) {
  const obj = JSON.parse(text);
  if (!obj.size || !obj.value_flat || !obj.parameters || !obj.chains) {
    throw new Error("Invalid MCMCChains JSON: missing required fields (size, value_flat, parameters, chains)");
  }
  const [nIter, nParams, nChains] = obj.size;
  const flat = obj.value_flat;
  const paramNames = obj.parameters;
  const chainIds = obj.chains;
  if (flat.length !== nIter * nParams * nChains) {
    throw new Error(
      `MCMCChains JSON size mismatch: expected ${nIter * nParams * nChains} values, got ${flat.length}`
    );
  }
  const internals = new Set(obj.name_map?.internals ?? []);
  const chains = /* @__PURE__ */ new Map();
  for (let c = 0; c < nChains; c++) {
    const chainName = `chain#${chainIds[c] ?? c + 1}`;
    const draws = /* @__PURE__ */ new Map();
    for (let p = 0; p < nParams; p++) {
      const name = paramNames[p];
      if (internals.has(name)) continue;
      const arr = new Float64Array(nIter);
      for (let i = 0; i < nIter; i++) {
        const flatIdx = i + p * nIter + c * nIter * nParams;
        const val = flat[flatIdx];
        arr[i] = val === null || val === void 0 ? NaN : val;
      }
      draws.set(name, arr);
    }
    chains.set(chainName, { name: chainName, draws, drawCount: nIter });
  }
  return chains;
}
function isMCMCChainsJSON(text) {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith("{")) return false;
  try {
    const obj = JSON.parse(trimmed);
    return Array.isArray(obj.size) && obj.size.length === 3 && Array.isArray(obj.value_flat) && Array.isArray(obj.parameters);
  } catch {
    return false;
  }
}

// src/parsers/detect.ts
function detectFormat(text) {
  const trimmed = text.trimStart();
  if (trimmed.startsWith("{") && isMCMCChainsJSON(trimmed)) return "mcmcchains-json";
  const lines = splitLines(text);
  if (lines.length === 0) return "unknown";
  if (isStanCSV(lines)) return "stan-csv";
  if (isTuringCSVWide(lines)) return "turing-csv";
  if (isTuringCSVLong(lines)) return "turing-csv";
  return "unknown";
}
function isStanCSV(lines) {
  if (!lines[0]?.startsWith("#")) return false;
  const dataLines = lines.filter((l) => !l.startsWith("#"));
  if (dataLines.length < 1) return false;
  const headers = parseCSVLine(dataLines[0]);
  return headers[0] === "lp__" && headers[1] === "accept_stat__";
}
function isTuringCSVWide(lines) {
  const headers = parseCSVLine(lines[0]);
  return headers[0] === "iteration" && headers[1] === "chain" || headers[0] === "chain_" && headers[1] === "draw_";
}
function isTuringCSVLong(lines) {
  if (lines.length < 2) return false;
  const first = parseCSVLine(lines[0]);
  if (first.length !== 4) return false;
  const drawIdx = parseFloat(first[2]);
  const value = parseFloat(first[3]);
  return !isNaN(drawIdx) && !isNaN(value) && Number.isInteger(drawIdx);
}

// src/plots/index.ts
var plots_exports = {};
__export(plots_exports, {
  autocorrelationPlot: () => autocorrelationPlot,
  chainIntervalsPlot: () => chainIntervalsPlot,
  cumulativeMeanPlot: () => cumulativeMeanPlot,
  densityPlot: () => densityPlot,
  diagnosticsHeatmapPlot: () => diagnosticsHeatmapPlot,
  ecdfPlot: () => ecdfPlot,
  energyPlot: () => energyPlot,
  forestPlot: () => forestPlot,
  histogramPlot: () => histogramPlot,
  pairPlot: () => pairPlot,
  rankPlot: () => rankPlot,
  runningRhatPlot: () => runningRhatPlot,
  summaryTable: () => summaryTable,
  tracePlot: () => tracePlot,
  violinPlot: () => violinPlot
});

// src/plots/types.ts
var CHAIN_COLORS = [
  "#636EFA",
  "#EF553B",
  "#00CC96",
  "#AB63FA",
  "#FFA15A",
  "#19D3F3",
  "#FF6692",
  "#B6E880"
];
var FONT = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
function darkLayout(opts) {
  return {
    paper_bgcolor: "#181b26",
    plot_bgcolor: "#13151e",
    font: { color: "#eaedf3", family: FONT, size: 12 },
    xaxis: { gridcolor: "#262a3a", zerolinecolor: "#3a3f52", linecolor: "#2f3447" },
    yaxis: { gridcolor: "#262a3a", zerolinecolor: "#3a3f52", linecolor: "#2f3447" },
    margin: { t: 40, r: 20, b: 50, l: 60 },
    height: opts?.height,
    width: opts?.width,
    hoverlabel: { bgcolor: "#1e2130", bordercolor: "#3a3f52", font: { color: "#eaedf3" } }
  };
}
function lightLayout(opts) {
  return {
    paper_bgcolor: "#ffffff",
    plot_bgcolor: "#f8f9fa",
    font: { color: "#1a1a1a", family: FONT, size: 12 },
    xaxis: { gridcolor: "#e5e7eb", zerolinecolor: "#d1d5db", linecolor: "#d1d5db" },
    yaxis: { gridcolor: "#e5e7eb", zerolinecolor: "#d1d5db", linecolor: "#d1d5db" },
    margin: { t: 40, r: 20, b: 50, l: 60 },
    height: opts?.height,
    width: opts?.width
  };
}
function getLayout(opts) {
  return opts?.theme === "light" ? lightLayout(opts) : darkLayout(opts);
}
function getPlotly() {
  const g = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : void 0;
  if (g?.Plotly) return g.Plotly;
  throw new Error(
    'Plotly.js is required for plotting. Add <script src="https://cdn.plot.ly/plotly-2.35.0.min.js"></script> or install plotly.js-dist-min'
  );
}
function getConfig() {
  return {
    responsive: true,
    displaylogo: false,
    toImageButtonOptions: { format: "png", height: 600, width: 1200, scale: 2 }
  };
}

// src/plots/trace.ts
function tracePlot(container, data, variable, options) {
  const Plotly = getPlotly();
  let currentVar = variable;
  function render() {
    const traces = data.chainNames.map((chain, i) => ({
      y: Array.from(data.getDraws(currentVar, chain)),
      type: "scatter",
      mode: "lines",
      name: chain,
      line: { width: 0.8, color: CHAIN_COLORS[i % CHAIN_COLORS.length] }
    }));
    const layout = {
      ...getLayout(options),
      title: { text: `Trace: ${currentVar}` },
      xaxis: { ...getLayout(options).xaxis, title: "Iteration" },
      yaxis: { ...getLayout(options).yaxis, title: currentVar }
    };
    Plotly.react(container, traces, layout, getConfig());
  }
  render();
  return {
    destroy: () => Plotly.purge(container),
    update: (v) => {
      if (v) currentVar = v;
      render();
    }
  };
}

// src/plots/histogram.ts
function histogramPlot(container, data, variable, options) {
  const Plotly = getPlotly();
  let currentVar = variable;
  function render() {
    const traces = data.chainNames.map((chain, i) => ({
      x: Array.from(data.getDraws(currentVar, chain)),
      type: "histogram",
      name: chain,
      opacity: 0.6,
      marker: { color: CHAIN_COLORS[i % CHAIN_COLORS.length] }
    }));
    const layout = {
      ...getLayout(options),
      title: { text: `Distribution: ${currentVar}` },
      barmode: "overlay",
      xaxis: { ...getLayout(options).xaxis, title: currentVar },
      yaxis: { ...getLayout(options).yaxis, title: "Count" }
    };
    Plotly.react(container, traces, layout, getConfig());
  }
  render();
  return {
    destroy: () => Plotly.purge(container),
    update: (v) => {
      if (v) currentVar = v;
      render();
    }
  };
}

// src/plots/autocorrelation.ts
function autocorrelationPlot(container, data, variable, options) {
  const Plotly = getPlotly();
  let currentVar = variable;
  const MAX_LAG = 50;
  function acf(draws, maxLag) {
    const n = draws.length;
    let mean2 = 0;
    for (let i = 0; i < n; i++) mean2 += draws[i];
    mean2 /= n;
    let variance = 0;
    for (let i = 0; i < n; i++) variance += (draws[i] - mean2) ** 2;
    if (variance === 0) return new Array(maxLag + 1).fill(0);
    const result = [];
    for (let lag = 0; lag <= maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < n - lag; i++) sum += (draws[i] - mean2) * (draws[i + lag] - mean2);
      result.push(sum / variance);
    }
    return result;
  }
  function render() {
    const lags = Array.from({ length: MAX_LAG + 1 }, (_, i) => i);
    const traces = data.chainNames.map((chain, i) => {
      const draws = data.getDraws(currentVar, chain);
      const values = acf(draws, MAX_LAG);
      return {
        x: lags,
        y: values,
        type: "bar",
        name: chain,
        marker: { color: CHAIN_COLORS[i % CHAIN_COLORS.length] },
        opacity: 0.7
      };
    });
    const layout = {
      ...getLayout(options),
      title: { text: `Autocorrelation: ${currentVar}` },
      barmode: "group",
      xaxis: { ...getLayout(options).xaxis, title: "Lag" },
      yaxis: { ...getLayout(options).yaxis, title: "ACF", range: [-0.2, 1.05] },
      shapes: [{
        type: "line",
        x0: 0,
        x1: MAX_LAG,
        y0: 0,
        y1: 0,
        line: { color: "#888", width: 1, dash: "dash" }
      }]
    };
    Plotly.react(container, traces, layout, getConfig());
  }
  render();
  return {
    destroy: () => Plotly.purge(container),
    update: (v) => {
      if (v) currentVar = v;
      render();
    }
  };
}

// src/plots/forest.ts
function forestPlot(container, data, options) {
  const Plotly = getPlotly();
  function render() {
    const summaries = data.summary();
    const vars = summaries.map((s) => s.variable);
    const means = summaries.map((s) => s.mean);
    const hdiTrace = {
      x: means,
      y: vars,
      type: "scatter",
      mode: "markers",
      marker: { size: 9, color: CHAIN_COLORS[0], symbol: "diamond" },
      error_x: {
        type: "data",
        symmetric: false,
        array: summaries.map((s) => s.hdi90[1] - s.mean),
        arrayminus: summaries.map((s) => s.mean - s.hdi90[0]),
        thickness: 1.5,
        width: 0,
        color: CHAIN_COLORS[0]
      },
      name: "90% HDI",
      showlegend: true
    };
    const iqrTrace = {
      x: means,
      y: vars,
      type: "scatter",
      mode: "markers",
      marker: { size: 0.1, color: "rgba(0,0,0,0)" },
      error_x: {
        type: "data",
        symmetric: false,
        array: summaries.map((s) => s.quantiles.q75 - s.mean),
        arrayminus: summaries.map((s) => s.mean - s.quantiles.q25),
        thickness: 5,
        width: 0,
        color: CHAIN_COLORS[0]
      },
      name: "50% CI (IQR)",
      showlegend: true,
      hoverinfo: "skip"
    };
    const layout = {
      ...getLayout(options),
      title: { text: "Forest Plot" },
      height: Math.max(300, vars.length * 50 + 100),
      xaxis: { ...getLayout(options).xaxis, title: "Value", zeroline: true },
      yaxis: { ...getLayout(options).yaxis, automargin: true },
      shapes: [{
        type: "line",
        x0: 0,
        x1: 0,
        yref: "paper",
        y0: 0,
        y1: 1,
        line: { color: "#888", width: 1, dash: "dash" }
      }]
    };
    Plotly.react(container, [iqrTrace, hdiTrace], layout, getConfig());
  }
  render();
  return {
    destroy: () => Plotly.purge(container),
    update: () => render()
  };
}

// src/plots/cumulative-mean.ts
function cumulativeMeanPlot(container, data, variable, options) {
  const Plotly = getPlotly();
  let currentVar = variable;
  function render() {
    const traces = data.chainNames.map((chain, i) => {
      const draws = data.getDraws(currentVar, chain);
      const cumMean = [];
      let sum = 0;
      for (let j = 0; j < draws.length; j++) {
        sum += draws[j];
        cumMean.push(sum / (j + 1));
      }
      return {
        y: cumMean,
        type: "scatter",
        mode: "lines",
        name: chain,
        line: { width: 1.5, color: CHAIN_COLORS[i % CHAIN_COLORS.length] }
      };
    });
    const layout = {
      ...getLayout(options),
      title: { text: `Cumulative Mean: ${currentVar}` },
      xaxis: { ...getLayout(options).xaxis, title: "Iteration" },
      yaxis: { ...getLayout(options).yaxis, title: `Mean (${currentVar})` }
    };
    Plotly.react(container, traces, layout, getConfig());
  }
  render();
  return {
    destroy: () => Plotly.purge(container),
    update: (v) => {
      if (v) currentVar = v;
      render();
    }
  };
}

// src/plots/pairs.ts
function pairPlot(container, data, variables, options) {
  const Plotly = getPlotly();
  const vars = variables ?? data.variableNames.slice(0, 4);
  function render() {
    const dimensions = vars.map((v) => ({
      label: v,
      values: Array.from(data.getAllDraws(v))
    }));
    const traces = data.chainNames.map((chain, i) => {
      const dims = vars.map((v) => ({
        label: v,
        values: Array.from(data.getDraws(v, chain))
      }));
      return {
        type: "splom",
        dimensions: dims,
        name: chain,
        marker: {
          size: 2,
          opacity: 0.3,
          color: CHAIN_COLORS[i % CHAIN_COLORS.length]
        },
        showupperhalf: false,
        diagonal: { visible: true }
      };
    });
    const axisCfg = (theme) => {
      const isDark = theme !== "light";
      return { gridcolor: isDark ? "#252836" : "#e5e7eb", linecolor: isDark ? "#333" : "#d1d5db" };
    };
    const axisOverrides = {};
    for (let i = 1; i <= vars.length; i++) {
      axisOverrides[`xaxis${i > 1 ? i : ""}`] = axisCfg(options?.theme);
      axisOverrides[`yaxis${i > 1 ? i : ""}`] = axisCfg(options?.theme);
    }
    const layout = {
      ...getLayout(options),
      ...axisOverrides,
      title: { text: "Pair Plot" },
      height: Math.max(400, vars.length * 180 + 60),
      dragmode: "select"
    };
    Plotly.react(container, traces, layout, getConfig());
  }
  render();
  return {
    destroy: () => Plotly.purge(container),
    update: () => render()
  };
}

// src/plots/summary-table.ts
function summaryTable(container, data, options) {
  const isDark = options?.theme !== "light";
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "overflow-x:auto;border-radius:8px;";
  container.appendChild(wrapper);
  function render() {
    const summaries = data.summary();
    const headerBg = isDark ? "#252836" : "#e5e7eb";
    const borderColor = isDark ? "#333" : "#d1d5db";
    const textColor = isDark ? "#e0e0e0" : "#1a1a1a";
    const mutedColor = isDark ? "#888" : "#666";
    const columns = [
      "Variable",
      "Mean",
      "Std",
      "MCSE",
      "5%",
      "25%",
      "50%",
      "75%",
      "95%",
      "ESS",
      "Bulk ESS",
      "Tail ESS",
      "R\u0302",
      "Split R\u0302",
      "Geweke z",
      "HDI 90%"
    ];
    let html = `<table style="width:100%;border-collapse:collapse;font-size:13px;color:${textColor};font-family:system-ui,sans-serif">`;
    html += `<thead><tr style="background:${headerBg}">`;
    for (const c of columns) {
      html += `<th style="padding:10px 14px;text-align:left;font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:${mutedColor};white-space:nowrap">${c}</th>`;
    }
    html += "</tr></thead><tbody>";
    for (const s of summaries) {
      const rhatColor = s.rhat === void 0 ? mutedColor : s.rhat < 1.05 ? "#22c55e" : s.rhat < 1.1 ? "#eab308" : "#ef4444";
      const splitRhatColor = s.splitRhat === void 0 ? mutedColor : s.splitRhat < 1.05 ? "#22c55e" : s.splitRhat < 1.1 ? "#eab308" : "#ef4444";
      const essColor = s.ess > 400 ? "#22c55e" : s.ess > 100 ? "#eab308" : "#ef4444";
      const bulkEssColor = s.bulkEss > 400 ? "#22c55e" : s.bulkEss > 100 ? "#eab308" : "#ef4444";
      const tailEssColor = s.tailEss > 400 ? "#22c55e" : s.tailEss > 100 ? "#eab308" : "#ef4444";
      const gewekeColor = isNaN(s.geweke.z) ? mutedColor : Math.abs(s.geweke.z) < 1.96 ? "#22c55e" : Math.abs(s.geweke.z) < 2.58 ? "#eab308" : "#ef4444";
      html += `<tr style="border-bottom:1px solid ${borderColor}">`;
      html += `<td style="padding:8px 14px;font-weight:600">${s.variable}</td>`;
      html += td(s.mean, textColor);
      html += td(s.stdev, textColor);
      html += td(s.mcse, textColor);
      html += td(s.quantiles.q5, textColor);
      html += td(s.quantiles.q25, textColor);
      html += td(s.quantiles.q50, textColor);
      html += td(s.quantiles.q75, textColor);
      html += td(s.quantiles.q95, textColor);
      html += `<td style="padding:8px 14px;color:${essColor};font-variant-numeric:tabular-nums">${Math.round(s.ess)}</td>`;
      html += `<td style="padding:8px 14px;color:${bulkEssColor};font-variant-numeric:tabular-nums">${Math.round(s.bulkEss)}</td>`;
      html += `<td style="padding:8px 14px;color:${tailEssColor};font-variant-numeric:tabular-nums">${Math.round(s.tailEss)}</td>`;
      html += `<td style="padding:8px 14px;color:${rhatColor};font-variant-numeric:tabular-nums">${s.rhat !== void 0 ? s.rhat.toFixed(3) : "\u2014"}</td>`;
      html += `<td style="padding:8px 14px;color:${splitRhatColor};font-variant-numeric:tabular-nums">${s.splitRhat !== void 0 ? s.splitRhat.toFixed(3) : "\u2014"}</td>`;
      html += `<td style="padding:8px 14px;color:${gewekeColor};font-variant-numeric:tabular-nums">${!isNaN(s.geweke.z) ? s.geweke.z.toFixed(3) : "\u2014"}</td>`;
      html += `<td style="padding:8px 14px;font-variant-numeric:tabular-nums;white-space:nowrap">[${s.hdi90[0].toFixed(3)}, ${s.hdi90[1].toFixed(3)}]</td>`;
      html += "</tr>";
    }
    html += "</tbody></table>";
    wrapper.innerHTML = html;
  }
  render();
  return { destroy: () => wrapper.remove(), update: render };
}
function td(v, color) {
  return `<td style="padding:8px 14px;font-variant-numeric:tabular-nums;color:${color}">${isNaN(v) ? "\u2014" : v.toFixed(4)}</td>`;
}

// src/plots/rank.ts
function rankPlot(container, data, variable, options) {
  const Plotly = getPlotly();
  let currentVar = variable;
  function render() {
    const allDraws = [];
    const chainDraws = [];
    for (const chain of data.chainNames) {
      const d = data.getDraws(currentVar, chain);
      chainDraws.push(d);
      for (let i = 0; i < d.length; i++) allDraws.push(d[i]);
    }
    const sorted = [...allDraws].sort((a, b) => a - b);
    const rankMap = /* @__PURE__ */ new Map();
    for (let i = 0; i < sorted.length; i++) {
      if (!rankMap.has(sorted[i])) rankMap.set(sorted[i], i + 1);
    }
    const nBins = 20;
    const totalN = allDraws.length;
    const traces = data.chainNames.map((chain, ci) => {
      const draws = chainDraws[ci];
      const ranks = [];
      for (let i = 0; i < draws.length; i++) {
        ranks.push(rankMap.get(draws[i]) / totalN);
      }
      return {
        x: ranks,
        type: "histogram",
        name: chain,
        nbinsx: nBins,
        opacity: 0.6,
        marker: { color: CHAIN_COLORS[ci % CHAIN_COLORS.length] }
      };
    });
    const layout = {
      ...getLayout(options),
      title: { text: `Rank Histogram: ${currentVar}` },
      barmode: "overlay",
      xaxis: { ...getLayout(options).xaxis, title: "Normalized Rank" },
      yaxis: { ...getLayout(options).yaxis, title: "Count" },
      shapes: [{
        type: "line",
        x0: 0,
        x1: 1,
        y0: totalN / data.chainNames.length / nBins,
        y1: totalN / data.chainNames.length / nBins,
        line: { color: "#888", width: 1.5, dash: "dash" }
      }]
    };
    Plotly.react(container, traces, layout, getConfig());
  }
  render();
  return {
    destroy: () => Plotly.purge(container),
    update: (v) => {
      if (v) currentVar = v;
      render();
    }
  };
}

// src/plots/running-rhat.ts
function runningRhatPlot(container, data, variable, options) {
  const Plotly = getPlotly();
  let currentVar = variable;
  function render() {
    const chains = data.chainNames.map((c) => data.getDraws(currentVar, c));
    const minLen = Math.min(...chains.map((c) => c.length));
    const step = Math.max(1, Math.floor(minLen / 200));
    const startAt = Math.max(20, step);
    const iterations = [];
    const rhatValues = [];
    for (let n = startAt; n <= minLen; n += step) {
      const sliced = chains.map((c) => c.slice(0, n));
      const means = sliced.map((c) => computeMean(c));
      const sds = sliced.map((c) => computeStdev(c));
      const counts = sliced.map((c) => c.length);
      const rhat = computeRhatFromParts(means, sds, counts);
      if (rhat !== void 0 && !isNaN(rhat)) {
        iterations.push(n);
        rhatValues.push(rhat);
      }
    }
    const traces = [{
      x: iterations,
      y: rhatValues,
      type: "scatter",
      mode: "lines",
      name: "R\u0302",
      line: { width: 2, color: CHAIN_COLORS[0] }
    }];
    const layout = {
      ...getLayout(options),
      title: { text: `Running R\u0302: ${currentVar}` },
      xaxis: { ...getLayout(options).xaxis, title: "Iteration" },
      yaxis: { ...getLayout(options).yaxis, title: "R\u0302" },
      shapes: [{
        type: "line",
        x0: iterations[0] ?? 0,
        x1: iterations[iterations.length - 1] ?? 1,
        y0: 1,
        y1: 1,
        line: { color: "#22c55e", width: 1, dash: "dash" }
      }, {
        type: "line",
        x0: iterations[0] ?? 0,
        x1: iterations[iterations.length - 1] ?? 1,
        y0: 1.05,
        y1: 1.05,
        line: { color: "#ef4444", width: 1, dash: "dot" }
      }]
    };
    Plotly.react(container, traces, layout, getConfig());
  }
  render();
  return {
    destroy: () => Plotly.purge(container),
    update: (v) => {
      if (v) currentVar = v;
      render();
    }
  };
}
function computeRhatFromParts(chainMeans, chainStdevs, chainCounts) {
  if (chainMeans.length <= 1) return void 0;
  for (const c of chainCounts) {
    if (c <= 1) return void 0;
  }
  const m = chainMeans.length;
  const n = chainCounts.reduce((a, b) => a + b, 0) / m;
  const grandMean = chainMeans.reduce((a, b) => a + b, 0) / m;
  let B = 0;
  for (let i = 0; i < m; i++) B += (chainMeans[i] - grandMean) ** 2;
  B = n / (m - 1) * B;
  let W = 0;
  for (let i = 0; i < m; i++) {
    W += chainStdevs[i] * chainStdevs[i] * chainCounts[i] / (chainCounts[i] - 1);
  }
  W /= m;
  if (W === 0) return void 0;
  return Math.sqrt((n - 1) / n * W / W + B / (n * W));
}

// src/plots/density.ts
function densityPlot(container, data, variable, options) {
  const Plotly = getPlotly();
  let currentVar = variable;
  function kde(values, nPoints = 200) {
    const n = values.length;
    if (n === 0) return { x: [], y: [] };
    let min = values[0], max = values[0];
    let mean2 = 0;
    for (let i = 0; i < n; i++) {
      if (values[i] < min) min = values[i];
      if (values[i] > max) max = values[i];
      mean2 += values[i];
    }
    mean2 /= n;
    let variance = 0;
    for (let i = 0; i < n; i++) variance += (values[i] - mean2) ** 2;
    variance /= n;
    const sd = Math.sqrt(variance);
    const sortedCopy2 = new Float64Array(values);
    sortedCopy2.sort();
    const q25 = sortedCopy2[Math.floor(n * 0.25)];
    const q75 = sortedCopy2[Math.floor(n * 0.75)];
    const iqr = q75 - q25;
    const h = 0.9 * Math.min(sd, iqr / 1.34) * Math.pow(n, -0.2);
    if (h <= 0 || isNaN(h)) return { x: [], y: [] };
    const pad = 3 * h;
    const xMin = min - pad;
    const xMax = max + pad;
    const step = (xMax - xMin) / (nPoints - 1);
    const x = [];
    const y = [];
    for (let i = 0; i < nPoints; i++) {
      const xi = xMin + i * step;
      let density = 0;
      for (let j = 0; j < n; j++) {
        const u = (xi - values[j]) / h;
        density += Math.exp(-0.5 * u * u);
      }
      density /= n * h * Math.sqrt(2 * Math.PI);
      x.push(xi);
      y.push(density);
    }
    return { x, y };
  }
  function render() {
    const traces = data.chainNames.map((chain, i) => {
      const draws = data.getDraws(currentVar, chain);
      const { x, y } = kde(draws);
      return {
        x,
        y,
        type: "scatter",
        mode: "lines",
        name: chain,
        fill: "tozeroy",
        fillcolor: CHAIN_COLORS[i % CHAIN_COLORS.length].replace(")", ",0.12)").replace("rgb", "rgba"),
        line: { width: 2, color: CHAIN_COLORS[i % CHAIN_COLORS.length] }
      };
    });
    const layout = {
      ...getLayout(options),
      title: { text: `Density: ${currentVar}` },
      xaxis: { ...getLayout(options).xaxis, title: currentVar },
      yaxis: { ...getLayout(options).yaxis, title: "Density" }
    };
    Plotly.react(container, traces, layout, getConfig());
  }
  render();
  return {
    destroy: () => Plotly.purge(container),
    update: (v) => {
      if (v) currentVar = v;
      render();
    }
  };
}

// src/plots/violin.ts
function violinPlot(container, data, options) {
  const Plotly = getPlotly();
  function render() {
    const traces = data.variableNames.map((varName, vi) => {
      const allDraws = Array.from(data.getAllDraws(varName));
      return {
        type: "violin",
        y: allDraws,
        name: varName,
        box: { visible: true },
        meanline: { visible: true },
        line: { color: CHAIN_COLORS[vi % CHAIN_COLORS.length] },
        fillcolor: CHAIN_COLORS[vi % CHAIN_COLORS.length].replace(")", ",0.3)").replace("rgb", "rgba"),
        opacity: 0.85,
        spanmode: "soft"
      };
    });
    const layout = {
      ...getLayout(options),
      title: { text: "Violin Plot" },
      yaxis: { ...getLayout(options).yaxis, title: "Value" },
      showlegend: false,
      height: Math.max(350, data.variableNames.length * 60 + 150)
    };
    Plotly.react(container, traces, layout, getConfig());
  }
  render();
  return {
    destroy: () => Plotly.purge(container),
    update: () => render()
  };
}

// src/plots/energy.ts
function energyPlot(container, data, options) {
  const Plotly = getPlotly();
  function render() {
    const hasEnergy = data.variableNames.some(
      (v) => v === "energy__" || v === "energy" || v === "lp__" || v === "log_density"
    );
    const energyVar = ["energy__", "energy", "lp__", "log_density"].find((v) => data.variableNames.includes(v));
    if (!energyVar) {
      container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;min-height:200px;color:#5c6278;font-size:0.85rem;font-family:Inter,system-ui,sans-serif">
        <div style="text-align:center">
          <div style="font-size:1.5rem;margin-bottom:8px;opacity:0.4">&#9889;</div>
          <div>No energy/log-density variable found</div>
          <div style="font-size:0.75rem;margin-top:4px;opacity:0.6">Requires: energy__, energy, lp__, or log_density</div>
        </div>
      </div>`;
      return;
    }
    const traces = [];
    data.chainNames.forEach((chain, i) => {
      const draws = Array.from(data.getDraws(energyVar, chain));
      traces.push({
        x: draws,
        type: "histogram",
        name: `${chain} (marginal)`,
        opacity: 0.5,
        marker: { color: CHAIN_COLORS[i % CHAIN_COLORS.length] },
        histnorm: "probability density"
      });
      if (draws.length > 1) {
        const transitions = [];
        for (let j = 1; j < draws.length; j++) {
          transitions.push(draws[j] - draws[j - 1]);
        }
        traces.push({
          x: transitions,
          type: "histogram",
          name: `${chain} (transition)`,
          opacity: 0.3,
          marker: {
            color: CHAIN_COLORS[i % CHAIN_COLORS.length],
            line: { color: CHAIN_COLORS[i % CHAIN_COLORS.length], width: 1 }
          },
          histnorm: "probability density"
        });
      }
    });
    const layout = {
      ...getLayout(options),
      title: { text: `Energy: ${energyVar}` },
      barmode: "overlay",
      xaxis: { ...getLayout(options).xaxis, title: energyVar },
      yaxis: { ...getLayout(options).yaxis, title: "Density" }
    };
    Plotly.react(container, traces, layout, getConfig());
  }
  render();
  return {
    destroy: () => Plotly.purge(container),
    update: () => render()
  };
}

// src/plots/ecdf.ts
function ecdfPlot(container, data, variable, options) {
  const Plotly = getPlotly();
  let currentVar = variable;
  function computeECDF(draws) {
    const sorted = Array.from(draws).sort((a, b) => a - b);
    const n = sorted.length;
    return {
      x: sorted,
      y: sorted.map((_, i) => (i + 1) / n)
    };
  }
  function render() {
    const traces = data.chainNames.map((chain, i) => {
      const { x, y } = computeECDF(data.getDraws(currentVar, chain));
      return {
        x,
        y,
        type: "scatter",
        mode: "lines",
        name: chain,
        line: { width: 2, shape: "hv", color: CHAIN_COLORS[i % CHAIN_COLORS.length] }
      };
    });
    const layout = {
      ...getLayout(options),
      title: { text: `Empirical CDF: ${currentVar}` },
      xaxis: { ...getLayout(options).xaxis, title: currentVar },
      yaxis: { ...getLayout(options).yaxis, title: "Cumulative Probability", range: [0, 1] }
    };
    Plotly.react(container, traces, layout, getConfig());
  }
  render();
  return {
    destroy: () => Plotly.purge(container),
    update: (v) => {
      if (v) currentVar = v;
      render();
    }
  };
}

// src/plots/chain-intervals.ts
function chainIntervalsPlot(container, data, variable, options) {
  const Plotly = getPlotly();
  let currentVar = variable;
  function render() {
    const chainSummaries = data.chainNames.map((chain, index) => {
      const draws = data.getDraws(currentVar, chain);
      const mean2 = computeMean(draws);
      const hdi90 = computeHDI(draws, 0.9);
      return {
        chain,
        mean: mean2,
        hdi90,
        color: CHAIN_COLORS[index % CHAIN_COLORS.length]
      };
    });
    const overallStats = data.variableStats(currentVar);
    const minX = Math.min(...chainSummaries.map((s) => s.hdi90[0]), overallStats.hdi90[0]);
    const maxX = Math.max(...chainSummaries.map((s) => s.hdi90[1]), overallStats.hdi90[1]);
    const traces = [{
      x: chainSummaries.map((s) => s.mean),
      y: chainSummaries.map((s) => s.chain),
      type: "scatter",
      mode: "markers",
      name: "Chain mean",
      marker: {
        size: 11,
        color: chainSummaries.map((s) => s.color),
        line: { width: 1.5, color: "#ffffff" }
      },
      error_x: {
        type: "data",
        symmetric: false,
        array: chainSummaries.map((s) => s.hdi90[1] - s.mean),
        arrayminus: chainSummaries.map((s) => s.mean - s.hdi90[0]),
        thickness: 2,
        width: 0,
        color: "#94a3b8"
      },
      customdata: chainSummaries.map((s) => [
        s.hdi90[0].toFixed(3),
        s.hdi90[1].toFixed(3)
      ]),
      hovertemplate: "%{y}<br>Mean=%{x:.3f}<br>90% HDI=[%{customdata[0]}, %{customdata[1]}]<extra></extra>"
    }];
    const layout = {
      ...getLayout(options),
      title: { text: `Chain Intervals: ${currentVar}` },
      xaxis: {
        ...getLayout(options).xaxis,
        title: currentVar,
        range: [minX, maxX]
      },
      yaxis: { ...getLayout(options).yaxis, automargin: true },
      shapes: [
        {
          type: "rect",
          x0: overallStats.hdi90[0],
          x1: overallStats.hdi90[1],
          yref: "paper",
          y0: 0,
          y1: 1,
          fillcolor: options?.theme === "light" ? "rgba(14, 165, 233, 0.08)" : "rgba(56, 189, 248, 0.10)",
          line: { width: 0 },
          layer: "below"
        },
        {
          type: "line",
          x0: overallStats.mean,
          x1: overallStats.mean,
          yref: "paper",
          y0: 0,
          y1: 1,
          line: { color: "#f59e0b", width: 2, dash: "dash" }
        }
      ],
      annotations: [{
        x: overallStats.mean,
        y: 1.02,
        yref: "paper",
        text: `Overall mean ${overallStats.mean.toFixed(3)}`,
        showarrow: false,
        font: { size: 11, color: options?.theme === "light" ? "#92400e" : "#fbbf24" }
      }]
    };
    Plotly.react(container, traces, layout, getConfig());
  }
  render();
  return {
    destroy: () => Plotly.purge(container),
    update: (v) => {
      if (v) currentVar = v;
      render();
    }
  };
}

// src/plots/diagnostics-heatmap.ts
function diagnosticsHeatmapPlot(container, data, options) {
  const Plotly = getPlotly();
  function render() {
    const summaries = data.summary();
    const metrics = [
      {
        label: "R-hat",
        raw: (summary) => summary.rhat ?? NaN,
        text: (summary) => formatValue(summary.rhat),
        score: (summary) => scoreUpper(summary.rhat, 1.01, 1.1)
      },
      {
        label: "Split R-hat",
        raw: (summary) => summary.splitRhat ?? NaN,
        text: (summary) => formatValue(summary.splitRhat),
        score: (summary) => scoreUpper(summary.splitRhat, 1.01, 1.1)
      },
      {
        label: "ESS / draw",
        raw: (summary) => summary.essPerDraw,
        text: (summary) => formatValue(summary.essPerDraw),
        score: (summary) => scoreLower(summary.essPerDraw, 0.25, 0.05)
      },
      {
        label: "Bulk ESS",
        raw: (summary) => summary.bulkEss,
        text: (summary) => integerValue(summary.bulkEss),
        score: (summary) => scoreLower(summary.bulkEss, 400, 100)
      },
      {
        label: "Tail ESS",
        raw: (summary) => summary.tailEss,
        text: (summary) => integerValue(summary.tailEss),
        score: (summary) => scoreLower(summary.tailEss, 400, 100)
      },
      {
        label: "MCSE / sd",
        raw: (summary) => summary.stdev === 0 ? NaN : summary.mcse / summary.stdev,
        text: (summary) => summary.stdev === 0 ? "0.000" : formatValue(summary.mcse / summary.stdev),
        score: (summary) => scoreUpper(summary.stdev === 0 ? 0 : summary.mcse / summary.stdev, 0.02, 0.1)
      },
      {
        label: "|Geweke z|",
        raw: (summary) => Math.abs(summary.geweke.z),
        text: (summary) => formatValue(Math.abs(summary.geweke.z)),
        score: (summary) => scoreUpper(Math.abs(summary.geweke.z), 1.96, 3)
      }
    ];
    const x = metrics.map((metric) => metric.label);
    const y = summaries.map((summary) => summary.variable);
    const z = summaries.map((summary) => metrics.map((metric) => metric.score(summary)));
    const text = summaries.map((summary) => metrics.map((metric) => metric.text(summary)));
    const customdata = summaries.map((summary) => metrics.map((metric) => metric.raw(summary)));
    const layout = {
      ...getLayout(options),
      title: { text: "Diagnostics Heatmap" },
      xaxis: { ...getLayout(options).xaxis, side: "top" },
      yaxis: { ...getLayout(options).yaxis, automargin: true, autorange: "reversed" },
      margin: { t: 70, r: 40, b: 40, l: 100 }
    };
    const trace = {
      type: "heatmap",
      x,
      y,
      z,
      text,
      customdata,
      texttemplate: "%{text}",
      textfont: { size: 11 },
      colorscale: [
        [0, "#10b981"],
        [0.5, "#f59e0b"],
        [1, "#ef4444"]
      ],
      zmin: 0,
      zmax: 1,
      colorbar: { title: "Risk", thickness: 10 },
      hovertemplate: "%{y}<br>%{x}: %{text}<br>Risk score=%{z:.2f}<extra></extra>"
    };
    Plotly.react(container, [trace], layout, getConfig());
  }
  render();
  return {
    destroy: () => Plotly.purge(container),
    update: () => render()
  };
}
function clamp(value) {
  if (!isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}
function scoreUpper(value, good, bad) {
  if (value === void 0 || !isFinite(value)) return 0.5;
  return clamp((value - good) / (bad - good));
}
function scoreLower(value, good, bad) {
  if (value === void 0 || !isFinite(value)) return 0.5;
  return clamp((good - value) / (good - bad));
}
function formatValue(value) {
  if (value === void 0 || !isFinite(value)) return "\u2014";
  return value.toFixed(3);
}
function integerValue(value) {
  if (value === void 0 || !isFinite(value)) return "\u2014";
  return Math.round(value).toString();
}

// src/index.ts
function fromTuringCSV(text) {
  return new MCMCData(parseTuringCSV(text));
}
function fromStanCSV(text) {
  return new MCMCData(parseStanCSV(text));
}
function fromStanCSVFiles(files) {
  return new MCMCData(parseStanCSVFiles(files));
}
function fromAutoDetect(text) {
  const format = detectFormat(text);
  switch (format) {
    case "turing-csv":
      return fromTuringCSV(text);
    case "stan-csv":
      return fromStanCSV(text);
    case "mcmcchains-json":
      return fromMCMCChainsJSON(text);
    default:
      throw new Error(`Unable to detect format. Use fromTuringCSV(), fromStanCSV(), or fromMCMCChainsJSON() directly.`);
  }
}
function fromMCMCChainsJSON(text) {
  return new MCMCData(parseMCMCChainsJSON(text));
}
function fromChainArrays(data) {
  const chains = /* @__PURE__ */ new Map();
  for (const [chainName, vars] of Object.entries(data)) {
    const draws = /* @__PURE__ */ new Map();
    let maxLen = 0;
    for (const [varName, values] of Object.entries(vars)) {
      const arr = new Float64Array(values);
      draws.set(varName, arr);
      maxLen = Math.max(maxLen, arr.length);
    }
    chains.set(chainName, { name: chainName, draws, drawCount: maxLen });
  }
  return new MCMCData(chains);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MCMCData,
  computeBulkESS,
  computeESS,
  computeExcessKurtosis,
  computeGeweke,
  computeHDI,
  computeMCSE,
  computeMean,
  computeQuantiles,
  computeRhat,
  computeSkewness,
  computeSplitRhat,
  computeStdev,
  computeTailESS,
  detectFormat,
  fromAutoDetect,
  fromChainArrays,
  fromMCMCChainsJSON,
  fromStanCSV,
  fromStanCSVFiles,
  fromTuringCSV,
  plots
});
//# sourceMappingURL=index.cjs.map