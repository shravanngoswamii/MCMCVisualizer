# Multi-variable Plots

## violinPlot — Violin plots

Distribution shape for all variables in one plot. Includes median marker and mean dot. `spanmode: 'soft'`. Horizontal orientation.

```typescript
plots.violinPlot(element, data, opts);  // Note: no variable argument — shows all variables
```

Height auto-scales with the number of variables (~100px per variable + 120px base).

## forestPlot — Forest plot

Multi-variable summary with mean (diamond) and credible intervals. One row per variable.

```typescript
plots.forestPlot(element, data, opts);
plots.getForestPlotData(data, opts);
```

- Diamond color is coded by R-hat (green < 1.01, yellow < 1.1, red ≥ 1.1)
- Outer error bars: 90% HDI
- Inner error bars (thicker): 50% IQR (Q25–Q75)

## pairPlot — Scatter plot matrix (SPLOM)

Joint pairwise distributions for multiple variables. Uses the first 4 variables by default.

```typescript
plots.pairPlot(element, data, opts);
plots.pairPlot(element, data, { ...opts, variables: ['mu', 'sigma', 'tau'] });
```

Lower-triangle only. Point opacity 0.55, size 3. Per-chain coloring. Requires `splom` trace type to be registered with your Plotly bundle.
