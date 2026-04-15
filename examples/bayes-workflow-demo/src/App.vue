<template>
  <div class="app">
    <!-- ── Header ─────────────────────────────────────────────────────── -->
    <header class="app-header">
      <div class="header-inner">
        <div class="header-badge">MCMCVisualizer · Workflow Demo</div>
        <h1>Bayesian Workflow — End-to-End Pipeline</h1>
        <p>
          Accurate simulation of the real app's data structure:
          <code>{{ MODEL_INFO.nTheta }} model parameters + {{ HMC_INTERNALS.length }} HMC internals</code>
          stored as <code>param/val</code> variables with OnlineStats running statistics
          (<code>param/stats[key]/stats/N/field</code>) — exactly the naming and shape the
          real app produces. All plots rendered <em>in-browser</em> by MCMCVisualizer.
        </p>
      </div>
    </header>

    <!-- ── Pipeline steps ─────────────────────────────────────────────── -->
    <section class="pipeline-section">
      <div class="pipeline-inner">
        <h2 class="section-title">Pipeline Overview</h2>
        <p class="section-sub">Click any step to see the exact code and data format at that boundary.</p>

        <div class="pipeline-track">
          <PipelineStep
            v-for="(step, i) in steps"
            :key="step.id"
            :step="step"
            :index="i"
            :active="activeStep === step.id"
            :is-last="i === steps.length - 1"
            @select="activeStep = step.id"
          />
        </div>

        <div class="step-detail" v-if="activeStepData">
          <div class="detail-header">
            <span class="detail-runtime" :class="activeStepData.runtime">{{ activeStepData.runtime }}</span>
            <strong>{{ activeStepData.label }}</strong>
            <span class="detail-role">{{ activeStepData.role }}</span>
          </div>
          <div class="detail-body">
            <div class="detail-explanation">
              <p v-for="line in activeStepData.explanation" :key="line">{{ line }}</p>
            </div>
            <pre class="code-block"><code>{{ activeStepData.code }}</code></pre>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Controls ───────────────────────────────────────────────────── -->
    <section class="controls-section">
      <div class="controls-inner">
        <div class="controls-left">
          <h2 class="section-title">Simulation</h2>
          <p class="section-sub">
            Model: Bayesian logistic regression with 20-dimensional θ
            &nbsp;·&nbsp; {{ MODEL_INFO.nChains }} chains × {{ MODEL_INFO.nDraws }} draws
            &nbsp;·&nbsp; {{ MODEL_INFO.nTheta + HMC_INTERNALS.length }} variables
            + {{ (MODEL_INFO.nTheta + HMC_INTERNALS.length) * 5 }} OnlineStats entries
          </p>
        </div>
        <div class="controls-right">
          <button class="btn-run" :disabled="running" @click="runSim">
            <span v-if="running">● Sampling…</span>
            <span v-else>▶ Run Simulation</span>
          </button>
          <div class="var-selector" v-if="data">
            <label>Variable</label>
            <select v-model="activeVar" @change="onVarChange">
              <optgroup label="Model parameters">
                <option v-for="p in sim!.modelParamNames" :key="p" :value="`${p}/val`">{{ p }}</option>
              </optgroup>
              <optgroup label="HMC internals">
                <option v-for="p in sim!.hmcInternalNames" :key="p" :value="`${p}/val`">{{ p }}</option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      <div class="status-bar" v-if="statusMsg">
        <div class="status-dot" :class="{ active: running }"></div>
        {{ statusMsg }}
      </div>
    </section>

    <!-- ── Data inventory (before plots) ──────────────────────────────── -->
    <section class="inventory-section" v-if="sim">
      <div class="inventory-grid">
        <div class="inventory-card">
          <div class="inv-count">{{ MODEL_INFO.nChains }}</div>
          <div class="inv-label">Chains</div>
          <div class="inv-note">chain_1 … chain_{{ MODEL_INFO.nChains }}</div>
        </div>
        <div class="inventory-card">
          <div class="inv-count">{{ sim.totalVarCount }}</div>
          <div class="inv-label">Variables</div>
          <div class="inv-note">{{ MODEL_INFO.nTheta }} θ params + {{ HMC_INTERNALS.length }} HMC internals</div>
        </div>
        <div class="inventory-card">
          <div class="inv-count">{{ sim.totalStatsCount }}</div>
          <div class="inv-label">OnlineStats entries</div>
          <div class="inv-note">5 per variable (n, μ, n, μ, σ²)</div>
        </div>
        <div class="inventory-card">
          <div class="inv-count">{{ MODEL_INFO.nDraws }}</div>
          <div class="inv-label">Post-warmup draws</div>
          <div class="inv-note">{{ MODEL_INFO.nWarmup }} warmup discarded</div>
        </div>
      </div>

      <!-- Variable naming explainer -->
      <div class="naming-explainer">
        <div class="naming-title">Variable naming convention — real app format</div>
        <div class="naming-grid">
          <div class="naming-item" v-for="item in namingExamples" :key="item.key">
            <code class="naming-key">{{ item.key }}</code>
            <span class="naming-desc">{{ item.desc }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Results ────────────────────────────────────────────────────── -->
    <main v-if="data" class="main-content">

      <!-- Stats strip for active variable -->
      <section class="stats-strip">
        <div class="stats-card" v-for="card in statsCards" :key="card.label">
          <div class="stats-label">{{ card.label }}</div>
          <div class="stats-value">{{ card.value }}</div>
          <div class="stats-note">{{ card.note }}</div>
        </div>
      </section>

      <!-- Summary table — model parameters only -->
      <section class="summary-section">
        <h3 class="subsection-title">Model parameters — diagnostics summary</h3>
        <p class="section-sub" style="margin-bottom: 10px;">
          Showing θ[1]…θ[{{ MODEL_INFO.nTheta }}] (the <code>/val</code> draws).
          HMC internals and <code>/stats</code> OnlineStats entries are excluded from diagnostic plots.
        </p>
        <div class="summary-table-wrap">
          <table class="summary-table">
            <thead>
              <tr>
                <th>parameter</th>
                <th>mean</th><th>sd</th><th>q2.5%</th><th>q97.5%</th>
                <th>mcse</th><th>ess_bulk</th><th>ess_tail</th><th>r̂</th>
                <th>status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in summaryRows" :key="row.param">
                <td class="param-name">{{ row.param }}</td>
                <td>{{ row.mean }}</td><td>{{ row.sd }}</td>
                <td>{{ row.q025 }}</td><td>{{ row.q975 }}</td>
                <td>{{ row.mcse }}</td>
                <td>{{ row.essBulk }}</td><td>{{ row.essTail }}</td>
                <td :class="rhatClass(row.rhatRaw)">{{ row.rhat }}</td>
                <td><span class="badge" :class="rhatClass(row.rhatRaw)">
                  {{ row.rhatRaw < 1.01 ? '✓' : row.rhatRaw < 1.1 ? '⚠' : '✗' }}
                </span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Per-variable plots -->
      <section class="plots-section">
        <div class="plots-header">
          <h3 class="subsection-title">
            Per-variable diagnostics
            <span class="plots-var-badge">{{ activeVarDisplay }}</span>
          </h3>
          <p class="plots-note">
            Plotly.js in-browser — no server call, no Python, no Bokeh.
            The <code>/val</code> suffix is stripped for display.
          </p>
        </div>
        <div class="plot-grid three">
          <div class="plot-card"><div class="plot-label">Trace</div><div ref="traceEl" class="plot-host"></div></div>
          <div class="plot-card"><div class="plot-label">Density (KDE)</div><div ref="densityEl" class="plot-host"></div></div>
          <div class="plot-card"><div class="plot-label">Histogram</div><div ref="histEl" class="plot-host"></div></div>
          <div class="plot-card"><div class="plot-label">Autocorrelation</div><div ref="acfEl" class="plot-host"></div></div>
          <div class="plot-card"><div class="plot-label">Cumulative mean</div><div ref="cmeanEl" class="plot-host"></div></div>
          <div class="plot-card"><div class="plot-label">ECDF</div><div ref="ecdfEl" class="plot-host"></div></div>
        </div>
        <div class="plot-grid two" style="margin-top:14px;">
          <div class="plot-card"><div class="plot-label">Rank plot</div><div ref="rankEl" class="plot-host"></div></div>
          <div class="plot-card"><div class="plot-label">Running R-hat</div><div ref="runRhatEl" class="plot-host"></div></div>
        </div>
      </section>

      <!-- HMC diagnostic plots -->
      <section class="plots-section">
        <div class="plots-header">
          <h3 class="subsection-title">HMC internals</h3>
          <p class="plots-note">
            <code>acceptance_rate/val</code>, <code>hamiltonian_energy/val</code>,
            <code>n_steps/val</code>, <code>tree_depth/val</code> — NUTS sampler diagnostics.
          </p>
        </div>
        <div class="plot-grid two">
          <div class="plot-card"><div class="plot-label">Energy plot</div><div ref="energyEl" class="plot-host"></div></div>
          <div class="plot-card"><div class="plot-label">HMC internals — trace</div><div ref="hmcTraceEl" class="plot-host"></div></div>
        </div>
      </section>

      <!-- Model-wide plots (θ params only) -->
      <section class="plots-section">
        <div class="plots-header">
          <h3 class="subsection-title">Model-wide diagnostics — θ[1]…θ[{{ MODEL_INFO.nTheta }}]</h3>
        </div>
        <div class="plot-grid two">
          <div class="plot-card tall"><div class="plot-label">Forest plot</div><div ref="forestEl" class="plot-host"></div></div>
          <div class="plot-card tall"><div class="plot-label">Violin plot</div><div ref="violinEl" class="plot-host"></div></div>
          <div class="plot-card tall wide"><div class="plot-label">Diagnostics heatmap — ESS bulk, ESS tail, R-hat</div><div ref="heatmapEl" class="plot-host"></div></div>
        </div>
      </section>

      <!-- What changed callout -->
      <section class="callout-section">
        <div class="callout">
          <div class="callout-icon">↑</div>
          <div>
            <strong>What MCMCVisualizer replaces — accurately mirroring the real app structure</strong>
            <p>
              The real app receives data in exactly the format simulated here:
              <code>θ[1]/val</code>–<code>θ[47]/val</code> plus 11 HMC internals (<code>acceptance_rate/val</code>,
              <code>hamiltonian_energy/val</code>, etc.) and 290 OnlineStats running statistics
              (<code>stats[key]/stats/N/field</code>).
              The current server pipeline converts this to ArviZ netCDF, stores it on S3, then
              runs <code>az.plot_*()</code> with a Bokeh backend on demand.
            </p>
            <p>
              MCMCVisualizer calls <code>fromChainArrays()</code> on the same raw data, filters
              <code>/val</code> variables for diagnostic plots, and renders everything with Plotly.js.
              The <code>/stats</code> entries (OnlineStats) are stored in the InferenceData object
              and available for inspection but excluded from MCMC diagnostic plots since they are
              derived statistics, not posterior draws.
            </p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, nextTick } from 'vue';
