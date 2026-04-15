/**
 * Simulates what a typical Bayesian web app pipeline produces.
 *
 * Common pattern:
 *   Turing.jl (@model + NUTS) → CSV Logger callback → Python uploader
 *   → Backend server (ArviZ netCDF storage) → Browser (MCMCVisualizer)
 *
 * This file generates synthetic data at each stage so the Vue app can show
 * exactly what format lives at each pipeline boundary.
 */

// ── Model truth ──────────────────────────────────────────────────────────
export const MODEL_INFO = {
  description: 'Bayesian linear regression  y = α + β·x + ε,   ε ~ N(0, σ²)',
  trueAlpha:  2.5,
  trueBeta:   1.8,
  trueSigma:  0.6,
  nObs:       60,
  nChains:    4,
  nDraws:     2000,
  nWarmup:    1000,
};

// ── Deterministic PRNG ───────────────────────────────────────────────────
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

function boxMuller(rand: () => number) {
  let spare: number | null = null;
  return () => {
    if (spare !== null) { const v = spare; spare = null; return v; }
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    const mag = Math.sqrt(-2 * Math.log(u));
    spare = mag * Math.sin(2 * Math.PI * v);
    return mag * Math.cos(2 * Math.PI * v);
  };
}

/**
 * AR(1) process — stationary at N(center, sigma²) with autocorrelation phi.
 * phi ≈ 0.12 matches typical NUTS output on a well-specified model.
 */
function ar1(n: number, center: number, sigma: number, phi: number, seed: number): number[] {
  const gauss = boxMuller(lcg(seed));
  const innov = sigma * Math.sqrt(1 - phi * phi);
  const out   = new Array<number>(n);
  out[0] = center + gauss() * sigma;
  for (let i = 1; i < n; i++) {
    out[i] = center + phi * (out[i - 1]! - center) + gauss() * innov;
  }
  return out;
}

// ── Parameter specs ──────────────────────────────────────────────────────
const PARAMS: Array<{
  name: string; center: number; sd: number; phi: number; seedBase: number; positive?: true;
}> = [
  { name: 'α', center: MODEL_INFO.trueAlpha, sd: 0.077, phi: 0.12, seedBase: 100 },
  { name: 'β', center: MODEL_INFO.trueBeta,  sd: 0.086, phi: 0.12, seedBase: 200 },
  { name: 'σ', center: MODEL_INFO.trueSigma, sd: 0.058, phi: 0.12, seedBase: 300, positive: true },
];

// ── Result type ──────────────────────────────────────────────────────────

export interface SimulationResult {
  /** MCMCVisualizer fromChainArrays() format */
  chainArrays:      Record<string, Record<string, number[]>>;
  /** CSV logger format — what the AbstractMCMC callback writes per iteration */
  csvLoggerOutput:  string;
  /** HTTP payload — what the Python uploader POSTs to the server */
  uploaderPayload:  object;
  /** Server-side description — what the backend stores with ArviZ */
  serverDescription: string;
  /** Parameter names in order */
  paramNames:       string[];
}

export function runSimulation(): SimulationResult {
  const { nChains, nDraws } = MODEL_INFO;
  const chainArrays: Record<string, Record<string, number[]>> = {};

  for (let ci = 0; ci < nChains; ci++) {
    const name = `chain_${ci + 1}`;
    chainArrays[name] = {};
    for (const spec of PARAMS) {
      let vals = ar1(nDraws, spec.center, spec.sd, spec.phi, spec.seedBase + ci * 7);
      if (spec.positive) vals = vals.map(v => Math.max(0.01, v));
      chainArrays[name][spec.name] = vals;
    }
  }

  // ── CSV logger output ──────────────────────────────────────────────────
  // Written by the AbstractMCMC callback on every kept iteration.
  // Long format: chain_name, param_name, iteration, value
  const csvRows = ['# AbstractMCMC callback — written per iteration to CSV'];
  for (const [ch, params] of Object.entries(chainArrays)) {
    for (const [param, vals] of Object.entries(params)) {
      for (let i = 0; i < 4; i++) {
        csvRows.push(`${ch},${param},${i + 1},${vals[i]!.toFixed(6)}`);
      }
      csvRows.push(`${ch},${param},…  (${nDraws} total draws)`);
    }
  }

  // ── Python uploader payload ────────────────────────────────────────────
  // The Python client reads the CSV files and batches them as JSON.
  const varsPayload: Record<string, Record<string, number[]>> = {};
  const iterPayload: Record<string, [number, number]>         = {};
  for (const [ch, params] of Object.entries(chainArrays)) {
    varsPayload[ch] = {};
    for (const [param, vals] of Object.entries(params)) {
      varsPayload[ch][param] = vals.slice(0, 3).map(v => +v.toFixed(4));
    }
    iterPayload[ch] = [1, nDraws];
  }

  // ── Server-side description ────────────────────────────────────────────
  const serverDescription = [
    '# Backend server — receives JSON payload via HTTP POST',
    '',
    '# Step 1: Convert to ArviZ InferenceData and persist as netCDF',
    `import arviz as az`,
    `dataset = az.convert_to_inference_data(`,
    `    chain_data, coords={"chain": [chain_name]}`,
    `)`,
    `dataset.to_netcdf(tmp_file)`,
    `storage.upload(tmp_file, f"{experiment_id}/{chain_name}.nc")`,
    '',
    '# Step 2: When browser requests a plot, load from storage and render',
    `idata = az.from_netcdf(downloaded_file)`,
    `ax = az.plot_autocorr(idata, backend="bokeh", show=False)`,
    `ax = az.plot_ecdf(values,   backend="bokeh", show=False)`,
    `ax = az.plot_dist(values,   backend="bokeh", show=False)`,
    `plot_json = bokeh.embed.json_item(ax)`,
    `# → Return Bokeh JSON → browser calls Bokeh.embed.embed_item()`,
    '',
    '# ⚠  This entire path is replaced by MCMCVisualizer in the browser.',
    '# ⚠  No server call, no Python, no Bokeh — just Plotly.js.',
  ].join('\n');

  return {
    chainArrays,
    csvLoggerOutput:  csvRows.join('\n'),
    uploaderPayload:  { vars: varsPayload, iteration: iterPayload },
    serverDescription,
    paramNames:       PARAMS.map(p => p.name),
  };
}
