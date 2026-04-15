/**
 * Accurate simulation of what the real bayes app actually receives.
 *
 * The real app data has three distinct categories:
 *
 *   1. Model parameters as raw draws:
 *        θ[1]/val, θ[2]/val, …  (one Float64Array per variable per chain)
 *
 *   2. HMC/NUTS internals as raw values:
 *        acceptance_rate/val, hamiltonian_energy/val, n_steps/val, …
 *
 *   3. OnlineStats running statistics (Welford's algorithm, updated every draw):
 *        θ[1]/stats[key]/stats/1/n   = draw count
 *        θ[1]/stats[key]/stats/1/μ   = running mean
 *        θ[1]/stats[key]/stats/2/n   = draw count for variance
 *        θ[1]/stats[key]/stats/2/μ   = running mean (second pass)
 *        θ[1]/stats[key]/stats/2/σ2  = running variance
 *
 *  The real app has 47 θ-dimensions + 11 HMC internals = 58 variables,
 *  producing 58 × 5 = 290 statistics entries.
 *  This demo uses 20 θ-dimensions to match the real structure while
 *  staying fast in the browser.
 */

// ── Constants ───────────────────────────────────────────────────────────────
export const MODEL_INFO = {
  description: 'Bayesian logistic regression  (20-dimensional θ)',
  nTheta:   20,    // real app has 47; using 20 for demo performance
  nChains:   4,
  nDraws:  2000,
  nWarmup: 1000,
};

// HMC internal variable names (exactly what NUTS produces)
export const HMC_INTERNALS = [
  'acceptance_rate',
  'hamiltonian_energy',
  'hamiltonian_energy_error',
  'is_accept',
  'log_density',
  'max_hamiltonian_energy_error',
  'n_steps',
  'nom_step_size',
  'numerical_error',
  'step_size',
  'tree_depth',
] as const;

// ── Deterministic PRNG ───────────────────────────────────────────────────────
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

function boxMuller(rand: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) { const v = spare; spare = null; return v; }
    let u = 0, v = 0;
    while (u === 0) u = rand(); while (v === 0) v = rand();
    const mag = Math.sqrt(-2 * Math.log(u));
    spare = mag * Math.sin(2 * Math.PI * v);
    return mag * Math.cos(2 * Math.PI * v);
  };
}

/** AR(1) process — stationary at N(center, sigma²) with autocorrelation phi. */
function ar1(n: number, center: number, sigma: number, phi: number, seed: number): Float64Array {
  const g = boxMuller(lcg(seed));
  const innov = sigma * Math.sqrt(1 - phi * phi);
  const out = new Float64Array(n);
  out[0] = center + g() * sigma;
  for (let i = 1; i < n; i++) out[i] = center + phi * (out[i - 1]! - center) + g() * innov;
  return out;
}

// ── OnlineStats running statistics (Welford's algorithm) ────────────────────

interface WelfordState { n: number; mean: number; m2: number; }

function welfordUpdate(state: WelfordState, x: number): WelfordState {
  const n    = state.n + 1;
  const delta  = x - state.mean;
  const mean   = state.mean + delta / n;
  const delta2 = x - mean;
  const m2     = state.m2 + delta * delta2;
  return { n, mean, m2 };
}

/**
 * Build the 5 OnlineStats series for a single variable's draw array.
 * Matches the exact key structure the real app uses:
 *   varName/stats[key]/stats/1/n
 *   varName/stats[key]/stats/1/μ
 *   varName/stats[key]/stats/2/n
 *   varName/stats[key]/stats/2/μ
 *   varName/stats[key]/stats/2/σ2
 */
