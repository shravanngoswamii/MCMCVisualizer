# Plots — Overview & Theming

## Three rendering layers

Every plot type has up to three independent entry points:

```
get*PlotData(data, variable?, opts?)   →  plain typed data object (no Plotly)
*PlotSpec(data, variable?, opts?)      →  { data, layout, config } Plotly JSON
*Plot(element, data, variable?, opts?) →  PlotHandle  (requires Plotly.js)
```

- **`get*PlotData`** — Use with D3, Observable Plot, or any other renderer.
- **`*PlotSpec`** — Headless rendering, storing specs, embedding in non-React apps.
- **`*Plot`** — Direct DOM rendering. Returns a `PlotHandle` with `destroy()` / `update()`.

## PlotHandle

```typescript
interface PlotHandle {
  destroy(): void;              // Remove the plot and release resources
  update(variable?: string): void;  // Re-render, optionally with a different variable
}
```

## Theming

All plot functions accept an `opts` parameter:

```typescript
interface PlotOptions {
  height?: number;
  width?: number;
  theme?: 'dark' | 'light' | CustomTheme;  // default: 'dark'
}
```

**Built-in themes:**
- `'dark'` — Dark background (`#181b26` paper, `#13151e` plot area), light text
- `'light'` — White background, dark text

**Custom theme:**

```typescript
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

**Default chain color palette:**
`#636EFA`, `#EF553B`, `#00CC96`, `#AB63FA`, `#FFA15A`, `#19D3F3`, `#FF6692`, `#B6E880`

## All plots via the `plots` namespace

```typescript
import { plots } from 'mcmc-visualizer';

// Or import individually:
import { tracePlot, densityPlot, histogramPlot } from 'mcmc-visualizer';
```

| Function | Description |
|---|---|
| `tracePlot` | Sample values over iterations, one line per chain |
| `densityPlot` | KDE per chain, filled area |
| `histogramPlot` | Overlaid histograms per chain |
| `ecdfPlot` | Empirical CDF per chain |
| `autocorrelationPlot` | ACF bar chart, lags 0–50 |
| `cumulativeMeanPlot` | Running mean per chain |
| `rankPlot` | Rank histogram (chain mixing diagnostic) |
| `runningRhatPlot` | R-hat at increasing prefix lengths |
| `violinPlot` | Distribution shape for all variables |
| `forestPlot` | Mean + credible intervals, all variables |
| `pairPlot` | Scatter plot matrix (SPLOM) |
| `chainIntervalsPlot` | Per-chain mean + 90% HDI |
| `energyPlot` | HMC energy diagnostics |
| `diagnosticsHeatmapPlot` | Multi-metric color-coded heatmap |
| `summaryTable` | HTML summary table |
