# Histograms, ECDF & ACF

## histogramPlot — Overlaid histograms

Overlaid histograms of raw draws, one per chain. `barmode: 'overlay'`, opacity 0.6.

```typescript
plots.histogramPlot(element, data, 'mu', opts);
plots.getHistogramPlotData(data, 'mu', opts);
```

## ecdfPlot — Empirical CDF

Step function of sorted draws vs cumulative probability. One trace per chain.

```typescript
plots.ecdfPlot(element, data, 'mu', opts);
plots.getEcdfPlotData(data, 'mu', opts);
```

Y-axis range: [0, 1]. Well-mixed chains produce overlapping ECDF curves.

## autocorrelationPlot — ACF

Bar chart of autocorrelation at lags 0–50. One series per chain.

```typescript
plots.autocorrelationPlot(element, data, 'mu', opts);
plots.getAutocorPlotData(data, 'mu', opts);
```

Uses the direct lag formula (not FFT). Horizontal reference line at 0. High autocorrelation at small lags indicates poor mixing or an insufficient thinning interval.

## rankPlot — Rank histogram

Normalizes all draws to [0, 1] rank space and plots as a histogram. Shows whether chains explore the same region uniformly. A well-mixed chain produces a flat histogram.

```typescript
plots.rankPlot(element, data, 'mu', opts);
plots.getRankPlotData(data, 'mu', opts);
```

20 bins. Horizontal reference line at expected count = `totalN / nChains / nBins`.