import { fromChainArrays, plots } from 'mcmc-visualizer';
import type { InferenceData, PlotHandle } from 'mcmc-visualizer';
import PipelineStep from './components/PipelineStep.vue';
import { runSimulation, MODEL_INFO, HMC_INTERNALS } from './simulation';
import type { SimulationResult } from './simulation';

// ── Pipeline steps ────────────────────────────────────────────────────
type StepId = 'sampler' | 'logger' | 'uploader' | 'server' | 'browser';

const steps: Array<{
  id: StepId; label: string; runtime: string; icon: string;
  role: string; explanation: string[]; code: string;
}> = [
  {
    id: 'sampler', label: 'Turing.jl', runtime: 'julia', icon: '𝒯',
    role: 'Probabilistic model + NUTS sampler',
    explanation: [
      'A @model with a 47-dimensional parameter vector θ (this demo: 20) and a logistic likelihood. AbstractMCMC runs NUTS with 4 parallel chains.',
      'NUTS produces model parameter draws alongside HMC internal statistics: acceptance_rate, hamiltonian_energy, n_steps, tree_depth, step_size, numerical_error, etc.',
      'OnlineStats.jl is used inside the callback to maintain running mean+variance (Welford algorithm) for each variable. This gives real-time statistics without storing all draws.',
    ],
    code: `using Turing, OnlineStats

@model function logistic_model(X, y)
    θ ~ filldist(Normal(0, 1), size(X, 2))  # 47-dim
    for i in eachindex(y)
        p = logistic(dot(X[i,:], θ))
        y[i] ~ Bernoulli(p)
    end
end

# The callback receives per-iteration draws AND
# HMC internals (acceptance_rate, hamiltonian_energy,
# n_steps, step_size, tree_depth, etc.)
chains = sample(
    logistic_model(X, y),
    NUTS(1000, 0.8), MCMCThreads(),
    2000, 4;
    callback = csv_and_onlinestats_callback,
)`,
  },
  {
    id: 'logger', label: 'CSV Logger', runtime: 'julia', icon: '📝',
    role: 'AbstractMCMC callback — writes /val draws + /stats running statistics',
    explanation: [
      'On every kept draw, the callback writes two kinds of data to CSV:',
      '1) Raw draws stored as param_name/val — one row per (chain, param, iteration).',
      '2) OnlineStats running statistics stored as param_name/stats[key]/stats/N/field — updated Welford mean+variance.',
      'The /val suffix and /stats path are the real naming convention used throughout the app.',
    ],
    code: `# Variables written per iteration:

# ── Raw draws (/val suffix) ──────────────────────────
# chain_1, θ[1]/val,                1, 0.832941
# chain_1, θ[2]/val,                1, -1.23451
# ...
# chain_1, acceptance_rate/val,     1, 0.943210
# chain_1, hamiltonian_energy/val,  1, 28.41234
# chain_1, n_steps/val,             1, 15
# chain_1, tree_depth/val,          1, 4

# ── OnlineStats running statistics (/stats path) ─────
# chain_1, θ[1]/stats[key]/stats/1/n,   1, 1
# chain_1, θ[1]/stats[key]/stats/1/μ,   1, 0.832941
# chain_1, θ[1]/stats[key]/stats/2/n,   1, 1
# chain_1, θ[1]/stats[key]/stats/2/μ,   1, 0.832941
# chain_1, θ[1]/stats[key]/stats/2/σ2,  1, 0

# Total rows per iteration: 47 vars + 11 HMC = 58 /val rows
#                           + 58 × 5 = 290 /stats rows`,
  },
  {
    id: 'uploader', label: 'Python Uploader', runtime: 'python', icon: '🐍',
    role: 'CSV reader → JSON batcher → HTTP POST to backend',
    explanation: [
      'Reads both /val and /stats rows from the CSV files and packages them as a structured JSON payload.',
      'The stats are sent alongside raw draws so the server can update running statistics efficiently without re-reading all historical data.',
      'Both variable types appear in the "vars" dict with their full path-based names as keys.',
    ],
    code: `payload = {
    "vars": {
        "chain_1": {
            # Raw draws (58 variables)
            "θ[1]/val":               [0.833, 0.712, ...],
            "θ[2]/val":               [-1.234, -1.191, ...],
            "acceptance_rate/val":    [0.943, 0.871, ...],
            "hamiltonian_energy/val": [28.41, 27.93, ...],
            # ...

            # OnlineStats statistics (290 entries)
            "θ[1]/stats[key]/stats/1/n":   [1, 2, 3, ...],
            "θ[1]/stats[key]/stats/1/μ":   [0.833, 0.772, ...],
            "θ[1]/stats[key]/stats/2/σ2":  [0, 0.007, ...],
            # ...
        },
        "chain_2": { ... },
        "chain_3": { ... },
        "chain_4": { ... },
    },
    "iteration": { "chain_1": [1, 2000], ... }
}`,
  },
  {
    id: 'server', label: 'Backend Server', runtime: 'server', icon: '☁',
    role: 'WebSocket broadcast + ArviZ netCDF + Bokeh plot generation',
    explanation: [
      'Path A: Broadcasts raw /val draws via WebSocket. The browser receives samples in real-time and runs in-browser diagnostics.',
      'Path B: Converts /val data to ArviZ InferenceData (stripping /val suffix, ignoring /stats), saves as netCDF per chain on S3.',
      'On-demand plot generation: loads .nc files, runs az.plot_autocorr/ecdf/dist() with Bokeh backend, returns Bokeh JSON. ⚠ This is the path MCMCVisualizer replaces.',
    ],
    code: `# sample_saver.py — strips /val suffix, saves /val only
import arviz as az

# Only the /val variables become posterior samples
clean = {k.replace("/val", ""): v
         for k, v in chain_data.items()
         if k.endswith("/val")}

dataset = az.convert_to_inference_data(
    clean, coords={"chain": [chain_name]}
)
dataset.to_netcdf(tmp_file)
storage.upload(tmp_file, f"{exp_id}/{chain_name}.nc")

# arviz_plot.py — on-demand Bokeh rendering
idata  = az.from_netcdf(storage.download(key))
ax     = az.plot_autocorr(idata,   backend="bokeh")
ax     = az.plot_ecdf(values,       backend="bokeh")
ax     = az.plot_dist(values,       backend="bokeh")
result = bokeh.embed.json_item(ax)
# ⚠  MCMCVisualizer replaces this entirely`,
  },
  {
    id: 'browser', label: 'Browser', runtime: 'browser', icon: '🌐',
    role: 'MCMCVisualizer — filters /val variables, computes diagnostics in-browser',
    explanation: [
      'fromChainArrays() accepts all variables including /stats entries. The app filters to /val variables for diagnostic plots.',
      'ESS bulk + rank R-hat are computed using the Geyer + FFT estimator, matching MCMCDiagnosticTools.jl accuracy.',
      'No server call for plots. The energy plot uses hamiltonian_energy/val directly from the chain data.',
    ],
    code: `import { fromChainArrays, plots } from 'mcmc-visualizer';

// Load all variables — /val draws + /stats running stats
const data = fromChainArrays({
  chain_1: {
    "θ[1]/val":                     [...2000 draws],
    // ... all 47 θ + 11 HMC = 58 /val variables
    "θ[1]/stats[key]/stats/1/n":    [...running n],
    // ... 290 /stats entries
  },
  chain_2: { ... },
  chain_3: { ... },
  chain_4: { ... },
});

// Filter: only /val variables go to diagnostic plots
const modelVars = data.variableNames
  .filter(v => v.endsWith("/val") && !isHMCInternal(v));

plots.tracePlot(el,   data, "θ[1]/val", opts);
plots.forestPlot(el,  data.filterVariables(modelVars), opts);
plots.energyPlot(el,  data, opts);  // uses hamiltonian_energy/val

// ESS matches MCMCChains.jl — verified in dev/compare.mjs`,
  },
];

