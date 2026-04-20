---
layout: home

hero:
  name: MCMCVisualizer
  text: MCMC Diagnostics & Visualization
  tagline: Parse, analyze, plot, and export MCMC sampling data. Works in browsers, Node.js, and from the command line. Zero runtime dependencies.
  image:
    src: /logo.svg
    alt: MCMCVisualizer
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/loading-data
    - theme: alt
      text: Live Demo →
      link: https://shravanngoswamii.github.io/MCMCVisualizer/
      target: _blank

features:
  - icon: 📊
    title: 15+ Plot Types
    details: Trace plots, density plots, ACF, rank plots, pair plots, violin plots, forest plots, diagnostics heatmaps, and more — all powered by Plotly.js.
  - icon: 🔢
    title: Production-grade Diagnostics
    details: Rank-normalized R-hat, bulk/tail ESS, MCSE (mean, quantile, std), Geweke z-test, HDI, and more — all matching Stan/ArviZ reference implementations.
  - icon: 📂
    title: Multiple Formats
    details: Reads Turing.jl CSV (long & wide), Stan CSV, MCMCChains.jl JSON, ArviZ JSON, and raw arrays. Writes JSON. Auto-detection included.
  - icon: ⚡
    title: Zero Runtime Dependencies
    details: All parsers and statistics are self-contained. Plotly.js is an optional peer dependency only for DOM rendering. Tree-shakeable ESM build.
  - icon: 🖥️
    title: CLI Included
    details: Full-featured `mcmc` command — summary tables, diagnostics, ESS/R-hat, format conversion, and Plotly spec output — with JSON and table output modes.
  - icon: 🔧
    title: Three Rendering Layers
    details: Use raw data objects for custom rendering, Plotly JSON specs for headless output, or DOM adapters for direct browser rendering. Each layer is independent.
---

## Quick Start

```bash
npm install mcmc-visualizer
```

```typescript
import { fromChainArrays, plots } from 'mcmc-visualizer';

const data = fromChainArrays({
  'chain#1': { mu: [1.2, 1.3, 1.1, 1.4], sigma: [0.5, 0.6, 0.5, 0.7] },
  'chain#2': { mu: [1.0, 1.5, 1.2, 1.3], sigma: [0.4, 0.5, 0.6, 0.5] },
});

// Compute diagnostics
const stats = data.variableStats('mu');
console.log(stats.rhat, stats.bulkEss); // 1.001, 3847

// Render a trace plot into a DOM element
plots.tracePlot(document.getElementById('plot'), data, 'mu');

// Get a full summary table
const summary = data.summary();
// [{ variable: 'mu', mean: 1.25, rhat: 1.001, bulkEss: 3847, ... }]
```

## Supported Formats

| Format | Read | Write |
|--------|:----:|:-----:|
| Turing.jl CSV (long) | ✅ | ✅ |
| Turing.jl CSV (wide) | ✅ | ✅ |
| Stan CSV | ✅ | — |
| MCMCChains.jl JSON | ✅ | — |
| ArviZ JSON | ✅ | — |
| Generic JSON | ✅ | ✅ |
| Raw arrays | ✅ | — |
