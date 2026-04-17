var __defProp = Object.defineProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

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
function resolveChainColors(opts) {
  if (opts?.theme && typeof opts.theme === "object" && opts.theme.chainColors) {
    return opts.theme.chainColors;
  }
  return CHAIN_COLORS;
}
function darkLayout(opts) {
  return {
    paper_bgcolor: "#181b26",
    plot_bgcolor: "#13151e",
    font: { color: "#eaedf3", family: FONT, size: 12 },
    xaxis: {
      gridcolor: "#262a3a",
      zerolinecolor: "#3a3f52",
      linecolor: "#2f3447"
    },
    yaxis: {
      gridcolor: "#262a3a",
      zerolinecolor: "#3a3f52",
      linecolor: "#2f3447"
    },
    margin: { t: 40, r: 20, b: 50, l: 60 },
    height: opts?.height,
    width: opts?.width,
    hoverlabel: {
      bgcolor: "#1e2130",
      bordercolor: "#3a3f52",
      font: { color: "#eaedf3" }
    }
  };
}
function lightLayout(opts) {
  return {
    paper_bgcolor: "#ffffff",
    plot_bgcolor: "#f8f9fa",
    font: { color: "#1a1a1a", family: FONT, size: 12 },
    xaxis: {
      gridcolor: "#e5e7eb",
      zerolinecolor: "#d1d5db",
      linecolor: "#d1d5db"
    },
    yaxis: {
      gridcolor: "#e5e7eb",
      zerolinecolor: "#d1d5db",
      linecolor: "#d1d5db"
    },
    margin: { t: 40, r: 20, b: 50, l: 60 },
    height: opts?.height,
    width: opts?.width
  };
}
function customLayout(ct, opts) {
  const base = darkLayout(opts);
  const grid = ct.gridcolor ?? "#262a3a";
  const zeroline = ct.zerolinecolor ?? grid;
  return {
    ...base,
    ...ct.paper_bgcolor !== void 0 && { paper_bgcolor: ct.paper_bgcolor },
    ...ct.plot_bgcolor !== void 0 && { plot_bgcolor: ct.plot_bgcolor },
    ...ct.font !== void 0 && {
      font: { ...base.font, ...ct.font }
    },
    ...ct.gridcolor !== void 0 && {
      xaxis: {
        ...base.xaxis,
        gridcolor: grid,
        zerolinecolor: zeroline
      },
      yaxis: {
        ...base.yaxis,
        gridcolor: grid,
        zerolinecolor: zeroline
      }
    },
    ...ct.hoverlabel !== void 0 && {
      hoverlabel: { ...base.hoverlabel, ...ct.hoverlabel }
    }
  };
}
function getLayout(opts) {
  if (!opts?.theme || opts.theme === "dark") return darkLayout(opts);
  if (opts.theme === "light") return lightLayout(opts);
  return customLayout(opts.theme, opts);
}
function getConfig() {
  return {
    responsive: true,
    displaylogo: false,
    toImageButtonOptions: { format: "png", height: 600, width: 1200, scale: 2 }
  };
}
function getPlotly() {
  const g = typeof globalThis !== "undefined" ? globalThis : void 0;
  if (g?.["Plotly"]) return g["Plotly"];
  try {
    return __require("plotly.js-dist-min");
  } catch {
  }
  throw new Error(
    'Plotly.js is not available.\nBrowser: <script src="https://cdn.plot.ly/plotly-2.35.0.min.js"></script>\nNode.js: npm install plotly.js-dist-min'
  );
}
var BAYES_DARK_THEME = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { color: "#FFFFFF", family: "Inter, system-ui, sans-serif", size: 12 },
  gridcolor: "#7C7C7C",
  zerolinecolor: "#9E9E9E",
  hoverlabel: {
    bgcolor: "#222224",
    bordercolor: "#9E9E9E",
    font: { color: "#FFFFFF" }
  },
  // chainColorForIndex palette from bayes app (distinctipy)
  chainColors: [
    "#1E6759",
    "#2894b2",
    "#ff8000",
    "#0080ff",
    "#80bf80",
    "#470ba7",
    "#c80b32",
    "#fd7ee5",
    "#027d30",
    "#00ffff",
    "#00ff80",
    "#9c5a86",
    "#808000",
    "#8ed7fa",
    "#80ff00",
    "#6e52ff"
  ]
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
var computeQuantile = quantile;
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

// src/stats/math.ts
function _norminvcdf(p) {
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
  if (p < pLow) {
    const q2 = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q2 + c[1]) * q2 + c[2]) * q2 + c[3]) * q2 + c[4]) * q2 + c[5]) / ((((d[0] * q2 + d[1]) * q2 + d[2]) * q2 + d[3]) * q2 + 1);
  }
  if (p <= 1 - pLow) {
    const q2 = p - 0.5, r = q2 * q2;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q2 / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}