// ── State ─────────────────────────────────────────────────────────────
const activeStep     = ref<StepId>('sampler');
const activeStepData = computed(() => steps.find(s => s.id === activeStep.value));

const running    = ref(false);
const statusMsg  = ref('');
const data       = ref<InferenceData | null>(null);
const sim        = ref<SimulationResult | null>(null);
const activeVar  = ref('θ[1]/val');

// Active variable display name (strip /val suffix)
const activeVarDisplay = computed(() => activeVar.value.replace('/val', ''));

// Plot DOM refs
const traceEl    = ref<HTMLElement>(); const densityEl = ref<HTMLElement>();
const histEl     = ref<HTMLElement>(); const acfEl     = ref<HTMLElement>();
const cmeanEl    = ref<HTMLElement>(); const ecdfEl    = ref<HTMLElement>();
const rankEl     = ref<HTMLElement>(); const runRhatEl = ref<HTMLElement>();
const energyEl   = ref<HTMLElement>(); const hmcTraceEl= ref<HTMLElement>();
const forestEl   = ref<HTMLElement>(); const violinEl  = ref<HTMLElement>();
const heatmapEl  = ref<HTMLElement>();

const plotHandles = ref<PlotHandle[]>([]);

// ── Naming convention explainer ────────────────────────────────────────
const namingExamples = [
  { key: 'θ[1]/val',                          desc: 'Raw posterior draw for θ[1] (one per iteration)' },
  { key: 'acceptance_rate/val',               desc: 'HMC internal: NUTS acceptance rate' },
  { key: 'hamiltonian_energy/val',            desc: 'HMC internal: total Hamiltonian energy' },
  { key: 'θ[1]/stats[key]/stats/1/n',         desc: 'OnlineStats: draw count' },
  { key: 'θ[1]/stats[key]/stats/1/μ',         desc: 'OnlineStats: running mean (Welford)' },
  { key: 'θ[1]/stats[key]/stats/2/σ2',        desc: 'OnlineStats: running variance (Welford)' },
];

