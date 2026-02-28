var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

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
    return { mean: mean2, stdev: stdev2, count: draws.length, ess, autocorrelation };
  }
  variableStats(variable) {
    const chainMeans = [];
    const chainStdevs = [];
    const chainCounts = [];
    let totalESS = 0;
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
      totalESS += ess;
    }
    const allDraws = this.getAllDraws(variable);
    const quantiles = computeQuantiles(allDraws);
    const hdi90 = computeHDI(allDraws, 0.9);
    const rhat = computeRhat(chainMeans, chainStdevs, chainCounts);
    return {
      mean: computeMean(allDraws),
      stdev: computeStdev(allDraws),
      count: allDraws.length,
      ess: totalESS,
      rhat,
      quantiles,
      hdi90
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
  cumulativeMeanPlot: () => cumulativeMeanPlot,
  forestPlot: () => forestPlot,
  histogramPlot: () => histogramPlot,
  pairPlot: () => pairPlot,
  summaryTable: () => summaryTable,
  tracePlot: () => tracePlot
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
    const bg = isDark ? "#1a1d27" : "#f8f9fa";
    const headerBg = isDark ? "#252836" : "#e5e7eb";
    const borderColor = isDark ? "#333" : "#d1d5db";
    const textColor = isDark ? "#e0e0e0" : "#1a1a1a";
    const mutedColor = isDark ? "#888" : "#666";
    let html = `<table style="width:100%;border-collapse:collapse;font-size:13px;color:${textColor};font-family:system-ui,sans-serif">`;
    html += `<thead><tr style="background:${headerBg}">`;
    for (const c of ["Variable", "Mean", "Std", "5%", "25%", "50%", "75%", "95%", "ESS", "R\u0302", "HDI 90%"]) {
      html += `<th style="padding:10px 14px;text-align:left;font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:${mutedColor};white-space:nowrap">${c}</th>`;
    }
    html += "</tr></thead><tbody>";
    for (const s of summaries) {
      const rhatColor = s.rhat === void 0 ? mutedColor : s.rhat < 1.05 ? "#22c55e" : s.rhat < 1.1 ? "#eab308" : "#ef4444";
      const essColor = s.ess > 400 ? "#22c55e" : s.ess > 100 ? "#eab308" : "#ef4444";
      html += `<tr style="border-bottom:1px solid ${borderColor}">`;
      html += `<td style="padding:8px 14px;font-weight:600">${s.variable}</td>`;
      html += td(s.mean, textColor);
      html += td(s.stdev, textColor);
      html += td(s.quantiles.q5, textColor);
      html += td(s.quantiles.q25, textColor);
      html += td(s.quantiles.q50, textColor);
      html += td(s.quantiles.q75, textColor);
      html += td(s.quantiles.q95, textColor);
      html += `<td style="padding:8px 14px;color:${essColor};font-variant-numeric:tabular-nums">${Math.round(s.ess)}</td>`;
      html += `<td style="padding:8px 14px;color:${rhatColor};font-variant-numeric:tabular-nums">${s.rhat !== void 0 ? s.rhat.toFixed(3) : "\u2014"}</td>`;
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
export {
  MCMCData,
  computeESS,
  computeHDI,
  computeMean,
  computeQuantiles,
  computeRhat,
  computeStdev,
  detectFormat,
  fromAutoDetect,
  fromChainArrays,
  fromMCMCChainsJSON,
  fromStanCSV,
  fromStanCSVFiles,
  fromTuringCSV,
  plots_exports as plots
};
//# sourceMappingURL=index.js.map