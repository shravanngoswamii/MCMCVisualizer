# Integrating MCMCVisualizer into the bayes app

This document covers exactly what to change to replace the ArviZ + Bokeh
server-side plot pipeline with MCMCVisualizer running entirely in the browser.

---

## What changes

| Current (server-side) | Replacement (browser) |
|---|---|
| `az.convert_to_inference_data()` → netCDF on S3 | Chain data already in memory from WebSocket |
| `az.plot_autocorr/ecdf/dist/dot()` with Bokeh backend | `plots.autocorrelationPlot/ecdfPlot/densityPlot()` |
| `bokeh.embed.json_item()` → HTTP response | Direct Plotly render into DOM element |
| `Bokeh.embed.embed_item()` + 5 Bokeh script tags | Nothing — Plotly is already a dependency |
| `ArvizPlotsPanel.tsx` | New panel using `plots.*` from this package |

Nothing changes in the server or sampling pipeline. Only `ArvizPlotsPanel.tsx`
and the `fetchArvizPlotNext` call that triggers it are replaced.

---

## Installation

```bash
npm install mcmc-visualizer
```

Plotly.js must be available. If already loaded via CDN, skip this. Otherwise:

```bash
npm install plotly.js-dist-min
```

Then expose it globally once at app startup (e.g. in `main.tsx`):

```ts
import Plotly from 'plotly.js-dist-min';
(window as Record<string, unknown>).Plotly = Plotly;
```

---

## Loading chain data

The bayes app receives chain data via WebSocket as:

```ts
{
  vars: { chain_1: { "θ[1]/val": [2.1, 2.3, ...], "acceptance_rate/val": [...] } },
  iteration: { chain_1: [1, 2000] }
}
```

Build an `InferenceData` object from this:

```ts
import { fromChainArrays } from 'mcmc-visualizer';

// Called when WebSocket message arrives with new batch
function onSampleData(payload: SamplePayload) {
  const chainArrays: Record<string, Record<string, number[]>> = {};

  for (const [chainName, vars] of Object.entries(payload.vars)) {
    chainArrays[chainName] = {};
    for (const [varName, values] of Object.entries(vars)) {
      // include /val variables; skip /stats (OnlineStats entries)
      if (varName.endsWith('/val')) {
        chainArrays[chainName][varName] = values;
      }
    }
  }

  return fromChainArrays(chainArrays);
}
```

> **Variable names:** The app stores draws as `θ[1]/val`, `acceptance_rate/val`, etc.
> Pass these names as-is to all plot functions. The `/val` suffix is just a string —
> MCMCVisualizer treats it as any other variable name.

---

## Theming

MCMCVisualizer ships with a pre-built theme that matches the bayes app's
dark design system exactly — same background colors, grid colors, and the
distinctipy chain palette already used across the app.

```ts
import { plots, BAYES_DARK_THEME } from 'mcmc-visualizer';

plots.tracePlot(container, data, 'θ[1]/val', {
  theme:  BAYES_DARK_THEME,
  height: 300,
});
```

For custom control, `theme` accepts a `CustomTheme` object:

```ts
import type { CustomTheme } from 'mcmc-visualizer';

const myTheme: CustomTheme = {
  paper_bgcolor: 'transparent',    // inherit app background
  plot_bgcolor:  'transparent',
  font:          { color: '#FFFFFF', family: 'Inter, system-ui' },
  gridcolor:     '#7C7C7C',
  chainColors:   ['#1E6759', '#2894b2', '#ff8000', '#0080ff'],
};
```

`chainColors` maps directly to `chainColorForIndex` from the app's existing
`chainColorList.ts`. The same index ordering is preserved.

---

## Rendering plots

All plot functions share the same signature:

```ts
plots.<name>(container: HTMLElement, data: InferenceData, variable?: string, options?)
```

They return a `PlotHandle` with two methods: `update(variable?)` to switch the
active variable without recreating the plot, and `destroy()` to clean up.

### Replace `ArvizPlotsPanel.tsx`

The current panel fires `fetchArvizPlotNext()` per variable × chain to retrieve
Bokeh JSON from the server. Replace the entire component:

```tsx
import { useEffect, useRef } from 'react';
import { plots, BAYES_DARK_THEME } from 'mcmc-visualizer';
import type { InferenceData, PlotHandle } from 'mcmc-visualizer';

interface Props {
  data: InferenceData;
  variable: string;
}

export function MCMCPlotsPanel({ data, variable }: Props) {
  const autocorrRef = useRef<HTMLDivElement>(null);
  const ecdfRef     = useRef<HTMLDivElement>(null);
  const densityRef  = useRef<HTMLDivElement>(null);

  const handles = useRef<PlotHandle[]>([]);
  const opts    = { theme: BAYES_DARK_THEME, height: 400 };

  useEffect(() => {
    handles.current.forEach(h => h.destroy());
    handles.current = [];
    if (!autocorrRef.current || !ecdfRef.current || !densityRef.current) return;

    handles.current = [
      plots.autocorrelationPlot(autocorrRef.current, data, variable, opts),
      plots.ecdfPlot(ecdfRef.current,     data, variable, opts),
      plots.densityPlot(densityRef.current, data, variable, opts),
    ];

    return () => { handles.current.forEach(h => h.destroy()); };
  }, [data]);

  // When only the variable changes, update without full re-render
  useEffect(() => {
    handles.current.forEach(h => h.update(variable));
  }, [variable]);

  return (
    <div>
      <div ref={autocorrRef} />
      <div ref={ecdfRef} />
      <div ref={densityRef} />
    </div>
  );
}
```