// ── Summary table — model parameters only ─────────────────────────────
const summaryRows = computed(() => {
  if (!data.value || !sim.value) return [];
  return sim.value.modelParamNames.slice(0, 10).map(param => {
    const varName = `${param}/val`;
    const s = data.value!.variableStats(varName);
    const f = (n: number, d = 4) => isNaN(n) ? '—' : n.toFixed(d);
    const rhatVal = s.rhat ?? s.splitRhat ?? NaN;
    return {
      param,
      mean:    f(s.mean, 3),  sd:      f(s.stdev, 3),
      q025:    f(s.quantiles.q5, 3),  q975: f(s.quantiles.q95, 3),
      mcse:    f(s.mcse, 5),
      essBulk: isNaN(s.bulkEss) ? '—' : Math.round(s.bulkEss).toString(),
      essTail: isNaN(s.tailEss) ? '—' : Math.round(s.tailEss).toString(),
      rhat:    f(rhatVal),  rhatRaw: rhatVal,
    };
  });
});

function rhatClass(rhat: number) {
  if (isNaN(rhat)) return '';
  return rhat < 1.01 ? 'good' : rhat < 1.1 ? 'warn' : 'bad';
}

// ── Stats strip ────────────────────────────────────────────────────────
const statsCards = computed(() => {
  if (!data.value) return [];
  const s = data.value.variableStats(activeVar.value);
  const f = (n: number, d = 4) => isNaN(n) ? '—' : n.toFixed(d);
  const rhat = s.rhat ?? s.splitRhat ?? NaN;
  return [
    { label: 'Mean',      value: f(s.mean, 4),   note: `sd ${f(s.stdev, 4)}` },
    { label: '90% HDI',   value: `[${f(s.hdi90[0],3)}, ${f(s.hdi90[1],3)}]`, note: `width ${f(s.hdi90Width,3)}` },
    { label: 'ESS bulk',  value: isNaN(s.bulkEss) ? '—' : Math.round(s.bulkEss).toString(), note: `tail ${isNaN(s.tailEss) ? '—' : Math.round(s.tailEss)}` },
    { label: 'MCSE',      value: f(s.mcse, 5),   note: `ess/draw ${f(s.essPerDraw, 3)}` },
    { label: 'R-hat',     value: f(rhat, 4),     note: rhat < 1.01 ? '✓ converged' : '⚠ check' },
    { label: 'Geweke z',  value: f(s.geweke.z,3), note: `p = ${f(s.geweke.pValue,3)}` },
  ];
});

