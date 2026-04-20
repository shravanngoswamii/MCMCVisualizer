# Architecture Overview

The package is split into four independent layers. You can use any layer without depending on the ones above it.

```
┌─────────────────────────────────────────────────────────────┐
│  CLI  (mcmc summary / diagnose / ess / rhat / convert / plot)│
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

## Build outputs

All outputs are produced by `tsup`:

| File | Format | Target |
|------|--------|--------|
| `dist/index.js` | ESM | Browser + Node, ES2020, platform-neutral |
| `dist/index.cjs` | CommonJS | Browser + Node |
| `dist/cli/index.cjs` | CommonJS | Node CLI binary (all deps bundled) |
| `dist/index.d.ts` | TypeScript declarations | — |

## Plot rendering layers

Every plot type exposes up to three independent entry points:

```
get*PlotData(data, variable?, opts?)   →  plain typed data object (no Plotly)
*PlotSpec(data, variable?, opts?)      →  { data, layout, config } Plotly JSON
*Plot(element, data, variable?, opts?) →  PlotHandle  (requires Plotly.js)
```

**`get*PlotData`** — Returns a typed plain object (e.g. `TracePlotData`). Use this when rendering with D3, Observable Plot, or another library, or when running headlessly in Node.js.

**`*PlotSpec`** — Returns a complete Plotly JSON specification. No DOM or Plotly required. Use this to send plots to a headless renderer, store specs as JSON, or embed in non-React apps.

**`*Plot`** — Renders directly into a DOM element using Plotly.js. Returns a `PlotHandle`:

```typescript
interface PlotHandle {
  destroy(): void;              // Remove the plot and clean up
  update(variable?: string): void;  // Re-render with a different variable
}
```

Plotly.js is resolved at runtime: first checks `globalThis.Plotly` (browser CDN), then tries `require('plotly.js-dist-min')` (Node.js). Throws a descriptive error if neither is available.
