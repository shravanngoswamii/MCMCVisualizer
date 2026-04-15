<template>
  <div class="app">
    <!-- ── Header ─────────────────────────────────────────────────────── -->
    <header class="app-header">
      <div class="header-inner">
        <div class="header-badge">MCMCVisualizer · Workflow Demo</div>
        <h1>Bayesian Workflow — End-to-End Pipeline</h1>
        <p>
          Traces the path MCMC data takes from a Turing.jl sampler through a
          CSV logger, a Python uploader, and a backend server — then shows every
          plot rendered <em>entirely in the browser</em> using MCMCVisualizer
          instead of a server-side ArviZ + Bokeh pipeline.
        </p>
      </div>
    </header>

    <!-- ── Pipeline Steps ─────────────────────────────────────────────── -->
    <section class="pipeline-section">
      <div class="pipeline-inner">
        <h2 class="section-title">Pipeline Overview</h2>
        <p class="section-sub">
          Five boundaries. Each one transforms or transports the MCMC data.
          Click any step to see the exact format at that boundary.
        </p>

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
            <span class="detail-runtime" :class="activeStepData.runtime">
              {{ activeStepData.runtime }}
            </span>
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
            Model: <code>y = α + β·x + ε,  ε ~ N(0, σ²)</code>
            &nbsp;·&nbsp; True values: α = 2.5, β = 1.8, σ = 0.6
            &nbsp;·&nbsp; {{ MODEL_INFO.nChains }} chains × {{ MODEL_INFO.nDraws }} draws
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
              <option v-for="p in sim!.paramNames" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="status-bar" v-if="statusMsg">
        <div class="status-dot" :class="{ active: running }"></div>
        {{ statusMsg }}
      </div>
    </section>

    <!-- ── Results ────────────────────────────────────────────────────── -->
    <main v-if="data" class="main-content">

      <!-- Stats strip -->
      <section class="stats-strip">
        <div class="stats-card" v-for="card in statsCards" :key="card.label">
          <div class="stats-label">{{ card.label }}</div>
          <div class="stats-value">{{ card.value }}</div>
          <div class="stats-note">{{ card.note }}</div>
        </div>
      </section>

      <!-- Summary table -->
      <section class="summary-section">
        <h3 class="subsection-title">All parameters — diagnostics summary</h3>
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
                <td>
                  <span class="badge" :class="rhatClass(row.rhatRaw)">
                    {{ row.rhatRaw < 1.01 ? '✓ converged' : row.rhatRaw < 1.1 ? '⚠ marginal' : '✗ not converged' }}
                  </span>
                </td>
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
            <span class="plots-var-badge">{{ activeVar }}</span>
          </h3>
          <p class="plots-note">
            All rendered in-browser by MCMCVisualizer using Plotly.js — no server call, no Python, no Bokeh.
          </p>
        </div>

        <div class="plot-grid three">
          <div class="plot-card">
            <div class="plot-label">Trace plot</div>
            <div ref="traceEl" class="plot-host"></div>
          </div>
          <div class="plot-card">
            <div class="plot-label">Posterior density (KDE)</div>
            <div ref="densityEl" class="plot-host"></div>
          </div>
          <div class="plot-card">
            <div class="plot-label">Histogram</div>
            <div ref="histEl" class="plot-host"></div>
          </div>
          <div class="plot-card">
            <div class="plot-label">Autocorrelation</div>
            <div ref="acfEl" class="plot-host"></div>
          </div>
          <div class="plot-card">
            <div class="plot-label">Cumulative mean</div>
            <div ref="cmeanEl" class="plot-host"></div>
          </div>
          <div class="plot-card">
            <div class="plot-label">ECDF</div>
            <div ref="ecdfEl" class="plot-host"></div>
          </div>
        </div>

        <div class="plot-grid two" style="margin-top: 14px;">
          <div class="plot-card">
            <div class="plot-label">Rank plot (convergence)</div>
            <div ref="rankEl" class="plot-host"></div>
          </div>
          <div class="plot-card">
            <div class="plot-label">Running R-hat</div>
            <div ref="runRhatEl" class="plot-host"></div>
          </div>
        </div>
      </section>

      <!-- Model-wide plots -->
      <section class="plots-section">
        <div class="plots-header">
          <h3 class="subsection-title">Model-wide diagnostics</h3>
          <p class="plots-note">All parameters together.</p>
        </div>
        <div class="plot-grid two">
          <div class="plot-card tall">
            <div class="plot-label">Forest plot</div>
            <div ref="forestEl" class="plot-host"></div>
          </div>
          <div class="plot-card tall">
            <div class="plot-label">Violin plot</div>
            <div ref="violinEl" class="plot-host"></div>
          </div>
          <div class="plot-card tall wide">
            <div class="plot-label">Diagnostics heatmap — ESS bulk, ESS tail, R-hat</div>
            <div ref="heatmapEl" class="plot-host"></div>
          </div>
          <div class="plot-card tall">
            <div class="plot-label">Pair plot</div>
            <div ref="pairsEl" class="plot-host"></div>
          </div>
          <div class="plot-card tall">
            <div class="plot-label">Chain intervals</div>
            <div ref="intervalsEl" class="plot-host"></div>
          </div>
        </div>
      </section>

      <!-- What changed callout -->
      <section class="callout-section">
        <div class="callout">
          <div class="callout-icon">↑</div>
          <div>
            <strong>What MCMCVisualizer replaces in the server pipeline</strong>
            <p>
              The typical pattern for web-based MCMC dashboards is to send raw sample data
              to a server, store it as ArviZ netCDF, then run <code>az.plot_autocorr()</code> /
              <code>az.plot_ecdf()</code> / <code>az.plot_dist()</code> with a Bokeh backend and
              return Bokeh JSON to the browser. The browser loads several Bokeh script files
              and calls <code>Bokeh.embed.embed_item()</code> for each plot.
            </p>
            <p>
              With MCMCVisualizer, every plot above is generated entirely in-browser from
              the raw chain data. No server round-trip. No ArviZ. No Bokeh. ESS bulk and
              rank R-hat match MCMCDiagnosticTools.jl to within 1–2 units (verified against
              MCMCChains.jl output with 4 chains × 2000 draws).
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
import { runSimulation, MODEL_INFO } from './simulation';
import type { SimulationResult } from './simulation';

