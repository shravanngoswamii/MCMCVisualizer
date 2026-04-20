# Trace & Density Plots

## tracePlot — Chain trace

Shows sample values over iterations. One line per chain.

```typescript
plots.tracePlot(element, data, 'mu', opts);
plots.tracePlotSpec(data, 'mu', opts);    // Plotly JSON spec
plots.getTracePlotData(data, 'mu', opts); // TracePlotData (no Plotly)
```

X-axis: iteration index. Y-axis: draw value. Separate line per chain with chain colors. Good mixing produces overlapping, stationary lines.

## densityPlot — Kernel density estimate

Kernel density estimation per chain using a Gaussian kernel. Filled area under each curve.

```typescript
plots.densityPlot(element, data, 'mu', opts);
plots.getDensityPlotData(data, 'mu', opts);  // DensityPlotData
```

Bandwidth: `0.9 × min(SD, IQR/1.34) × n^(−1/5)` (Silverman's rule). 200 evaluation points. Opacity 0.4 fill with full-opacity stroke.

> **Note:** There is no `densityPlotSpec()` function. All other plots have a spec variant.

## cumulativeMeanPlot — Running mean

Shows how the posterior mean estimate stabilizes as draws accumulate. One line per chain.

```typescript
plots.cumulativeMeanPlot(element, data, 'mu', opts);
plots.getCumMeanPlotData(data, 'mu', opts);
```

Useful for visually confirming that chains have converged to the same mean.

## runningRhatPlot — Running R-hat

Computes R-hat at increasingly longer prefixes of the chains. Convergence is achieved when it stabilizes below 1.01.

```typescript
plots.runningRhatPlot(element, data, 'mu', opts);
plots.getRunningRhatData(data, 'mu', opts);
```

Down-sampled to ~200 points. Reference lines: 1.0 (green dashed), 1.05 (red dashed).