function _betainvcdf(p, a, b) {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let x = _betaInitGuess(p, a, b);
  for (let iter = 0; iter < 64; iter++) {
    const fx = _betainc(x, a, b) - p;
    const dfx = _betaPDF(x, a, b);
    if (dfx === 0 || !isFinite(dfx)) break;
    const d2fx = dfx * ((a - 1) / x - (b - 1) / (1 - x));
    const step = fx / (dfx * (1 - fx * d2fx / (2 * dfx * dfx)));
    x = Math.max(1e-15, Math.min(1 - 1e-15, x - step));
    if (Math.abs(step) < 1e-12 * x) break;
  }
  return x;
}
function _betaInitGuess(p, a, b) {
  const mean = a / (a + b);
  const v = a * b / ((a + b) ** 2 * (a + b + 1));
  return Math.max(
    1e-6,
    Math.min(1 - 1e-6, mean + Math.sqrt(v) * _norminvcdf(p))
  );
}
function _betaPDF(x, a, b) {
  if (x <= 0 || x >= 1) return 0;
  return Math.exp(
    (a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - _logBeta(a, b)
  );
}
function _betainc(x, a, b) {
  return x < (a + 1) / (a + b + 2) ? _betaincCF(x, a, b) : 1 - _betaincCF(1 - x, b, a);
}
function _betaincCF(x, a, b) {
  const FPMIN = 1e-300;
  const lbeta = _logBeta(a, b);
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 3e-14) break;
  }
  return Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta) * h / a;
}
function _logBeta(a, b) {
  return _logGamma(a) + _logGamma(b) - _logGamma(a + b);
}
function _logGamma(x) {
  const c = [
    76.18009172947146,
    -86.50532032941678,
    24.01409824083091,
    -1.231739572450155,
    0.001208650973866179,
    -5395239384953e-18
  ];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const ci of c) {
    y += 1;
    ser += ci / y;
  }
  return -tmp + Math.log(2.5066282746310007 * ser / x);
}
function _nextPow2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