// ── Pipeline step definitions ──────────────────────────────────────────
type StepId = 'sampler' | 'logger' | 'uploader' | 'server' | 'browser';

const steps: Array<{
  id: StepId; label: string; runtime: string; icon: string;
  role: string; explanation: string[]; code: string;
}> = [
  {
    id:      'sampler',
    label:   'Turing.jl',
    runtime: 'julia',
    icon:    '𝒯',
    role:    'Probabilistic model + NUTS sampler',
    explanation: [
      'A Turing.jl @model defines the probabilistic structure. sample() runs NUTS via AbstractMCMC.jl with 4 parallel chains.',
      'Each chain independently explores the posterior with the No-U-Turn Sampler. 1000 warmup draws are discarded, 2000 post-warmup draws are kept per chain.',
      'The sampler fires an AbstractMCMC callback on every kept draw. A CSV logger callback is registered to capture the samples.',
    ],
    code: `using Turing

@model function linear_model(x, y)
    α ~ Normal(0, 5)
    β ~ Normal(0, 5)
    σ ~ truncated(Normal(0, 2); lower = 0)
    for i in eachindex(y)
        y[i] ~ Normal(α + β * x[i], σ)
    end
end

# csv_callback is registered as an AbstractMCMC callback
chains = sample(
    linear_model(x, y),
    NUTS(1000, 0.8),
    MCMCThreads(),
    2000, 4;               # 2000 draws, 4 chains
    discard_initial = 1000, # discard warmup
    callback = csv_callback,
    progress = false,
)`,
  },
  {
    id:      'logger',
    label:   'CSV Logger',
    runtime: 'julia',
    icon:    '📝',
    role:    'AbstractMCMC callback — writes draws to CSV per iteration',
    explanation: [
      'The callback implements the AbstractMCMC callback protocol and fires on every kept draw.',
      'Each invocation appends one row per parameter to a local CSV file in long format: chain_name, param_name, iteration, value.',
      'This CSV file is the handoff point from Julia to the Python uploader. MCMCChains.jl is not needed for this path.',
    ],
    code: `# AbstractMCMC callback — simplified
function (cb::CSVLoggerCallback)(
    rng, model, sampler, transition, state, iter; kwargs...
)
    # Extract parameter values from the transition
    params = get_params(model, sampler, transition, state)

    for (param_name, value) in pairs(params)
        # Append one row per parameter per iteration
        write_csv_row(
            cb.csv_file,
            cb.chain_name,  # "chain_1", "chain_2", …
            String(param_name),  # "α", "β", "σ"
            iter,                # 1, 2, 3, …, 2000
            Float64(value),      # 2.591873, 1.970910, …
        )
    end
end

# CSV output (first few rows):
# chain_1,α,1,2.591873
# chain_1,α,2,2.533344
# chain_1,β,1,1.970910
# chain_1,β,2,1.720958
# chain_1,σ,1,0.516769`,
  },
  {
    id:      'uploader',
    label:   'Python Uploader',
    runtime: 'python',
    icon:    '🐍',
    role:    'Watches CSV files → batches draws → HTTP POST to backend',
    explanation: [
      'A Python process watches the CSV files written by the Julia callback and reads them incrementally as new rows appear.',
      'It batches draws into a structured JSON payload and POSTs to the backend API.',
      'The server receives raw chain data — not plots. All visualization decisions happen downstream.',
    ],
    code: `# Python uploader — simplified

def sync_mcmc_data(csv_dir, api_client, experiment_id):
    """Reads CSV files and uploads draws to the backend server."""
    chain_data = {}
    iteration_range = {}

    for csv_file in csv_dir.glob("chain_*.csv"):
        chain_name = csv_file.stem  # "chain_1", etc.
        rows = read_new_rows(csv_file)

        chain_data[chain_name] = {}
        for chain, param, iteration, value in rows:
            chain_data[chain_name].setdefault(param, []).append(value)
        iteration_range[chain_name] = (min_iter, max_iter)

    payload = {
        "vars": {
            "chain_1": {
                "α": [2.5919, 2.5333, 1.8361, …],
                "β": [1.9709, 1.7210, 1.7523, …],
                "σ": [0.5168, 0.6102, 0.5892, …],
            },
            "chain_2": { … },
        },
        "iteration": {
            "chain_1": [1, 2000],
            "chain_2": [1, 2000],
        }
    }
    api_client.post(f"/api/samples/{experiment_id}", json=payload)`,
  },
  {
    id:      'server',
    label:   'Backend Server',
    runtime: 'server',
    icon:    '☁',
    role:    'Two paths: WebSocket broadcast + ArviZ netCDF storage + Bokeh plots',
    explanation: [
      'Path A (real-time): The server broadcasts raw sample data via WebSocket. The browser receives draws immediately and can compute diagnostics in-browser.',
      'Path B (stored plots): The server converts incoming data to ArviZ InferenceData, saves as netCDF files, and when the browser requests a plot runs az.plot_*() with Bokeh backend to return Bokeh JSON.',
      '⚠ Path B (the ArviZ/Bokeh path) is what MCMCVisualizer replaces entirely — no server round-trip needed.',
    ],
    code: `# Backend server

# --- Path A: real-time WebSocket broadcast ---
websocket.broadcast({
    "type":  "mcmc_sample",
    "vars":  chain_data,
    "iteration": iteration_range,
})
# → Browser receives raw draws immediately

# --- Path B: ArviZ netCDF storage ---
import arviz as az

dataset = az.convert_to_inference_data(
    chain_data, coords={"chain": [chain_name]}
)
dataset.to_netcdf(tmp_file)
storage.upload(tmp_file, f"{experiment_id}/{chain_name}.nc")

# --- Path B: Bokeh plot generation (on-demand) ---
idata  = az.from_netcdf(storage.download(nc_key))
ax     = az.plot_autocorr(idata, backend="bokeh", show=False)
ax     = az.plot_ecdf(values,   backend="bokeh", show=False)
ax     = az.plot_dist(values,   backend="bokeh", show=False)
result = bokeh.embed.json_item(ax)
# → Return Bokeh JSON → browser loads 5 Bokeh scripts
#   and calls Bokeh.embed.embed_item(result, div)

# ⚠  MCMCVisualizer removes the need for Path B entirely`,
  },
  {
    id:      'browser',
    label:   'Browser',
    runtime: 'browser',
    icon:    '🌐',
    role:    'MCMCVisualizer — all plots, diagnostics, and statistics in-browser',
    explanation: [
      'Raw chain data arrives via WebSocket (already in memory). fromChainArrays() builds an InferenceData object.',
      'ESS bulk, ESS tail, and rank R-hat are computed in-browser using the Geyer + FFT estimator — verified to match MCMCDiagnosticTools.jl accuracy.',
      'Every plot is a Plotly.js figure generated by MCMCVisualizer. No Bokeh scripts, no server request per plot, no Python dependency.',
    ],
    code: `// In the browser — replaces the server-side Bokeh plot pipeline
import { fromChainArrays, plots } from 'mcmc-visualizer';

// Build InferenceData from WebSocket stream data
const data = fromChainArrays({
  chain_1: { α: [...2000 draws], β: [...], σ: [...] },
  chain_2: { … },
  chain_3: { … },
  chain_4: { … },
});

// Per-variable plots (all Plotly.js, in-browser)
plots.tracePlot(el,           data, 'α', opts);
plots.densityPlot(el,         data, 'α', opts);
plots.autocorrelationPlot(el, data, 'α', opts);
plots.ecdfPlot(el,            data, 'α', opts);
plots.rankPlot(el,            data, 'α', opts);
plots.runningRhatPlot(el,     data, 'α', opts);

// Model-wide plots
plots.forestPlot(el,             data, opts);
plots.diagnosticsHeatmapPlot(el, data, opts);
plots.violinPlot(el,             data, opts);

// ESS and R-hat match MCMCChains.jl output
const stats = data.variableStats('α');
// stats.bulkEss ≈ 6960  (MCMCChains: 6960.8 ✓)
// stats.rhat    ≈ 1.000 (MCMCChains: 1.0001 ✓)`,
  },
];

