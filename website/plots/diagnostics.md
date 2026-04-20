# Diagnostics Plots

## diagnosticsHeatmapPlot — Multi-metric heatmap

Seven diagnostic metrics for all variables in a color-coded grid. Green = good, yellow = borderline, red = problematic.

```typescript
plots.diagnosticsHeatmapPlot(element, data, opts);
plots.getDiagnosticsHeatmapData(data, opts);
```

| Column | Good | Borderline | Bad |
|---|---|---|---|
| R-hat | < 1.01 | < 1.05 | ≥ 1.05 |
| Split R-hat | < 1.01 | < 1.05 | ≥ 1.05 |
| ESS/draw | > 0.1 | > 0.05 | ≤ 0.05 |
| Bulk ESS | > 400 | > 100 | ≤ 100 |
| Tail ESS | > 400 | > 100 | ≤ 100 |
| MCSE/SD | < 0.1 | < 0.2 | ≥ 0.2 |
| \|Geweke z\| | < 2 | < 3 | ≥ 3 |

## chainIntervalsPlot — Per-chain intervals

Diamond marker for each chain's posterior mean, with 90% HDI error bars. Background shading shows the overall 90% HDI. Dashed line shows the overall posterior mean.

```typescript
plots.chainIntervalsPlot(element, data, 'mu', opts);
```

## energyPlot — HMC energy diagnostics

Compares marginal energy distribution vs energy transition distribution as overlapping histograms. The E-BFMI (Bayesian Fraction of Missing Information) can be read visually: if the two histograms have very different widths, the HMC momentum is poorly tuned.

```typescript
plots.energyPlot(element, data, opts);
```

Auto-detects energy variable in order: `energy__`, `energy`, `lp__`, `log_density`. Shows a message if no energy variable is found.

## summaryTable — HTML table

Renders an HTML `<table>` (not a Plotly chart) directly into an element. 16 columns with color-coded cells.

```typescript
plots.summaryTable(element, data, opts);
```

Columns: variable, mean, std, mcse, q5, q25, q50, q75, q95, ess, ess/draw, bulkEss, tailEss, rhat, splitRhat, |geweke z|, hdi90.

Cells are red if the value exceeds a diagnostic threshold, green if it passes. Supports dark/light theme via `opts.theme`.