// src/stats/rhat.ts
function computeRhat(chains, kind = "rank") {
  if (chains.length < 2) return NaN;
  switch (kind) {
    case "basic":
      return _rhatBasic(chains);
    case "bulk":
      return _rhatBasic(_rankNormalize(chains));
    case "tail":
      return _rhatBasic(_rankNormalize(_foldAroundMedian(chains)));
    case "rank": {
      const bulk = _rhatBasic(_rankNormalize(chains));
      const tail = _rhatBasic(_rankNormalize(_foldAroundMedian(chains)));
      if (isNaN(bulk) && isNaN(tail)) return NaN;
      if (isNaN(bulk)) return tail;
      if (isNaN(tail)) return bulk;
      return Math.max(bulk, tail);
    }
  }
}
function _rhatBasic(chains, splitN = 2) {
  const splits = _splitChains(chains, splitN);
  const m = splits.length;
  if (m < 2) return NaN;
  const n = splits[0].length;
  if (n < 3) return NaN;
  const chainMeans = splits.map(_mean);
  const chainVars = splits.map((c, i) => _biasedVariance(c, chainMeans[i]));
  const W = _arrayMean(chainVars);
  if (!isFinite(W) || W === 0) return NaN;
  const grandMean = _arrayMean(chainMeans);
  let bSum = 0;
  for (let i = 0; i < m; i++) bSum += (chainMeans[i] - grandMean) ** 2;
  const B = n / (m - 1) * bSum;
  const varPlus = (n - 1) / n * W + B / n;
  return Math.sqrt(varPlus / W);
}
function _rankNormalize(chains) {
  const total = chains.reduce((a, c) => a + c.length, 0);
  const pooled = new Float64Array(total);
  let offset = 0;
  for (const c of chains) {
    pooled.set(c, offset);
    offset += c.length;
  }
  const order = Array.from({ length: total }, (_, i2) => i2);
  order.sort((a, b) => pooled[a] - pooled[b]);
  const ranks = new Float64Array(total);
  let i = 0;
  while (i < total) {
    let j = i;
    while (j + 1 < total && pooled[order[j]] === pooled[order[j + 1]]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[order[k]] = avg;
    i = j + 1;
  }
  const out = new Float64Array(total);
  for (let idx = 0; idx < total; idx++) {
    out[idx] = _norminvcdf((ranks[idx] - 0.375) / (total + 0.25));
  }
  const result = [];
  offset = 0;
  for (const c of chains) {
    result.push(out.slice(offset, offset + c.length));
    offset += c.length;
  }
  return result;
}
function _foldAroundMedian(chains) {
  const total = chains.reduce((a, c) => a + c.length, 0);
  const pooled = new Float64Array(total);
  let offset = 0;
  for (const c of chains) {
    pooled.set(c, offset);
    offset += c.length;
  }
  const median = computeQuantile(sortedCopy(pooled), 0.5);
  return chains.map((c) => {
    const f = new Float64Array(c.length);
    for (let i = 0; i < c.length; i++) f[i] = Math.abs(c[i] - median);
    return f;
  });
}
function _splitChains(chains, splitN = 2) {
  const result = [];
  for (const chain of chains) {
    const nIter = Math.floor(chain.length / splitN);
    if (nIter < 3) continue;
    const extra = chain.length % splitN;
    let cursor = 0;
    for (let s = 0; s < splitN; s++) {
      result.push(chain.slice(cursor, cursor + nIter));
      cursor += nIter + (s < extra ? 1 : 0);
    }
  }
  return result;
}
function _mean(arr) {
  if (arr.length === 0) return NaN;
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s / arr.length;
}
function _biasedVariance(arr, mean) {
  if (arr.length < 2) return NaN;
  let ss = 0;
  for (let i = 0; i < arr.length; i++) ss += (arr[i] - mean) ** 2;
  return ss / arr.length;
}
function _arrayMean(arr) {
  if (arr.length === 0) return NaN;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

// src/stats/ess.ts
function computeESS(chain) {
  if (chain.length < 4) return { ess: 0, autocorrelation: [] };
  const acor = _autocorrFFT(chain, chain.length);
  if (acor.length === 0) return { ess: 0, autocorrelation: [] };
  const n = _firstNegPairStart(acor);
  let prev = 1, acc = 0, i = 1;
  while (i + 1 < n) {
    prev = Math.min(prev, acor[i] + acor[i + 1]);
    acc += prev;
    i += 2;
  }
  const ess = chain.length / (acor[0] + 2 * acc);
  return { ess, autocorrelation: acor.map((v) => Number.isNaN(v) ? 0 : v) };
}
function computeEssBulk(chains) {
  if (chains.length < 2) return NaN;
  return _essBasic(_rankNormalize(chains));
}
function computeEssTail(chains, tailProb = 0.1) {
  if (chains.length < 2) return NaN;
  const total = chains.reduce((a, c) => a + c.length, 0);
  const pooled = new Float64Array(total);
  let offset = 0;
  for (const c of chains) {
    pooled.set(c, offset);
    offset += c.length;
  }
  const sorted = sortedCopy(pooled);
  const ql = computeQuantile(sorted, tailProb / 2);
  const qu = computeQuantile(sorted, 1 - tailProb / 2);
  const lower = chains.map((c) => {
    const ind = new Float64Array(c.length);
    for (let i = 0; i < c.length; i++) ind[i] = c[i] <= ql ? 1 : 0;
    return ind;
  });
  const upper = chains.map((c) => {
    const ind = new Float64Array(c.length);
    for (let i = 0; i < c.length; i++) ind[i] = c[i] >= qu ? 1 : 0;
    return ind;
  });
  const lo = _essBasic(lower), hi = _essBasic(upper);
  if (isNaN(lo) && isNaN(hi)) return NaN;
  if (isNaN(lo)) return hi;
  if (isNaN(hi)) return lo;
  return Math.min(lo, hi);
}
function computeEssBasic(chains) {
  return _essBasic(chains);
}
function _essBasic(chains, splitN = 2) {
  const splits = _splitChains(chains, splitN);
  const m = splits.length;
  if (m < 2) return NaN;
  const n = splits[0].length;
  if (n < 4) return NaN;
  const ntotal = m * n;
  const chainMeans = splits.map(_mean);
  const chainVars = splits.map((c, i) => _biasedVariance(c, chainMeans[i]));
  const W = _arrayMean(chainVars);
  if (!isFinite(W) || W === 0) return NaN;
  const grandMean = _arrayMean(chainMeans);
  let bSum = 0;
  for (let i = 0; i < m; i++) bSum += (chainMeans[i] - grandMean) ** 2;
  const B = n / (m - 1) * bSum;
  const varPlus = (n - 1) / n * W + B / n;
  if (!isFinite(varPlus) || varPlus === 0) return NaN;
  const invV = 1 / varPlus;
  const centered = splits.map((c, i) => {
    const mu = chainMeans[i], out = new Float64Array(c.length);
    for (let j = 0; j < c.length; j++) out[j] = c[j] - mu;
    return out;
  });
  const autocovs = centered.map(_chainAutocovFFT);
  const meanCov = (k2) => {
    let s = 0;
    for (let i = 0; i < m; i++) s += autocovs[i][k2] ?? 0;
    return s / m;
  };
  const maxlag = Math.min(n - 4, 250);
  let rhoOdd = 1 - invV * (W - meanCov(1));
  let pT = 1 + rhoOdd, sumPT = pT;
  let k = 2;
  while (k < maxlag - 1) {
    const rhoEven = 1 - invV * (W - meanCov(k));
    rhoOdd = 1 - invV * (W - meanCov(k + 1));
    const delta = rhoEven + rhoOdd;
    if (delta <= 0) break;
    pT = Math.min(delta, pT);
    sumPT += pT;
    k += 2;
  }
  const rhoFinal = maxlag > 1 ? 1 - invV * (W - meanCov(k)) : 0;
  const tau = Math.max(0, 2 * sumPT + Math.max(0, rhoFinal) - 1);
  if (!isFinite(tau) || tau <= 0) return NaN;
  return Math.min(1 / tau, Math.log10(ntotal)) * ntotal;
}
function _chainAutocovFFT(centred) {
  const n = centred.length;
  const size = _nextPow2(2 * n - 1);
  const real = new Array(size).fill(0);
  const imag = new Array(size).fill(0);
  for (let i = 0; i < n; i++) real[i] = centred[i];
  transform(real, imag);
  const pwr = real.map((r, i) => r * r + imag[i] * imag[i]);
  const pwrImag = new Array(pwr.length).fill(0);
  inverseTransform(pwr, pwrImag);
  const scale = size * n;
  const out = new Float64Array(n);
  for (let k = 0; k < n; k++) out[k] = pwr[k] / scale;
  return out;
}
function _autocorrFFT(chain, n) {
  const size = _nextPow2(2 * chain.length - 1);
  let mu = 0, variance = 0;
  for (let i = 0; i < chain.length; i++) mu += chain[i];
  mu /= chain.length;
  for (let i = 0; i < chain.length; i++) variance += (chain[i] - mu) ** 2;
  variance /= chain.length;
  if (!isFinite(variance) || variance === 0) return [];
  const real = new Array(size).fill(0);
  const imag = new Array(size).fill(0);
  for (let i = 0; i < chain.length; i++) real[i] = chain[i] - mu;
  transform(real, imag);
  const pwr = real.map((r, i) => r * r + imag[i] * imag[i]);
  const pwrImag = new Array(pwr.length).fill(0);
  inverseTransform(pwr, pwrImag);
  return pwr.slice(0, n).map((x) => x / variance / size / chain.length);
}
function _firstNegPairStart(arr) {
  let i = 0;
  while (i + 1 < arr.length) {
    if (arr[i] + arr[i + 1] < 0) return i;
    i++;
  }
  return arr.length;
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
  const mean = computeMean(arr);
  const sd = computeStdev(arr);
  if (!isFinite(sd) || sd === 0) return 0;
  let thirdMoment = 0;
  for (let i = 0; i < arr.length; i++) {
    thirdMoment += (arr[i] - mean) ** 3;
  }
  return thirdMoment / arr.length / sd ** 3;
}
function computeExcessKurtosis(arr) {
  if (arr.length < 4) return NaN;
  const mean = computeMean(arr);
  const sd = computeStdev(arr);
  if (!isFinite(sd) || sd === 0) return 0;
  let fourthMoment = 0;
  for (let i = 0; i < arr.length; i++) {
    fourthMoment += (arr[i] - mean) ** 4;
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
  const sd = computeStdev(draws), { ess } = computeESS(draws);
  if (!isFinite(sd) || !isFinite(ess) || ess <= 0) return NaN;
  return sd / Math.sqrt(ess);
}
function computeMCSEMultiChain(chains) {
  if (chains.length === 0) return NaN;
  const all = _concat(chains);
  const sd = computeStdev(all);
  if (!isFinite(sd)) return NaN;
  const ess = computeEssBulk(chains);
  if (!isFinite(ess) || ess <= 0) return computeMCSE(all);
  return sd / Math.sqrt(ess);
}
function computeMCSEQuantile(draws, p, essEff) {
  if (!isFinite(essEff) || essEff <= 0 || draws.length < 4) return NaN;
  const S = draws.length;
  const \u03B1 = essEff * p + 1, \u03B2 = essEff * (1 - p) + 1;
  const probU = _betainvcdf(0.8413447460685429, \u03B1, \u03B2);
  const probL = _betainvcdf(0.1586552539314571, \u03B1, \u03B2);
  const sorted = sortedCopy(draws);
  const xl = sorted[Math.max(Math.floor(probL * S), 0)];
  const xu = sorted[Math.min(Math.ceil(probU * S), S - 1)];
  return (xu - xl) / 2;
}
function computeMCSEStd(chains) {
  if (chains.length === 0) return NaN;
  const all = _concat(chains);
  const mu = computeMean(all);
  if (!isFinite(mu)) return NaN;
  const proxyChains = chains.map((c) => {
    const pc = new Float64Array(c.length);
    for (let i = 0; i < c.length; i++) pc[i] = (c[i] - mu) ** 2;
    return pc;
  });
  const proxy = _concat(proxyChains);
  const meanV = computeMean(proxy);
  let meanM4 = 0;
  for (let i = 0; i < proxy.length; i++) meanM4 += proxy[i] ** 2;
  meanM4 /= proxy.length;
  const ess = computeEssBulk(proxyChains);
  if (!isFinite(ess) || ess <= 0 || meanV <= 0) return NaN;
  return Math.sqrt((meanM4 / meanV - meanV) / ess) / 2;
}
function _concat(chains) {
  let len = 0;
  for (const c of chains) len += c.length;
  const out = new Float64Array(len);
  let offset = 0;
  for (const c of chains) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
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
  const mean = computeMean(draws);
  const sd = computeStdev(draws);
  if (isNaN(sd) || sd === 0) return 0;
  const maxLag = Math.min(n - 1, Math.floor(n * 0.2));
  let gamma0 = 0;
  for (let i = 0; i < n; i++) gamma0 += (draws[i] - mean) ** 2;
  gamma0 /= n;
  let s = gamma0;
  for (let lag = 1; lag <= maxLag; lag++) {
    const weight = 1 - lag / (maxLag + 1);
    let gamma = 0;
    for (let i = 0; i < n - lag; i++) {
      gamma += (draws[i] - mean) * (draws[i + lag] - mean);
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
      if (!draws)
        throw new Error(`Variable "${variable}" not found in chain "${chain}"`);
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
    const mean = computeMean(draws);
    const stdev = computeStdev(draws);
    const { ess, autocorrelation } = computeESS(draws);
    return {
      mean,
      stdev,
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
    const rhat = chainDraws.length >= 2 ? computeRhat(chainDraws, "rank") : void 0;
    const mcse = chainDraws.length >= 2 ? computeMCSEMultiChain(chainDraws) : computeMCSE(allDraws);
    const bulkEssRaw = computeEssBulk(chainDraws);
    const tailEssRaw = computeEssTail(chainDraws);
    const bulkEss = isFinite(bulkEssRaw) ? bulkEssRaw : totalESS;
    const tailEss = isFinite(tailEssRaw) ? tailEssRaw : totalESS;
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
    chains.set(chainName, {
      name: chainName,
      draws: typedDraws,
      drawCount: maxLen
    });
  }
  return chains;
}

// src/parsers/mcmcchains-json.ts
function parseMCMCChainsJSON(text) {
  const obj = JSON.parse(text);
  if (!obj.size || !obj.value_flat || !obj.parameters || !obj.chains) {
    throw new Error(
      "Invalid MCMCChains JSON: missing required fields (size, value_flat, parameters, chains)"
    );
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

// src/parsers/arviz-json.ts
function parseArviZJSON(input) {
  const json = typeof input === "string" ? JSON.parse(input) : input;
  const result = /* @__PURE__ */ new Map();
  for (const [groupName, group] of Object.entries(json)) {
    if (!group || typeof group !== "object") continue;
    const dataVars = group.data_vars;
    if (!dataVars || typeof dataVars !== "object") continue;
    const chains = _groupToChains(dataVars);
    if (chains.size > 0) result.set(groupName, chains);
  }
  return result;
}
function parseArviZJSONPosterior(input) {
  const groups = parseArviZJSON(input);
  const posterior = groups.get("posterior");
  if (!posterior) {
    throw new Error(
      `ArviZ JSON has no "posterior" group. Available: ${[...groups.keys()].join(", ")}`
    );
  }
  return posterior;
}
function _groupToChains(dataVars) {
  const chainMap = /* @__PURE__ */ new Map();
  for (const [varName, variable] of Object.entries(dataVars)) {
    if (!variable?.dims || !variable.data) continue;
    const chainDim = variable.dims.indexOf("chain");
    const drawDim = variable.dims.indexOf("draw");
    if (chainDim === -1 || drawDim === -1) continue;
    for (const { chainIdx, leafName, draws } of _flattenVariable(
      varName,
      variable.data,
      variable.dims,
      chainDim,
      drawDim
    )) {
      let vars = chainMap.get(chainIdx);
      if (!vars) {
        vars = /* @__PURE__ */ new Map();
        chainMap.set(chainIdx, vars);
      }
      vars.set(leafName, draws);
    }
  }
  const chains = /* @__PURE__ */ new Map();
  for (const [chainIdx, vars] of chainMap) {
    const name = `chain_${chainIdx}`;
    const draws = /* @__PURE__ */ new Map();
    let maxLen = 0;
    for (const [vn, values] of vars) {
      const arr = new Float64Array(values);
      draws.set(vn, arr);
      maxLen = Math.max(maxLen, arr.length);
    }
    chains.set(name, { name, draws, drawCount: maxLen });
  }
  return chains;
}
function _flattenVariable(varName, data, dims, chainDim, drawDim) {
  const nChains = data.length;
  const extraDims = dims.filter((_, i) => i !== chainDim && i !== drawDim);
  const leaves = [];
  if (extraDims.length === 0) {
    for (let ci = 0; ci < nChains; ci++) {
      const chainData = data[ci];
      if (!Array.isArray(chainData)) continue;
      leaves.push({
        chainIdx: ci,
        leafName: varName,
        draws: chainData.map(Number)
      });
    }
    return leaves;
  }
  for (let ci = 0; ci < nChains; ci++) {
    const chainData = data[ci];
    if (!Array.isArray(chainData)) continue;
    const nDraws = chainData.length;
    const indices = _enumerateIndices(chainData[0]);
    for (const idx of indices) {
      const leafName = `${varName}[${idx.join(",")}]`;
      const draws = new Array(nDraws);
      for (let di = 0; di < nDraws; di++) {
        let node = chainData[di], valid = true;
        for (const i of idx) {
          if (!Array.isArray(node) || i >= node.length) {
            valid = false;
            break;
          }
          node = node[i];
        }
        draws[di] = valid ? Number(node) : NaN;
      }
      leaves.push({ chainIdx: ci, leafName, draws });
    }
  }
  return leaves;
}
function _enumerateIndices(node, prefix = []) {
  if (!Array.isArray(node)) return [prefix];
  const result = [];
  for (let i = 0; i < node.length; i++) {
    result.push(..._enumerateIndices(node[i], [...prefix, i]));
  }
  return result;
}

// src/parsers/detect.ts
function detectFormat(text) {
  const trimmed = text.trimStart();
  if (trimmed.startsWith("{") && isMCMCChainsJSON(trimmed))
    return "mcmcchains-json";
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

// src/exporters/index.ts
function toJSON(data) {
  const result = {};
  for (const chainName of data.chainNames) {
    result[chainName] = {};
    for (const varName of data.variableNames) {
      result[chainName][varName] = Array.from(
        data.getDraws(varName, chainName)
      );
    }
  }
  return JSON.stringify(result);
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
  getAutocorPlotData: () => getAutocorPlotData,
  getCumMeanPlotData: () => getCumMeanPlotData,
  getDensityPlotData: () => getDensityPlotData,
  getDiagnosticsHeatmapData: () => getDiagnosticsHeatmapData,
  getEcdfPlotData: () => getEcdfPlotData,
  getForestPlotData: () => getForestPlotData,
  getHistogramPlotData: () => getHistogramPlotData,
  getRankPlotData: () => getRankPlotData,
  getRunningRhatData: () => getRunningRhatData,
  getTracePlotData: () => getTracePlotData,
  histogramPlot: () => histogramPlot,
  pairPlot: () => pairPlot,
  rankPlot: () => rankPlot,
  runningRhatPlot: () => runningRhatPlot,
  summaryTable: () => summaryTable,
  tracePlot: () => tracePlot,
  tracePlotSpec: () => tracePlotSpec,
  violinPlot: () => violinPlot
});

// src/plots/trace.ts
function getTracePlotData(data, variable, opts) {
  const colors = resolveChainColors(opts);
  return {
    variable,
    series: data.chainNames.map((chain, i) => ({
      chain,
      iterations: Array.from(
        { length: data.getDraws(variable, chain).length },
        (_, j) => j + 1
      ),
      values: data.getDraws(variable, chain),
      color: colors[i % colors.length] ?? "#636EFA"
    }))
  };
}
function tracePlotSpec(data, variable, opts) {
  const { series } = getTracePlotData(data, variable, opts);
  const base = getLayout(opts);
  return {
    data: series.map((s) => ({
      x: s.iterations,
      y: Array.from(s.values),
      type: "scatter",
      mode: "lines",
      name: s.chain,
      line: { width: 0.8, color: s.color }
    })),
    layout: {
      ...base,
      title: { text: `Trace: ${variable}` },
      xaxis: { ...base["xaxis"], title: { text: "Iteration" } },
      yaxis: { ...base["yaxis"], title: { text: variable } },
      legend: { orientation: "h", y: -0.15 }
    },
    config: getConfig()
  };
}
function tracePlot(container, data, variable, opts) {
  const Plotly = getPlotly();
  let currentVar = variable;
  const render = () => {
    const spec = tracePlotSpec(data, currentVar, opts);
    Plotly.react(container, spec.data, spec.layout, spec.config);
  };
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
function getHistogramPlotData(data, variable, opts) {
  const colors = resolveChainColors(opts);
  const series = data.chainNames.map((chain, i) => ({
    chain,
    draws: data.getDraws(variable, chain),
    color: colors[i % colors.length]
  }));
  return { variable, series };
}
function histogramPlot(container, data, variable, options) {
  const Plotly = getPlotly();
  let currentVar = variable;
  function render() {
    const plotData = getHistogramPlotData(data, currentVar, options);
    const traces = plotData.series.map((s) => ({
      x: Array.from(s.draws),
      type: "histogram",
      name: s.chain,
      opacity: 0.6,
      marker: { color: s.color }
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
var MAX_LAG = 50;
function acf(draws, maxLag) {
  const n = draws.length;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += draws[i];
  mean /= n;
  let variance = 0;
  for (let i = 0; i < n; i++) variance += (draws[i] - mean) ** 2;
  if (variance === 0) return new Array(maxLag + 1).fill(0);
  const result = [];
  for (let lag = 0; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++)
      sum += (draws[i] - mean) * (draws[i + lag] - mean);
    result.push(sum / variance);
  }
  return result;
}
function getAutocorPlotData(data, variable, opts) {
  const colors = resolveChainColors(opts);
  const lags = Array.from({ length: MAX_LAG + 1 }, (_, i) => i);
  const series = data.chainNames.map((chain, i) => {
    const draws = data.getDraws(variable, chain);
    const values = acf(draws, MAX_LAG);
    return { chain, lags, values, color: colors[i % colors.length] };
  });
  return { variable, maxLag: MAX_LAG, series };
}
function autocorrelationPlot(container, data, variable, options) {
  const Plotly = getPlotly();
  let currentVar = variable;
  function render() {
    const plotData = getAutocorPlotData(data, currentVar, options);
    const traces = plotData.series.map((s) => ({
      x: s.lags,
      y: s.values,
      type: "bar",
      name: s.chain,
      marker: { color: s.color },
      opacity: 0.7
    }));
    const layout = {
      ...getLayout(options),
      title: { text: `Autocorrelation: ${currentVar}` },
      barmode: "group",
      xaxis: { ...getLayout(options).xaxis, title: "Lag" },
      yaxis: {
        ...getLayout(options).yaxis,
        title: "ACF",
        range: [-0.2, 1.05]
      },
      shapes: [
        {
          type: "line",
          x0: 0,
          x1: MAX_LAG,
          y0: 0,
          y1: 0,
          line: { color: "#888", width: 1, dash: "dash" }
        }
      ]
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
function getForestPlotData(data, opts) {
  const colors = resolveChainColors(opts);
  const summaries = data.summary();
  const rows = summaries.map((s) => ({
    variable: s.variable,
    mean: s.mean,
    hdiLow: s.hdi90[0],
    hdiHigh: s.hdi90[1],
    rhat: s.rhat ?? NaN,
    essBulk: s.bulkEss
  }));
  return { rows, color: colors[0] };
}
function forestPlot(container, data, options) {
  const Plotly = getPlotly();
  function render() {
    const plotData = getForestPlotData(data, options);
    const { rows, color } = plotData;
    const vars = rows.map((r) => r.variable);
    const means = rows.map((r) => r.mean);
    const summaries = data.summary();
    const hdiTrace = {
      x: means,
      y: vars,
      type: "scatter",
      mode: "markers",
      marker: { size: 9, color, symbol: "diamond" },
      error_x: {
        type: "data",
        symmetric: false,
        array: rows.map((r) => r.hdiHigh - r.mean),
        arrayminus: rows.map((r) => r.mean - r.hdiLow),
        thickness: 1.5,
        width: 0,
        color
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
        color
      },
      name: "50% CI (IQR)",
      showlegend: true,
      hoverinfo: "skip"
    };
    const layout = {
      ...getLayout(options),
      title: { text: "Forest Plot" },
      height: Math.max(300, vars.length * 50 + 100),
      xaxis: {
        ...getLayout(options).xaxis,
        title: "Value",
        zeroline: true
      },
      yaxis: { ...getLayout(options).yaxis, automargin: true },
      shapes: [
        {
          type: "line",
          x0: 0,
          x1: 0,
          yref: "paper",
          y0: 0,
          y1: 1,
          line: { color: "#888", width: 1, dash: "dash" }
        }
      ]
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
function getCumMeanPlotData(data, variable, opts) {
  const colors = resolveChainColors(opts);
  const firstChain = data.chainNames[0];
  const firstDraws = firstChain ? data.getDraws(variable, firstChain) : new Float64Array(0);
  const n = firstDraws.length;
  const iterations = Array.from({ length: n }, (_, i) => i + 1);
  const series = data.chainNames.map((chain, i) => {
    const draws = data.getDraws(variable, chain);
    const values = [];
    let sum = 0;
    for (let j = 0; j < draws.length; j++) {
      sum += draws[j];
      values.push(sum / (j + 1));
    }
    return { chain, values, color: colors[i % colors.length] };
  });
  return { variable, iterations, series };
}
function cumulativeMeanPlot(container, data, variable, options) {
  const Plotly = getPlotly();
  let currentVar = variable;
  function render() {
    const plotData = getCumMeanPlotData(data, currentVar, options);
    const traces = plotData.series.map((s) => ({
      y: s.values,
      type: "scatter",
      mode: "lines",
      name: s.chain,
      line: { width: 1.5, color: s.color }
    }));
    const layout = {
      ...getLayout(options),
      title: { text: `Cumulative Mean: ${currentVar}` },
      xaxis: { ...getLayout(options).xaxis, title: "Iteration" },
      yaxis: {
        ...getLayout(options).yaxis,
        title: `Mean (${currentVar})`
      }
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
    const colors = resolveChainColors(options);
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
          color: colors[i % colors.length]
        },
        showupperhalf: false,
        diagonal: { visible: true }
      };
    });
    const isDark = !options?.theme || options.theme !== "light";
    const axisCfg = () => ({
      gridcolor: isDark ? "#252836" : "#e5e7eb",
      linecolor: isDark ? "#333" : "#d1d5db"
    });
    const axisOverrides = {};
    for (let i = 1; i <= vars.length; i++) {
      axisOverrides[`xaxis${i > 1 ? i : ""}`] = axisCfg();
      axisOverrides[`yaxis${i > 1 ? i : ""}`] = axisCfg();
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
function getRankPlotData(data, variable, opts) {
  const colors = resolveChainColors(opts);
  const nBins = 20;
  const allDraws = [];
  const chainDraws = [];
  for (const chain of data.chainNames) {
    const d = data.getDraws(variable, chain);
    chainDraws.push(d);
    for (let i = 0; i < d.length; i++) allDraws.push(d[i]);
  }
  const totalN = allDraws.length;
  const sorted = [...allDraws].sort((a, b) => a - b);
  const rankMap = /* @__PURE__ */ new Map();
  for (let i = 0; i < sorted.length; i++) {
    if (!rankMap.has(sorted[i])) rankMap.set(sorted[i], i + 1);
  }
  const binEdges = Array.from({ length: nBins }, (_, k) => k / nBins);
  const series = data.chainNames.map((chain, ci) => {
    const draws = chainDraws[ci];
    const counts = new Array(nBins).fill(0);
    for (let i = 0; i < draws.length; i++) {
      const normRank = rankMap.get(draws[i]) / totalN;
      const bin = Math.min(nBins - 1, Math.floor(normRank * nBins));
      counts[bin]++;
    }
    return {
      chain,
      bins: binEdges,
      counts,
      color: colors[ci % colors.length]
    };
  });
  return { variable, nBins, series };
}
function rankPlot(container, data, variable, options) {
  const Plotly = getPlotly();
  let currentVar = variable;
  function render() {
    const plotData = getRankPlotData(data, currentVar, options);
    const { nBins, series } = plotData;
    const totalN = series.reduce(
      (sum, s) => sum + s.counts.reduce((a, b) => a + b, 0),
      0
    );
    const nChains = series.length;
    const traces = series.map((s) => ({
      x: s.bins,
      y: s.counts,
      type: "bar",
      name: s.chain,
      opacity: 0.6,
      marker: { color: s.color }
    }));
    const layout = {
      ...getLayout(options),
      title: { text: `Rank Histogram: ${currentVar}` },
      barmode: "overlay",
      xaxis: {
        ...getLayout(options).xaxis,
        title: "Normalized Rank"
      },
      yaxis: { ...getLayout(options).yaxis, title: "Count" },
      shapes: [
        {
          type: "line",
          x0: 0,
          x1: 1,
          y0: totalN / nChains / nBins,
          y1: totalN / nChains / nBins,
          line: { color: "#888", width: 1.5, dash: "dash" }
        }
      ]
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
function getRunningRhatData(data, variable, opts) {
  const colors = resolveChainColors(opts);
  const chains = data.chainNames.map((c) => data.getDraws(variable, c));
  const minLen = Math.min(...chains.map((c) => c.length));
  const step = Math.max(1, Math.floor(minLen / 200));
  const startAt = Math.max(20, step);
  const iterations = [];
  const rhat = [];
  for (let n = startAt; n <= minLen; n += step) {
    const sliced = chains.map((c) => c.slice(0, n));
    const means = sliced.map((c) => computeMean(c));
    const sds = sliced.map((c) => computeStdev(c));
    const counts = sliced.map((c) => c.length);
    const r = computeRhatFromParts(means, sds, counts);
    if (r !== void 0 && !isNaN(r)) {
      iterations.push(n);
      rhat.push(r);
    }
  }
  return { variable, iterations, rhat, color: colors[0] };
}
function runningRhatPlot(container, data, variable, options) {
  const Plotly = getPlotly();
  let currentVar = variable;
  function render() {
    const plotData = getRunningRhatData(data, currentVar, options);
    const { iterations, rhat, color } = plotData;
    const traces = [
      {
        x: iterations,
        y: rhat,
        type: "scatter",
        mode: "lines",
        name: "R\u0302",
        line: { width: 2, color }
      }
    ];
    const layout = {
      ...getLayout(options),
      title: { text: `Running R\u0302: ${currentVar}` },
      xaxis: { ...getLayout(options).xaxis, title: "Iteration" },
      yaxis: { ...getLayout(options).yaxis, title: "R\u0302" },
      shapes: [
        {
          type: "line",
          x0: iterations[0] ?? 0,
          x1: iterations[iterations.length - 1] ?? 1,
          y0: 1,
          y1: 1,
          line: { color: "#22c55e", width: 1, dash: "dash" }
        },
        {
          type: "line",
          x0: iterations[0] ?? 0,
          x1: iterations[iterations.length - 1] ?? 1,
          y0: 1.05,
          y1: 1.05,
          line: { color: "#ef4444", width: 1, dash: "dot" }
        }
      ]
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
function kde(values, nPoints = 200) {
  const n = values.length;
  if (n === 0) return { x: [], y: [] };
  let min = values[0], max = values[0];
  let mean = 0;
  for (let i = 0; i < n; i++) {
    if (values[i] < min) min = values[i];
    if (values[i] > max) max = values[i];
    mean += values[i];
  }
  mean /= n;
  let variance = 0;
  for (let i = 0; i < n; i++) variance += (values[i] - mean) ** 2;
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
function getDensityPlotData(data, variable, opts) {
  const colors = resolveChainColors(opts);
  const curves = data.chainNames.map((chain, i) => {
    const draws = data.getDraws(variable, chain);
    const { x, y } = kde(draws);
    return { chain, x, y, color: colors[i % colors.length] };
  });
  return { variable, curves };
}
function densityPlot(container, data, variable, options) {
  const Plotly = getPlotly();
  let currentVar = variable;
  function render() {
    const plotData = getDensityPlotData(data, currentVar, options);
    const traces = plotData.curves.map((curve) => ({
      x: curve.x,
      y: curve.y,
      type: "scatter",
      mode: "lines",
      name: curve.chain,
      fill: "tozeroy",
      fillcolor: curve.color.replace(")", ",0.12)").replace("rgb", "rgba"),
      line: { width: 2, color: curve.color }
    }));
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
    const colors = resolveChainColors(options);
    const traces = data.variableNames.map((varName, vi) => {
      const allDraws = Array.from(data.getAllDraws(varName));
      return {
        type: "violin",
        y: allDraws,
        name: varName,
        box: { visible: true },
        meanline: { visible: true },
        line: { color: colors[vi % colors.length] },
        fillcolor: colors[vi % colors.length].replace(")", ",0.3)").replace(
          "rgb",
          "rgba"
        ),
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
    const colors = resolveChainColors(options);
    const hasEnergy = data.variableNames.some(
      (v) => v === "energy__" || v === "energy" || v === "lp__" || v === "log_density"
    );
    const energyVar = ["energy__", "energy", "lp__", "log_density"].find(
      (v) => data.variableNames.includes(v)
    );
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
        marker: { color: colors[i % colors.length] },
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
            color: colors[i % colors.length],
            line: { color: colors[i % colors.length], width: 1 }
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
function getEcdfPlotData(data, variable, opts) {
  const colors = resolveChainColors(opts);
  const series = data.chainNames.map((chain, i) => {
    const draws = data.getDraws(variable, chain);
    const sorted = Array.from(draws).sort((a, b) => a - b);
    const n = sorted.length;
    return {
      chain,
      x: sorted,
      y: sorted.map((_, idx) => (idx + 1) / n),
      color: colors[i % colors.length]
    };
  });
  return { variable, series };
}
function ecdfPlot(container, data, variable, options) {
  const Plotly = getPlotly();
  let currentVar = variable;
  function render() {
    const plotData = getEcdfPlotData(data, currentVar, options);
    const traces = plotData.series.map((s) => ({
      x: s.x,
      y: s.y,
      type: "scatter",
      mode: "lines",
      name: s.chain,
      line: { width: 2, shape: "hv", color: s.color }
    }));
    const layout = {
      ...getLayout(options),
      title: { text: `Empirical CDF: ${currentVar}` },
      xaxis: { ...getLayout(options).xaxis, title: currentVar },
      yaxis: {
        ...getLayout(options).yaxis,
        title: "Cumulative Probability",
        range: [0, 1]
      }
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
    const colors = resolveChainColors(options);
    const chainSummaries = data.chainNames.map((chain, index) => {
      const draws = data.getDraws(currentVar, chain);
      const mean = computeMean(draws);
      const hdi90 = computeHDI(draws, 0.9);
      return {
        chain,
        mean,
        hdi90,
        color: colors[index % colors.length]
      };
    });
    const overallStats = data.variableStats(currentVar);
    const minX = Math.min(
      ...chainSummaries.map((s) => s.hdi90[0]),
      overallStats.hdi90[0]
    );
    const maxX = Math.max(
      ...chainSummaries.map((s) => s.hdi90[1]),
      overallStats.hdi90[1]
    );
    const traces = [
      {
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
      }
    ];
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
      annotations: [
        {
          x: overallStats.mean,
          y: 1.02,
          yref: "paper",
          text: `Overall mean ${overallStats.mean.toFixed(3)}`,
          showarrow: false,
          font: {
            size: 11,
            color: options?.theme === "light" ? "#92400e" : "#fbbf24"
          }
        }
      ]
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
function getDiagnosticsHeatmapData(data) {
  const summaries = data.summary();
  const rows = summaries.map((s) => ({
    variable: s.variable,
    essBulk: s.bulkEss,
    essTail: s.tailEss,
    rhat: s.rhat ?? NaN
  }));
  return { rows };
}
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
        score: (summary) => scoreUpper(
          summary.stdev === 0 ? 0 : summary.mcse / summary.stdev,
          0.02,
          0.1
        )
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
    const z = summaries.map(
      (summary) => metrics.map((metric) => metric.score(summary))
    );
    const text = summaries.map(
      (summary) => metrics.map((metric) => metric.text(summary))
    );
    const customdata = summaries.map(
      (summary) => metrics.map((metric) => metric.raw(summary))
    );
    const layout = {
      ...getLayout(options),
      title: { text: "Diagnostics Heatmap" },
      xaxis: { ...getLayout(options).xaxis, side: "top" },
      yaxis: {
        ...getLayout(options).yaxis,
        automargin: true,
        autorange: "reversed"
      },
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
function fromArviZJSON(input) {
  return new MCMCData(parseArviZJSONPosterior(input));
}
function fromTuringCSV(text) {
  return new MCMCData(parseTuringCSV(text));
}
function fromStanCSV(text) {
  return new MCMCData(parseStanCSV(text));
}
function fromStanCSVFiles(files) {
  return new MCMCData(parseStanCSVFiles(files));
}
function fromMCMCChainsJSON(text) {
  return new MCMCData(parseMCMCChainsJSON(text));
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
      throw new Error(
        "Unable to auto-detect format. Use fromTuringCSV(), fromStanCSV(), fromArviZJSON(), or fromMCMCChainsJSON() explicitly."
      );
  }
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
  BAYES_DARK_THEME,
  MCMCData,
  computeESS,
  computeEssBasic,
  computeEssBulk,
  computeEssTail,
  computeExcessKurtosis,
  computeGeweke,
  computeHDI,
  computeMCSE,
  computeMCSEMultiChain,
  computeMCSEQuantile,
  computeMCSEStd,
  computeMean,
  computeQuantiles,
  computeRhat,
  computeSkewness,
  computeSplitRhat,
  computeStdev,
  detectFormat,
  fromArviZJSON,
  fromAutoDetect,
  fromChainArrays,
  fromMCMCChainsJSON,
  fromStanCSV,
  fromStanCSVFiles,
  fromTuringCSV,
  parseArviZJSON,
  parseArviZJSONPosterior,
  plots_exports as plots,
  toJSON
};
//# sourceMappingURL=index.js.map