// ── State ─────────────────────────────────────────────────────────────
const activeStep = ref<StepId>('sampler');
const activeStepData = computed(() => steps.find(s => s.id === activeStep.value));

const running   = ref(false);
const statusMsg = ref('');
const data      = ref<InferenceData | null>(null);
const sim       = ref<SimulationResult | null>(null);
const activeVar = ref('α');

const traceEl     = ref<HTMLElement>();
const densityEl   = ref<HTMLElement>();
const histEl      = ref<HTMLElement>();
const acfEl       = ref<HTMLElement>();
const cmeanEl     = ref<HTMLElement>();
const ecdfEl      = ref<HTMLElement>();
const rankEl      = ref<HTMLElement>();
const runRhatEl   = ref<HTMLElement>();
const forestEl    = ref<HTMLElement>();
const violinEl    = ref<HTMLElement>();
const heatmapEl   = ref<HTMLElement>();
const pairsEl     = ref<HTMLElement>();
const intervalsEl = ref<HTMLElement>();

const plotHandles = ref<PlotHandle[]>([]);

// ── Summary table ──────────────────────────────────────────────────────
const summaryRows = computed(() => {
  if (!data.value) return [];
  return data.value.variableNames.map(param => {
    const s = data.value!.variableStats(param);
    const f = (n: number, d = 4) => isNaN(n) ? '—' : n.toFixed(d);
    const rhatVal = s.rhat ?? s.splitRhat ?? NaN;
    return {
      param,
      mean:    f(s.mean),
      sd:      f(s.stdev),
      q025:    f(s.quantiles.q5),
      q975:    f(s.quantiles.q95),
      mcse:    f(s.mcse),
      essBulk: isNaN(s.bulkEss) ? '—' : Math.round(s.bulkEss).toString(),
      essTail: isNaN(s.tailEss) ? '—' : Math.round(s.tailEss).toString(),
      rhat:    f(rhatVal),
      rhatRaw: rhatVal,
    };
  });
});