function buildOnlineStats(
  baseKey: string,
  draws: Float64Array,
): Record<string, Float64Array> {
  const n = draws.length;
  const s1n   = new Float64Array(n);
  const s1mu  = new Float64Array(n);
  const s2n   = new Float64Array(n);
  const s2mu  = new Float64Array(n);
  const s2sig = new Float64Array(n);

  let st: WelfordState = { n: 0, mean: 0, m2: 0 };
  for (let i = 0; i < n; i++) {
    st = welfordUpdate(st, draws[i]!);
    s1n[i]   = st.n;
    s1mu[i]  = st.mean;
    s2n[i]   = st.n;
    s2mu[i]  = st.mean;
    s2sig[i] = st.n > 1 ? st.m2 / (st.n - 1) : 0;  // unbiased variance
  }

  const prefix = `${baseKey}/stats[key]/stats`;
  return {
    [`${prefix}/1/n`]:  s1n,
    [`${prefix}/1/μ`]:  s1mu,
    [`${prefix}/2/n`]:  s2n,
    [`${prefix}/2/μ`]:  s2mu,
    [`${prefix}/2/σ2`]: s2sig,
  };
}

// ── Simulation result type ───────────────────────────────────────────────────

export interface SimulationResult {
  /** fromChainArrays() input — all /val and /stats series */
  chainArrays: Record<string, Record<string, Float64Array>>;
  /** Names of model parameter variables (without suffix, for display) */
  modelParamNames: string[];
  /** Names of HMC internal variables (without suffix, for display) */
  hmcInternalNames: string[];
  /** Total variable count (matches the real app count) */
  totalVarCount: number;
  /** Total statistics count */
  totalStatsCount: number;
  /** Sample CSV logger output */
  csvLoggerOutput: string;
  /** Sample HTTP payload */
  uploaderPayload: object;
  /** Server-side code description */
  serverDescription: string;
}

// ── Main simulation ──────────────────────────────────────────────────────────

