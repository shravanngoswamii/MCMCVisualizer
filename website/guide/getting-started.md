# Getting Started

## Installation

```bash
npm install mcmc-visualizer
# Optional: only needed for DOM rendering (tracePlot, densityPlot, etc.)
npm install plotly.js-dist-min
```

For browser use via CDN (no bundler required):

```html
<script src="https://cdn.plot.ly/plotly-2.35.0.min.js"></script>
<script type="module">
  import { fromTuringCSV, plots } from 'mcmc-visualizer';
</script>
```

## Load your data

The fastest entry point is `fromChainArrays` — pass arrays you already have:

```typescript
import { fromChainArrays } from 'mcmc-visualizer';

const data = fromChainArrays({
  'chain#1': {
    mu:    [1.2, 1.3, 1.1, 1.4, /* ... */],
    sigma: [0.5, 0.6, 0.5, 0.7, /* ... */],
  },
  'chain#2': {
    mu:    [1.0, 1.5, 1.2, 1.3, /* ... */],
    sigma: [0.4, 0.5, 0.6, 0.5, /* ... */],
  },
});
```

Or parse a CSV file from Turing.jl or Stan:

```typescript
import { fromTuringCSV, fromStanCSV, fromAutoDetect } from 'mcmc-visualizer';

const data = fromTuringCSV(csvText);      // Turing.jl CSV
const data2 = fromStanCSV(csvText);       // Stan CSV
const data3 = fromAutoDetect(csvText);    // auto-detect format
```

## Compute diagnostics

```typescript
// Per-variable diagnostics (aggregated across chains)
const stats = data.variableStats('mu');
console.log(stats.rhat);      // rank-normalized R-hat
console.log(stats.bulkEss);   // bulk ESS
console.log(stats.tailEss);   // tail ESS
console.log(stats.mcse);      // MCSE of the mean

// Full summary table
const table = data.summary();
// [{ variable, mean, stdev, mcse, rhat, bulkEss, tailEss, hdi90, ... }, ...]
```

## Render a plot

```typescript
import { plots } from 'mcmc-visualizer';

// Trace plot into a DOM element
plots.tracePlot(document.getElementById('trace'), data, 'mu');

// Density estimate
plots.densityPlot(document.getElementById('density'), data, 'mu');

// Diagnostics heatmap (all variables)
plots.diagnosticsHeatmapPlot(document.getElementById('heat'), data);
```

Each plot function returns a `PlotHandle` with `destroy()` and `update()` methods for lifecycle management.

## Use from the CLI

```bash
# Install globally
npm install -g mcmc-visualizer

# Print a summary table
mcmc summary posterior.json

# Convergence diagnostics
mcmc diagnose chains.csv

# Convert to JSON
mcmc convert output.csv --to json > posterior.json
```

See the [CLI reference](/cli) for all commands and options.