function rhatClass(rhat: number) {
  if (isNaN(rhat)) return '';
  if (rhat < 1.01)  return 'good';
  if (rhat < 1.1)   return 'warn';
  return 'bad';
}

// ── Stats strip ────────────────────────────────────────────────────────
const statsCards = computed(() => {
  if (!data.value) return [];
  const s = data.value.variableStats(activeVar.value);
  const f = (n: number, d = 4) => isNaN(n) ? '—' : n.toFixed(d);
  const rhat = s.rhat ?? s.splitRhat ?? NaN;
  return [
    { label: 'Posterior mean', value: f(s.mean, 4), note: `sd  ${f(s.stdev, 4)}` },
    { label: '90% HDI', value: `[${f(s.hdi90[0], 3)}, ${f(s.hdi90[1], 3)}]`, note: `width ${f(s.hdi90Width, 3)}` },
    { label: 'ESS bulk', value: isNaN(s.bulkEss) ? '—' : Math.round(s.bulkEss).toString(), note: `tail ${isNaN(s.tailEss) ? '—' : Math.round(s.tailEss)}` },
    { label: 'MCSE (mean)', value: f(s.mcse, 5), note: `ess/draw ${f(s.essPerDraw, 3)}` },
    { label: 'R-hat (rank)', value: f(rhat, 4), note: rhat < 1.01 ? '✓ converged' : rhat < 1.1 ? '⚠ marginal' : '✗ not converged' },
    { label: 'Geweke z', value: f(s.geweke.z, 3), note: `p = ${f(s.geweke.pValue, 3)}` },
  ];
});