export function runSimulation(): SimulationResult {
  const { nTheta, nChains, nDraws } = MODEL_INFO;
  const chainArrays: Record<string, Record<string, Float64Array>> = {};

  // θ parameter specs — weakly correlated coefficients typical of logistic regression
  const thetaSpecs = Array.from({ length: nTheta }, (_, k) => ({
    center: (k % 3 === 0 ? 1.2 : k % 3 === 1 ? -0.8 : 0.3) * (1 - k * 0.01),
    sigma:  0.08 + k * 0.002,
    phi:    0.12,
  }));

  for (let ci = 0; ci < nChains; ci++) {
    const chainName  = `chain_${ci + 1}`;
    const chainVars: Record<string, Float64Array> = {};

    // ── Model parameters ──────────────────────────────────────────────────
    for (let ki = 0; ki < nTheta; ki++) {
      const spec  = thetaSpecs[ki]!;
      const key   = `θ[${ki + 1}]/val`;
      const draws = ar1(nDraws, spec.center, spec.sigma, spec.phi, 100 + ki * 13 + ci * 7);
      chainVars[key] = draws;

      // Running statistics for this parameter
      Object.assign(chainVars, buildOnlineStats(`θ[${ki + 1}]`, draws));
    }

    // ── HMC internals ─────────────────────────────────────────────────────
    const hmcData: Record<typeof HMC_INTERNALS[number], Float64Array> = {
      acceptance_rate: ar1(nDraws, 0.84, 0.09, 0.05, 500 + ci).map(v => Math.max(0, Math.min(1, v))) as Float64Array,
      hamiltonian_energy: ar1(nDraws, 28.4, 1.2, 0.30, 510 + ci),
      hamiltonian_energy_error: ar1(nDraws, 0.04, 0.05, 0.05, 520 + ci).map(v => Math.abs(v)) as Float64Array,
      is_accept: ar1(nDraws, 0.97, 0.1, 0.02, 530 + ci).map(v => (v > 0.5 ? 1 : 0)) as Float64Array,
      log_density: ar1(nDraws, -26.1, 1.3, 0.28, 540 + ci),
      max_hamiltonian_energy_error: ar1(nDraws, 0.08, 0.06, 0.05, 550 + ci).map(Math.abs) as Float64Array,
      n_steps: ar1(nDraws, 15, 6, 0.10, 560 + ci).map(v => Math.max(1, Math.round(Math.abs(v)))) as Float64Array,
      nom_step_size: ar1(nDraws, 0.093, 0.002, 0.03, 570 + ci).map(Math.abs) as Float64Array,
      numerical_error: ar1(nDraws, 0.02, 0.1, 0.02, 580 + ci).map(v => (v > 0.9 ? 1 : 0)) as Float64Array,
      step_size: ar1(nDraws, 0.093, 0.003, 0.02, 590 + ci).map(Math.abs) as Float64Array,
      tree_depth: ar1(nDraws, 3.8, 0.9, 0.08, 600 + ci).map(v => Math.max(1, Math.min(10, Math.round(v)))) as Float64Array,
    };

    for (const [name, draws] of Object.entries(hmcData) as [typeof HMC_INTERNALS[number], Float64Array][]) {
      chainVars[`${name}/val`] = draws;
      Object.assign(chainVars, buildOnlineStats(name, draws));
    }

    chainArrays[chainName] = chainVars;
  }

  // ── CSV logger output sample ──────────────────────────────────────────────
  const csvRows = ['# AbstractMCMC callback — written per iteration to CSV'];
  const chainData = chainArrays['chain_1']!;
  const sampleVars = [`θ[1]/val`, `θ[2]/val`, `acceptance_rate/val`, `hamiltonian_energy/val`];
  for (const v of sampleVars) {
    const vals = chainData[v];
    if (!vals) continue;
    for (let i = 0; i < 3; i++) csvRows.push(`chain_1,${v},${i + 1},${vals[i]!.toFixed(6)}`);
    csvRows.push(`chain_1,${v},…  (${nDraws} total draws)`);
  }

  // ── Uploader payload ──────────────────────────────────────────────────────
  const varsPayload: Record<string, Record<string, number[]>> = {};
  for (const [chain, vars] of Object.entries(chainArrays)) {
    varsPayload[chain] = {};
    for (const varName of sampleVars) {
      const arr = vars[varName];
      if (arr) varsPayload[chain][varName] = Array.from(arr.slice(0, 3)).map(v => +v.toFixed(4));
    }
  }

  // ── Server description ────────────────────────────────────────────────────
  const serverDescription = [
    '# Backend server receives JSON payload, stores as ArviZ netCDF',
    '',
    'import arviz as az',
    '',
    '# Convert — note: /val suffix stripped, nested vars flattened',
    'chain_data = {',
    '    "θ[1]": [2.591, 2.533, ...],',
    '    "θ[2]": [1.970, 1.720, ...],',
    '    # ... θ[3] through θ[20]',
    '    "acceptance_rate": [0.84, 0.91, ...],',
    '    "hamiltonian_energy": [28.1, 27.9, ...],',
    '    # ... other HMC internals',
    '}',
    'dataset = az.convert_to_inference_data(',
    '    chain_data, coords={"chain": ["chain_1"]}',
    ')',
    'dataset.to_netcdf(tmp_file)',
    'storage.upload(tmp_file, f"{exp_id}/chain_1.nc")',
    '',
    '# On-demand plot generation (when browser requests a plot):',
    'idata  = az.from_netcdf(storage.download(key))',
    'ax     = az.plot_autocorr(idata,   backend="bokeh", show=False)',
    'ax     = az.plot_ecdf(values,       backend="bokeh", show=False)',
    'ax     = az.plot_dist(values,       backend="bokeh", show=False)',
    'result = bokeh.embed.json_item(ax)',
    '# → Bokeh JSON → browser loads 5 Bokeh scripts → embed_item()',
    '',
    '# ⚠  MCMCVisualizer replaces this path — all in-browser, zero server calls.',
  ].join('\n');

  const nVarPerChain  = nTheta + HMC_INTERNALS.length;
  const nStatsPerChain = nVarPerChain * 5;

  return {
    chainArrays: chainArrays as unknown as Record<string, Record<string, Float64Array>>,
    modelParamNames:  Array.from({ length: nTheta }, (_, k) => `θ[${k + 1}]`),
    hmcInternalNames: [...HMC_INTERNALS],
    totalVarCount:    nVarPerChain,
    totalStatsCount:  nStatsPerChain,
    csvLoggerOutput:  csvRows.join('\n'),
    uploaderPayload:  { vars: varsPayload, iteration: { chain_1: [1, nDraws] } },
    serverDescription,
  };
}