No loading state, no HTTP request, no Bokeh scripts needed.

### All available plot functions

**Per-variable** (require a `variable` argument):

| Function | Replaces ArviZ |
|---|---|
| `plots.tracePlot` | — (already exists in app as SequencePlot) |
| `plots.autocorrelationPlot` | `az.plot_autocorr` |
| `plots.ecdfPlot` | `az.plot_ecdf` |
| `plots.densityPlot` | `az.plot_dist` |
| `plots.histogramPlot` | — |
| `plots.rankPlot` | — |
| `plots.runningRhatPlot` | — |
| `plots.cumulativeMeanPlot` | — |
| `plots.chainIntervalsPlot` | — |

**Model-wide** (no variable argument, operate on all variables):

| Function | Notes |
|---|---|
| `plots.forestPlot` | Mean + HDI for every parameter |
| `plots.violinPlot` | Posterior distribution per parameter |
| `plots.diagnosticsHeatmapPlot` | ESS bulk, ESS tail, R-hat grid |
| `plots.pairPlot` | Scatter matrix for parameter correlations |
| `plots.energyPlot` | HMC energy diagnostic — uses `hamiltonian_energy/val` |
| `plots.summaryTable` | HTML table rendered into the container |

---

## Computing diagnostics

`variableStats(varName)` computes all diagnostics for one variable across all
chains. Use the `/val` variable name:

```ts
const stats = data.variableStats('θ[1]/val');

stats.mean        // posterior mean
stats.stdev       // posterior SD
stats.hdi90       // [lower, upper] — 90% highest density interval
stats.bulkEss     // ESS bulk (Geyer estimator, matches MCMCChains.jl)
stats.tailEss     // ESS tail
stats.rhat        // rank R-hat (Vehtari et al. 2021, matches MCMCChains.jl)
stats.mcse        // Monte Carlo standard error of the mean
stats.geweke      // { z, pValue } — Geweke convergence test
stats.quantiles   // { q5, q25, q50, q75, q95 }
```

For the summary table shown across all parameters:

```ts
const rows = data.summary();
// rows: VariableSummary[] — one entry per variable
// each has all fields from variableStats plus .variable (the name)
```

**Accuracy:** ESS bulk and R-hat have been verified against MCMCChains.jl output
on 4 chains × 2000 draws. Differences are < 2 units for ESS and < 0.0001 for R-hat.
See `dev/compare.mjs` for the verification script.

---

## Filtering variables

The app has model parameters (`θ[1]/val`…`θ[N]/val`), HMC internals
(`acceptance_rate/val`, `hamiltonian_energy/val`, etc.), and OnlineStats
statistics (`θ[1]/stats[key]/stats/1/μ`, etc.).

```ts
// Model parameters only (for forest/violin/heatmap)
const modelVars = data.variableNames.filter(
  v => v.endsWith('/val') && !HMC_INTERNAL_NAMES.includes(v.replace('/val', ''))
);
const modelData = data.filterVariables(modelVars);
plots.forestPlot(el, modelData, opts);

// HMC internals
const HMC_INTERNAL_NAMES = [
  'acceptance_rate', 'hamiltonian_energy', 'hamiltonian_energy_error',
  'is_accept', 'log_density', 'max_hamiltonian_energy_error',
  'n_steps', 'nom_step_size', 'numerical_error', 'step_size', 'tree_depth',
];
```

---

## Removing ArviZ from the stack

Once the new panel is shipping, the following can be removed:

**Frontend (`bayes/src`):**
- `component/ArvizPlotsPanel.tsx` — delete
- The 5 Bokeh script tags in the HTML entry point
- `fetchArvizPlotNext` call and its `MARVIZPLOT` action type
- `arvizData` field in `ExperimentReducer.ts` and `InferState.ts`

**Backend (`serverless-functions`):**
- `common/arviz_plot.py` — no longer called by any frontend client
- `common/merge_az_files.py` — only used by `arviz_plot.py`
- `arviz_draw/` directory if it only serves plot requests

**`sample_saver.py`** can remain unchanged — it saves netCDF for archival
and other future uses. The browser no longer reads from it.

**Python dependencies** that become unused: `arviz`, `bokeh`, `boto3` (if
only used for plot cache on S3).

---

## What MCMCVisualizer does not replace

The following still require server-side Julia/Python:

- **Advanced convergence tests** — Heidelberger-Welch, Raftery-Lewis, R-star
  (random forest-based). Use MCMCDiagnosticTools.jl server-side when needed.
- **WAIC / LOO** — model comparison metrics that require full log-likelihood arrays.
- **Posterior predictive checks** — require model-specific re-simulation.

For standard MCMC monitoring (trace, density, autocorrelation, ESS, R-hat,
MCSE, forest plots), MCMCVisualizer covers everything the ArviZ backend was
providing.