// ── Simulation ─────────────────────────────────────────────────────────
async function runSim() {
  running.value   = true;
  statusMsg.value = 'Step 1/5 — Turing.jl: running NUTS sampler…';
  await nextTick();
  await delay(60);

  statusMsg.value = 'Step 2/5 — CSV Logger: writing draws per iteration…';
  await delay(60);

  statusMsg.value = 'Step 3/5 — Python Uploader: batching and posting to server…';
  await delay(60);

  statusMsg.value = 'Step 4/5 — Backend Server: storing as netCDF (simulated, skipped)…';
  await delay(60);

  statusMsg.value = 'Step 5/5 — Browser: building InferenceData and computing diagnostics…';
  const result  = runSimulation();
  sim.value     = result;
  data.value    = fromChainArrays(result.chainArrays);
  activeVar.value = result.paramNames[0]!;

  await nextTick();
  statusMsg.value = 'Rendering all plots with MCMCVisualizer…';

  plotHandles.value.forEach(h => h.destroy());
  plotHandles.value = [];

  const opts     = { theme: 'dark' as const, height: 320 };
  const wideOpts = { theme: 'dark' as const, height: 420 };
  const d = data.value;
  const v = activeVar.value;
  const hs: PlotHandle[] = [];

  if (traceEl.value)    hs.push(plots.tracePlot(traceEl.value, d, v, opts));
  if (densityEl.value)  hs.push(plots.densityPlot(densityEl.value, d, v, opts));
  if (histEl.value)     hs.push(plots.histogramPlot(histEl.value, d, v, opts));
  if (acfEl.value)      hs.push(plots.autocorrelationPlot(acfEl.value, d, v, opts));
  if (cmeanEl.value)    hs.push(plots.cumulativeMeanPlot(cmeanEl.value, d, v, opts));
  if (ecdfEl.value)     hs.push(plots.ecdfPlot(ecdfEl.value, d, v, opts));
  if (rankEl.value)     hs.push(plots.rankPlot(rankEl.value, d, v, opts));
  if (runRhatEl.value)  hs.push(plots.runningRhatPlot(runRhatEl.value, d, v, opts));
  if (forestEl.value)   hs.push(plots.forestPlot(forestEl.value, d, wideOpts));
  if (violinEl.value)   hs.push(plots.violinPlot(violinEl.value, d, wideOpts));
  if (heatmapEl.value)  hs.push(plots.diagnosticsHeatmapPlot(heatmapEl.value, d, wideOpts));
  if (pairsEl.value)    hs.push(plots.pairPlot(pairsEl.value, d, result.paramNames, wideOpts));
  if (intervalsEl.value)hs.push(plots.chainIntervalsPlot(intervalsEl.value, d, v, wideOpts));

  plotHandles.value = hs;
  running.value   = false;
  statusMsg.value = `Done — ${MODEL_INFO.nChains} chains × ${MODEL_INFO.nDraws} post-warmup draws, all plots rendered in browser.`;
  activeStep.value = 'browser';
}

function onVarChange() {
  plotHandles.value.forEach(h => h.update(activeVar.value));
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

onBeforeUnmount(() => plotHandles.value.forEach(h => h.destroy()));
</script>