// ── Simulation ─────────────────────────────────────────────────────────
async function runSim() {
  running.value   = true;
  statusMsg.value = 'Step 1 — Turing.jl: NUTS sampling θ[1]…θ[20] + HMC internals…';
  await nextTick(); await delay(60);
  statusMsg.value = 'Step 2 — CSV Logger: writing /val draws + /stats OnlineStats per iteration…';
  await delay(60);
  statusMsg.value = 'Step 3 — Python Uploader: batching payload (58 vars + 290 stats)…';
  await delay(60);
  statusMsg.value = 'Step 4 — Backend Server: ArviZ netCDF storage (simulated, skipped)…';
  await delay(60);
  statusMsg.value = 'Step 5 — Browser: building InferenceData, computing diagnostics…';

  const result = runSimulation();
  sim.value    = result;

  // Convert Float64Array records to regular number arrays for fromChainArrays
  const converted: Record<string, Record<string, number[]>> = {};
  for (const [chain, vars] of Object.entries(result.chainArrays)) {
    converted[chain] = {};
    for (const [k, arr] of Object.entries(vars)) {
      converted[chain][k] = Array.from(arr as unknown as ArrayLike<number>);
    }
  }
  data.value = fromChainArrays(converted);

  // Default to first model parameter
  activeVar.value = `θ[1]/val`;
  await nextTick();
  statusMsg.value = 'Rendering plots…';

  plotHandles.value.forEach(h => h.destroy());
  plotHandles.value = [];

  const opts    = { theme: 'dark' as const, height: 320 };
  const wOpts   = { theme: 'dark' as const, height: 420 };
  const d       = data.value;
  const v       = activeVar.value;

  // /val model parameter variables only — for forest/violin/heatmap
  const modelValVars = result.modelParamNames.map(p => `${p}/val`);
  const modelData    = d.filterVariables(modelValVars);

  const hs: PlotHandle[] = [];
  if (traceEl.value)    hs.push(plots.tracePlot(traceEl.value, d, v, opts));
  if (densityEl.value)  hs.push(plots.densityPlot(densityEl.value, d, v, opts));
  if (histEl.value)     hs.push(plots.histogramPlot(histEl.value, d, v, opts));
  if (acfEl.value)      hs.push(plots.autocorrelationPlot(acfEl.value, d, v, opts));
  if (cmeanEl.value)    hs.push(plots.cumulativeMeanPlot(cmeanEl.value, d, v, opts));
  if (ecdfEl.value)     hs.push(plots.ecdfPlot(ecdfEl.value, d, v, opts));
  if (rankEl.value)     hs.push(plots.rankPlot(rankEl.value, d, v, opts));
  if (runRhatEl.value)  hs.push(plots.runningRhatPlot(runRhatEl.value, d, v, opts));
  if (energyEl.value)   hs.push(plots.energyPlot(energyEl.value, d, opts));
  if (hmcTraceEl.value) hs.push(plots.tracePlot(hmcTraceEl.value, d, 'acceptance_rate/val', opts));
  if (forestEl.value)   hs.push(plots.forestPlot(forestEl.value, modelData, wOpts));
  if (violinEl.value)   hs.push(plots.violinPlot(violinEl.value, modelData, wOpts));
  if (heatmapEl.value)  hs.push(plots.diagnosticsHeatmapPlot(heatmapEl.value, modelData, wOpts));

  plotHandles.value = hs;
  running.value    = false;
  const nTotal = MODEL_INFO.nTheta + HMC_INTERNALS.length;
  statusMsg.value = `Done — ${nTotal} variables (${nTotal * 5} OnlineStats) × ${MODEL_INFO.nChains} chains × ${MODEL_INFO.nDraws} draws.`;
  activeStep.value = 'browser';
}

function onVarChange() {
  plotHandles.value.forEach(h => h.update(activeVar.value));
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

onBeforeUnmount(() => plotHandles.value.forEach(h => h.destroy()));
</script>
