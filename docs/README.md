# MCMCVisualizer

A TypeScript library for parsing, analyzing, visualizing, and exporting MCMC sampling data. Works in browsers, Node.js, and from the command line. Zero runtime dependencies for all core functionality; Plotly.js is an optional peer dependency used only for DOM rendering.

---

## Table of Contents

1. [Installation](#installation)
2. [Architecture Overview](#architecture-overview)
3. [Data Model](#data-model)
4. [Loading Data](#loading-data)
   - [fromChainArrays](#fromchainarrays)
   - [fromTuringCSV](#fromturingcsv)
   - [fromStanCSV / fromStanCSVFiles](#fromstancsv--fromstancsvfiles)
   - [fromMCMCChainsJSON](#frommcmcchainsjson)
   - [fromArviZJSON](#fromarviZjson)
   - [fromAutoDetect](#fromautodetect)
5. [InferenceData Interface](#inferencedata-interface)
   - [Reading chains and variables](#reading-chains-and-variables)
   - [Filtering and slicing](#filtering-and-slicing)
   - [Computing statistics](#computing-statistics)
6. [Statistics Reference](#statistics-reference)
   - [Per-chain (SequenceStats)](#per-chain-sequencestats)
   - [Per-variable (VariableStats)](#per-variable-variablestats)
   - [summary()](#summary)
7. [Functional Statistics API](#functional-statistics-api)
8. [Plots](#plots)
   - [Plot architecture (three layers)](#plot-architecture-three-layers)
   - [Theming](#theming)
   - [Plot catalogue](#plot-catalogue)
9. [CLI Tool](#cli-tool)
10. [Exporting Data](#exporting-data)
11. [Auto-detection](#auto-detection)
12. [Known Limitations](#known-limitations)

---

## Installation

```bash
npm install mcmc-visualizer
# Optional: needed only for DOM rendering (tracePlot, densityPlot, etc.)
npm install plotly.js-dist-min
```

For browser use via CDN:
```html
<script src="https://cdn.plot.ly/plotly-2.35.0.min.js"></script>
<script type="module">
  import { fromTuringCSV, plots } from 'mcmc-visualizer';
</script>
```

---

## Architecture Overview

The package is split into four independent layers. You can use any layer without depending on the ones above it.

```
┌─────────────────────────────────────────────────────────────┐
│  CLI (mcmc summary / diagnose / ess / rhat / convert / plot)│
├─────────────────────────────────────────────────────────────┤
│  Visualization layer  (plots/*)                             │
│  • get*PlotData()   — pure data extraction, no Plotly       │
│  • *PlotSpec()      — Plotly JSON spec, no DOM              │
│  • *Plot()          — DOM adapter, requires Plotly.js       │
├─────────────────────────────────────────────────────────────┤
│  InferenceData / MCMCData                                   │
│  • sequenceStats()  variableStats()  summary()              │
├─────────────────────────────────────────────────────────────┤
│  Parsers                    │  Stats (functional)           │
│  fromTuringCSV              │  computeESS / computeRhat     │
│  fromStanCSV[Files]         │  computeMCSE / computeGeweke  │
│  fromMCMCChainsJSON         │  computeHDI / computeQuantiles│
│  fromArviZJSON              │  computeStdev / computeMean   │
│  fromChainArrays            │  + FFT, special math fns      │
└─────────────────────────────────────────────────────────────┘
```

**Build outputs** (via tsup):
- `dist/index.js` — ESM, browser + Node, `platform: neutral`, ES2020
- `dist/index.cjs` — CommonJS, browser + Node
- `dist/cli/index.cjs` — Node.js CLI binary (all dependencies bundled)
- `dist/index.d.ts` — TypeScript declarations

---

## Data Model

### ChainData

The atomic unit. One object per MCMC chain.

```ts
interface ChainData {
  readonly name: string;                        // e.g. "chain#1"
  readonly draws: ReadonlyMap<string, Float64Array>;  // variable → samples
  readonly drawCount: number;                   // max length across variables
}
```

All numeric draws are stored as `Float64Array` for memory efficiency.

### InferenceData

The top-level container returned by every `from*` function and implemented by `MCMCData`.

```ts
interface InferenceData {
  readonly chains: ReadonlyMap<string, ChainData>;
  readonly variableNames: string[];
  readonly chainNames: string[];
  readonly drawCount: number;   // max draws across all chains

  // Data access
  getDraws(variable: string, chain?: string): Float64Array;
  getAllDraws(variable: string): Float64Array;

  // Statistics (computed on each call — not cached)
  sequenceStats(variable: string, chain: string): SequenceStats;
  variableStats(variable: string): VariableStats;
  summary(): VariableSummary[];

  // Immutable transformations (return new InferenceData)
  slice(start: number, end?: number): InferenceData;
  filterChains(chainNames: string[]): InferenceData;
  filterVariables(variableNames: string[]): InferenceData;
}
```

`MCMCData` is the concrete class that implements `InferenceData`. You never need to construct it directly — use the `from*` loader functions.

---

## Loading Data

### fromChainArrays

The lowest-friction entry point. Pass data you already have in memory.

```ts
import { fromChainArrays } from 'mcmc-visualizer';

const data = fromChainArrays({
  'chain#1': {
    mu:    [1.2, 1.3, 1.1, 1.4, ...],
    sigma: [0.5, 0.6, 0.5, 0.7, ...],
  },
  'chain#2': {
    mu:    [1.0, 1.5, 1.2, 1.3, ...],
    sigma: [0.4, 0.5, 0.6, 0.5, ...],
  },
});
```

Use this when receiving data from a WebSocket stream or any custom sampler.

### fromTuringCSV

Parses CSV files produced by Turing.jl / Coinfer.jl. Three sub-formats are auto-detected:

**Long format** (Coinfer.jl native output):
```
chain_name,var_name,draw,var_value
chain#1,mu,0,1.234
chain#1,mu,1,1.456
chain#1,sigma,0,0.512
```

**Wide format — iteration/chain header**:
```
iteration,chain,mu,sigma
1,chain#1,1.234,0.512
2,chain#1,1.456,0.531
```

**Wide format — chain_/draw_ header** (Turing.jl default CSV export):
```
chain_,draw_,mu,sigma
chain#1,1,1.234,0.512
chain#1,2,1.456,0.531
chain#2,1,1.101,0.490
```

```ts
import { fromTuringCSV } from 'mcmc-visualizer';
const data = fromTuringCSV(csvText);
```

### fromStanCSV / fromStanCSVFiles

Parses Stan's CSV output format. Comment lines starting with `#` are skipped. Internal variables ending in `__` (e.g. `lp__`, `accept_stat__`, `divergent__`, `treedepth__`) are automatically excluded from the parameter set.

Stan dot-notation is converted to bracket notation: `theta.1.2` → `theta[1,2]`.

```ts
import { fromStanCSV, fromStanCSVFiles } from 'mcmc-visualizer';

// Single file = single chain
const single = fromStanCSV(fileText);

// Multiple files = one chain per file, named chain#1, chain#2, ...
const multi = fromStanCSVFiles([file1Text, file2Text, file3Text, file4Text]);
```

### fromMCMCChainsJSON

Parses the JSON export from MCMCChains.jl. The format is a 3D flat array with shape metadata:

```json
{
  "size": [1000, 3, 4],
  "value_flat": [...],
  "parameters": ["mu", "sigma", "tau"],
  "chains": [1, 2, 3, 4],
  "name_map": { "internals": ["lp"] }
}
```

Parameters listed in `name_map.internals` are excluded automatically.

```ts
import { fromMCMCChainsJSON } from 'mcmc-visualizer';
const data = fromMCMCChainsJSON(jsonText);
```

### fromArviZJSON

Parses the JSON output from Python's ArviZ (`az.to_json()`). Compatible with PyMC, NumPyro, Stan (via ArviZ), and Turing.jl (via ArviZ.jl). Multi-dimensional parameters (matrices, tensors) are flattened: `theta[0][1]` → `theta[0,1]`.

Only the `posterior` group is loaded by default. Use `parseArviZJSON()` to access all groups (posterior, prior, sample_stats, etc.).

```ts
import { fromArviZJSON, parseArviZJSON } from 'mcmc-visualizer';

// Posterior group only
const data = fromArviZJSON(jsonStringOrObject);

// All groups — returns Map<string, InferenceData>
const allGroups = parseArviZJSON(jsonStringOrObject);
const posterior = allGroups.get('posterior');
const sampleStats = allGroups.get('sample_stats');
```

### fromAutoDetect

Tries all text-based formats in priority order and throws if none match. ArviZ JSON is not included in auto-detection — use `fromArviZJSON()` explicitly.

Priority: MCMCChains JSON → Stan CSV → Turing CSV (wide) → Turing CSV (long)

```ts
import { fromAutoDetect } from 'mcmc-visualizer';
const data = fromAutoDetect(text);  // throws if format unknown
```

---

## InferenceData Interface

### Reading chains and variables

```ts
// List all chain names and variable names
data.chainNames;     // ['chain#1', 'chain#2', ...]
data.variableNames;  // ['mu', 'sigma', 'tau', ...]
data.drawCount;      // number of samples (max across chains)

// Get samples for a variable in a specific chain
const muChain1: Float64Array = data.getDraws('mu', 'chain#1');

// Get all samples for a variable, all chains concatenated
const allMu: Float64Array = data.getAllDraws('mu');
```

### Filtering and slicing

All transformation methods return **new** `InferenceData` instances. The original is not mutated.

```ts
// Discard first 200 draws (warm-up / burn-in)
const withoutWarmup = data.slice(200);

// Slice a range [start, end)
const window = data.slice(100, 600);

// Keep only selected variables
const paramsOnly = data.filterVariables(['mu', 'sigma']);

// Keep only selected chains
const twoChains = data.filterChains(['chain#1', 'chain#2']);

// Chain filtering and slicing together
const clean = data.slice(500).filterVariables(['mu']).filterChains(['chain#1']);
```

### Computing statistics

Statistics are computed on every call — results are not cached internally.

```ts
// Per-chain statistics for one variable
const seqStats = data.sequenceStats('mu', 'chain#1');

// Aggregated multi-chain statistics for one variable
const varStats = data.variableStats('mu');

// Full summary table (all variables × all stats)
const table: VariableSummary[] = data.summary();
```

---

## Statistics Reference

### Per-chain (SequenceStats)

Returned by `data.sequenceStats(variable, chain)`.

| Field | Type | Description |
|---|---|---|
| `mean` | `number` | Arithmetic mean |
| `stdev` | `number` | Standard deviation *(see note below)* |
| `count` | `number` | Number of draws |
| `ess` | `number` | ESS via FFT-based Geyer monotone estimator (single chain) |
| `essPerDraw` | `number` | `ess / count` |
| `mcse` | `number` | MCSE = `stdev / √ess` |
| `skewness` | `number` | Standardized third central moment |
| `excessKurtosis` | `number` | Standardized fourth central moment minus 3 |
| `autocorrelation` | `number[]` | Autocorrelation values at lags 0, 1, 2, ... (from FFT) |

> **Note on standard deviation:** The current implementation divides by `n` (population SD), not `n-1` (sample SD). For typical MCMC chains (n ≥ 500) the difference is negligible, but this is technically a biased estimator. Skewness and kurtosis inherit this.

### Per-variable (VariableStats)

Returned by `data.variableStats(variable)`. Aggregates across all chains.

| Field | Type | Description |
|---|---|---|
| `mean` | `number` | Grand mean across all chains |
| `stdev` | `number` | SD of all draws pooled |
| `count` | `number` | Total draws across all chains |
| `ess` | `number` | Sum of single-chain ESS values |
| `essPerDraw` | `number` | `ess / count` |
| `mcse` | `number` | Multi-chain MCSE via bulk ESS |
| `bulkEss` | `number` | Rank-normalized bulk ESS (Vehtari 2021) |
| `tailEss` | `number` | Tail ESS for extremes (Vehtari 2021) |
| `rhat` | `number \| undefined` | Rank-normalized R-hat = max(bulk, tail). `undefined` if < 2 chains |
| `splitRhat` | `number \| undefined` | Simple split R-hat (separate implementation) |
| `geweke` | `{ z, pValue }` | Geweke convergence test on pooled draws |
| `skewness` | `number` | Skewness of all draws pooled |
| `excessKurtosis` | `number` | Excess kurtosis of all draws pooled |
| `quantiles` | `{ q5, q25, q50, q75, q95 }` | Posterior quantiles |
| `hdi90` | `[number, number]` | 90% Highest Density Interval |
| `hdi90Width` | `number` | Width of the 90% HDI |

### summary()

Returns `VariableSummary[]` — one row per variable, each row is `{ variable: string } & VariableStats`. This is the data source for `summaryTable()` and the `mcmc summary` CLI command.

```ts
const rows = data.summary();
// rows[0] = { variable: 'mu', mean: 1.23, rhat: 1.001, bulkEss: 4523, ... }
```

---

## Functional Statistics API

All stat functions are also exported individually and operate on raw `Float64Array` inputs. Use these when you don't want to go through `InferenceData`, or when building custom diagnostics.

```ts
import {
  computeMean, computeStdev, computeQuantiles, computeHDI,
  computeSkewness, computeExcessKurtosis,
  computeESS, computeEssBulk, computeEssTail, computeEssBasic,
  computeRhat,
  computeMCSE, computeMCSEMultiChain, computeMCSEQuantile, computeMCSEStd,
  computeGeweke,
  computeSplitRhat,
} from 'mcmc-visualizer';

// Single-chain ESS
const { ess, autocorrelation } = computeESS(draws);

// Multi-chain bulk/tail ESS — pass array of Float64Arrays (one per chain)
const bulkEss = computeEssBulk([chain1, chain2, chain3, chain4]);
const tailEss = computeEssTail([chain1, chain2, chain3, chain4]);

// Rank-normalized R-hat
const rhat = computeRhat([chain1, chain2, chain3, chain4], 'rank');
//                                                          ↑ 'rank' | 'bulk' | 'tail' | 'basic'

// MCSE variants
const mcseMean     = computeMCSE(singleChain);
const mcseMulti    = computeMCSEMultiChain([c1, c2, c3, c4]);
const mcseQ95      = computeMCSEQuantile(draws, 0.95, effectiveSS);
const mcseStd      = computeMCSEStd([c1, c2, c3, c4]);

// Geweke test
const { z, pValue } = computeGeweke(draws);

// Descriptive
const { q5, q25, q50, q75, q95 } = computeQuantiles(draws);
const [lo, hi] = computeHDI(draws, 0.9);
```

### Algorithm details

| Function | Algorithm | Reference |
|---|---|---|
| `computeESS` | Geyer monotone sequence estimator; autocorrelation via radix-2 / Bluestein FFT | Geyer 1992 |
| `computeEssBulk` | Rank-normalized ESS with Geyer estimator + antithetic correction on split chains | Vehtari et al. 2021 |
| `computeEssTail` | ESS on quantile indicator functions (lower + upper 5%) | Vehtari et al. 2021 |
| `computeRhat("rank")` | max(bulk, tail) Rhat; Blom rank transform $(r-0.375)/(N+0.25)$ then probit | Vehtari et al. 2021 |
| `computeRhat("tail")` | Fold around median → rank normalize → Gelman-Rubin | Vehtari et al. 2021 |
| `computeMCSE` | `SD / √ESS` | Standard |
| `computeMCSEQuantile` | Beta$(α,β)$ inverse CDF with $α = \text{ESS} \cdot p + 1$ | Flegal & Jones 2011 |
| `computeMCSEStd` | Delta method on proxy $(x - \mu)^2$ | Standard |
| `computeGeweke` | Spectral z-test; linear Bartlett window; first 10% vs last 50% | Geweke 1991 |
| `computeHDI` | Sliding window: shortest interval containing `ceil(mass × n)` sorted draws | Standard |
| `computeQuantiles` | Linear interpolation at fractional positions | Standard |

---

## Plots

### Plot architecture (three layers)

Every plot type has up to three entry points that you can use independently:

```
get*PlotData(data, variable, opts?)  →  plain data object (no Plotly dep)
*PlotSpec(data, variable, opts?)     →  { data, layout, config } Plotly JSON (no DOM)
*Plot(element, data, variable, opts?) →  PlotHandle  (requires Plotly.js in scope)
```

**`get*PlotData`** — Returns a typed plain object (e.g. `TracePlotData`). Use this when you want to render with a different library (D3, Observable Plot, etc.) or run headlessly in Node.js.

**`*PlotSpec`** — Returns a complete Plotly JSON specification. Use this to send plots to a headless renderer, store specs, or embed in a non-React app. No DOM or Plotly required.

**`*Plot`** — Renders directly into a DOM element using Plotly.js. Returns a `PlotHandle`:

```ts
interface PlotHandle {
  destroy(): void;              // Remove the plot and clean up
  update(variable?: string): void;  // Re-render with a different variable
}
```

Plotly.js is resolved at runtime: first checks `globalThis.Plotly` (browser CDN), then tries `require('plotly.js-dist-min')` (Node.js). Throws a descriptive error if neither is available.

### Theming

All plot functions accept an `opts` parameter of type `PlotOptions`:

```ts
interface PlotOptions {
  height?: number;
  width?: number;
  theme?: 'dark' | 'light' | CustomTheme;  // default: 'dark'
}
```

**Built-in themes:**
- `'dark'` — Dark background (`#181b26` paper, `#13151e` plot area), light text
- `'light'` — White background, dark text
- `BAYES_DARK_THEME` — Transparent backgrounds to inherit from parent, matches the Coinfer app design system

**Custom theme:**

```ts
import type { CustomTheme } from 'mcmc-visualizer';

const myTheme: CustomTheme = {
  paper_bgcolor: 'transparent',
  plot_bgcolor: '#0d1117',
  font: { color: '#e6edf3', family: 'JetBrains Mono, monospace', size: 11 },
  gridcolor: '#21262d',
  zerolinecolor: '#30363d',
  chainColors: ['#58a6ff', '#3fb950', '#f78166', '#d2a8ff'],
};

plots.tracePlot(el, data, 'mu', { theme: myTheme });
```

**Default chain color palette** (Plotly):
`#636EFA`, `#EF553B`, `#00CC96`, `#AB63FA`, `#FFA15A`, `#19D3F3`, `#FF6692`, `#B6E880`

### Plot catalogue

All plots are accessed via `import { plots } from 'mcmc-visualizer'` or individually.

---

#### `tracePlot` — Chain trace

Shows sample values over iterations. One line per chain.

```ts
plots.tracePlot(element, data, 'mu', opts);
plots.tracePlotSpec(data, 'mu', opts);   // Plotly JSON spec
plots.getTracePlotData(data, 'mu', opts); // TracePlotData
```

X-axis: iteration index. Y-axis: draw value. Separate line per chain with chain colors.

---

#### `densityPlot` — Kernel density estimate

Kernel density estimation per chain using Gaussian kernel. Filled area under each curve.

```ts
plots.densityPlot(element, data, 'mu', opts);
plots.getDensityPlotData(data, 'mu', opts);  // DensityPlotData (no spec fn)
```

Bandwidth: `0.9 × min(SD, IQR/1.34) × n^(-1/5)` (Silverman's rule). 200 evaluation points. Opacity 0.4 fill, full-opacity stroke.

---

#### `histogramPlot` — Overlaid histograms

Overlaid histograms of raw draws, one per chain. `barmode: 'overlay'`, opacity 0.6.

```ts
plots.histogramPlot(element, data, 'mu', opts);
plots.getHistogramPlotData(data, 'mu', opts);
```

---

#### `ecdfPlot` — Empirical CDF

Step function of sorted draws vs cumulative probability. One trace per chain.

```ts
plots.ecdfPlot(element, data, 'mu', opts);
plots.getEcdfPlotData(data, 'mu', opts);
```

Y-axis range: [0, 1].

---

#### `autocorrelationPlot` — ACF plot

Bar chart of autocorrelation at lags 0–50. One series per chain.

```ts
plots.autocorrelationPlot(element, data, 'mu', opts);
plots.getAutocorPlotData(data, 'mu', opts);
```

Uses direct lag formula (not FFT). Horizontal reference line at 0.

---

#### `cumulativeMeanPlot` — Running mean

Shows how the posterior mean estimate stabilizes as draws accumulate. One line per chain.

```ts
plots.cumulativeMeanPlot(element, data, 'mu', opts);
plots.getCumMeanPlotData(data, 'mu', opts);
```

---

#### `rankPlot` — Rank histogram

Normalizes all draws to [0,1] rank space, plots as histogram. Shows whether chains explore the same region uniformly. A well-mixed chain should produce a flat histogram.

```ts
plots.rankPlot(element, data, 'mu', opts);
plots.getRankPlotData(data, 'mu', opts);
```

20 bins. Horizontal reference line at expected count = `totalN / nChains / nBins`.

---

#### `runningRhatPlot` — Running R-hat

Computes R-hat at increasingly longer prefixes of the chains. Convergence is achieved when it stabilizes below 1.01.

```ts
plots.runningRhatPlot(element, data, 'mu', opts);
plots.getRunningRhatData(data, 'mu', opts);
```

Down-sampled to ~200 points. Reference lines: 1.0 (green dashed), 1.05 (red dashed).

---

#### `violinPlot` — Violin plots

Distribution shape for all variables in one plot. Includes median marker and mean dot. `spanmode: 'soft'`.

```ts
plots.violinPlot(element, data, opts);  // Note: no variable argument — shows all variables
```

Height auto-scales with the number of variables.

---

#### `forestPlot` — Forest plot

Multi-variable summary with mean (diamond) and credible intervals. One row per variable.

```ts
plots.forestPlot(element, data, opts);
plots.getForestPlotData(data, opts);
```

- Diamond width is color-coded by R-hat (green < 1.01, yellow < 1.1, red ≥ 1.1)
- Outer error bars: 90% HDI
- Inner error bars (thicker): 50% IQR (Q25–Q75)

---

#### `pairPlot` — Scatter plot matrix (SPLOM)

Joint pairwise distributions for multiple variables. Uses the first 4 variables by default.

```ts
plots.pairPlot(element, data, opts);
plots.pairPlot(element, data, { ...opts, variables: ['mu', 'sigma', 'tau'] });
```

Lower-triangle only. Point opacity 0.3, size 2. Per-chain coloring.

---

#### `chainIntervalsPlot` — Per-chain intervals

Diamond marker for each chain's posterior mean, with 90% HDI error bars. Background shading shows the overall 90% HDI. Dashed line shows the overall posterior mean.

```ts
plots.chainIntervalsPlot(element, data, 'mu', opts);
```

---

#### `energyPlot` — Energy diagnostics (HMC)

Compares marginal energy distribution vs energy transition distribution as overlapping histograms. The E-BFMI (Bayesian Fraction of Missing Information) can be read visually: if the two histograms have very different widths, the HMC momentum is poorly tuned.

```ts
plots.energyPlot(element, data, opts);
```

Auto-detects energy variable: tries `energy__`, `energy`, `lp__`, `log_density` in order. Shows a message if no energy variable is found.

---

#### `diagnosticsHeatmapPlot` — Multi-metric heatmap

Seven diagnostic metrics for all variables in a color-coded grid. Green = good, yellow = borderline, red = problematic.

```ts
plots.diagnosticsHeatmapPlot(element, data, opts);
plots.getDiagnosticsHeatmapData(data, opts);
```

| Column | Threshold (good → bad) |
|---|---|
| R-hat | < 1.01 → < 1.05 → ≥ 1.05 |
| Split R-hat | < 1.01 → < 1.05 → ≥ 1.05 |
| ESS/draw | > 0.1 → > 0.05 → ≤ 0.05 |
| Bulk ESS | > 400 → > 100 → ≤ 100 |
| Tail ESS | > 400 → > 100 → ≤ 100 |
| MCSE/SD | < 0.1 → < 0.2 → ≥ 0.2 |
| \|Geweke z\| | < 2 → < 3 → ≥ 3 |

---

#### `summaryTable` — HTML summary table

Renders an HTML `<table>` (not a Plotly chart) directly into an element. 16 columns with color-coded cells.

```ts
plots.summaryTable(element, data, opts);
```

Columns: variable, mean, std, mcse, q5, q25, q50, q75, q95, ess, ess/draw, bulkEss, tailEss, rhat, splitRhat, |geweke z|, hdi90.

Cells are red if the value exceeds a diagnostic threshold, green if it passes. Supports dark/light theme via `opts.theme`.

---

## CLI Tool

The `mcmc` binary is included in the package (`dist/cli/index.cjs`). Install globally or use via `npx`.

```bash
npm install -g mcmc-visualizer
# or
npx mcmc-visualizer <command> [file] [options]
```

### Commands

```
mcmc summary  <file>   Full statistics table (mean, std, mcse, ess, rhat, ...)
mcmc diagnose <file>   Convergence diagnostics (rhat, splitRhat, ess bulk/tail, mcse, geweke)
mcmc rhat     <file>   R-hat and split R-hat only
mcmc ess      <file>   ESS bulk, tail, per-draw, and count
mcmc convert  <file>   Convert to JSON
mcmc plot     <file>   Output a Plotly JSON spec
```

### Options

| Option | Values | Description |
|---|---|---|
| `--format` | `table` (default), `json` | Output format |
| `--vars a,b,c` | comma-separated | Filter to specific variables |
| `--chains c1,c2` | comma-separated | Filter to specific chains |
| `--warmup N` | integer | Discard first N draws |
| `--from` | `turing-csv`, `stan-csv`, `mcmcchains-json`, `arviz-json` | Skip auto-detection |
| `--to` | `json` | Export format (only JSON currently) |
| `--type` | `trace`, `density`, `rank`, ... | Plot type for `plot` command |
| `--theme` | `dark`, `light` | Theme for plot specs |
| `--height`, `--width` | integer | Plot dimensions in pixels |
| `--stdin` | flag | Read from stdin instead of a file |
| `--out file` | path | Write output to file instead of stdout |
| `--help`, `-h` | flag | Print help |
| `--version`, `-v` | flag | Print package version |

### Examples

```bash
# Print summary table
mcmc summary posterior.json

# Get JSON diagnostics, filter by rhat
mcmc diagnose output.csv --format json | jq '.[] | select(.rhat > 1.01)'

# Discard 200 warm-up draws, show only two variables
mcmc summary chains.csv --warmup 200 --vars mu,sigma

# Generate a Plotly trace plot spec for a specific variable
mcmc plot posterior.json --type trace --vars mu --theme light > spec.json

# Pipe from stdin
cat chains.csv | mcmc ess --stdin

# Filter chains and write output to file
mcmc diagnose run.json --chains chain#1,chain#2 --out diagnostics.json
```

### Convergence status codes

The `diagnose` command shows a `status` field per variable:
- `OK` — R-hat < 1.01
- `WARN` — R-hat 1.01–1.1
- `FAIL` — R-hat ≥ 1.1 or undefined

---

## Exporting Data

Currently one export format is available: generic JSON.

```ts
import { toJSON } from 'mcmc-visualizer';

const jsonString = toJSON(data);
// Output: { "chain#1": { "mu": [1.2, 1.3, ...], "sigma": [...] }, "chain#2": { ... } }
```

This format is readable by `fromChainArrays()` after `JSON.parse()`.

---

## Auto-detection

`detectFormat(text)` returns `FileFormat`:

```ts
import { detectFormat } from 'mcmc-visualizer';
const format = detectFormat(text);
// 'turing-csv' | 'stan-csv' | 'mcmcchains-json' | 'unknown'
```

Detection priority:
1. Starts with `{` and has `size`, `value_flat`, `parameters` → `mcmcchains-json`
2. First non-comment line has `lp__` and `accept_stat__` headers → `stan-csv`
3. Header has `iteration,chain` or `chain_,draw_` → `turing-csv` (wide)
4. 4-column CSV where columns 3+4 are numeric integers/floats → `turing-csv` (long)
5. Otherwise → `unknown`

ArviZ JSON is **not** auto-detected (it requires `fromArviZJSON()` explicitly) because it has an ambiguous `{` prefix that could be many things.

---

## Known Limitations

| Area | Limitation |
|---|---|
| **Standard deviation** | Divides by `n` not `n-1`. For typical MCMC chains (n ≥ 500) the difference is < 0.1%, but it is technically a biased estimator. Affects skewness and kurtosis computation too. |
| **HDI multimodal** | The sliding-window algorithm returns the shortest *contiguous* interval. For strongly bimodal posteriors this returns the widest single mode. There is no multi-interval HDI. |
| **No caching** | `sequenceStats()`, `variableStats()`, and `summary()` recompute on every call. For large posteriors (> 50k draws × 100 variables), calling `summary()` in a tight loop is expensive. |
| **`densityPlot` no spec** | `densityPlot()` and `getDensityPlotData()` exist but there is no `densityPlotSpec()`. All other plots have a spec function. |
| **Missing diagnostics** | No BFMI (critical for HMC/NUTS), no Heidelberger-Welch, no Raftery-Lewis, no nested R-hat, no multivariate PSRF, no R*, no ESS/sec, no posterior correlation matrix, no DIC/LOO-CV. |
| **Export formats** | Only generic JSON export. No Turing CSV, Stan CSV, or ArviZ JSON re-export. |
| **ArviZ recursion depth** | The ArviZ JSON parser uses recursion for multi-dimensional parameter flattening. Extremely high-dimensional parameters (> 1000 dimensions) risk stack overflow. |
| **NetCDF** | Cannot read NetCDF files. `netcdfjs` only reads NetCDF v3 (classic format), but ArviZ writes NetCDF v4 (HDF5-based). They are not compatible without conversion. |
| **Autocorrelation inconsistency** | The ACF shown in `autocorrelationPlot` uses a simple lag formula; the autocorrelation used internally for ESS uses the FFT-based power spectrum. Both are correct but they are not identical for finite-length chains. |
