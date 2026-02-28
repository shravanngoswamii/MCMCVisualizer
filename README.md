# mcmc-visualizer

Parse, analyze, and export MCMC sampling data in JavaScript/TypeScript. Zero dependencies, works in browser and Node.js.

## Supported Formats

| Format | Read | Write |
|--------|------|-------|
| Turing CSV (long) | ✅ | ✅ |
| Turing CSV (wide) | ✅ | ✅ |
| Stan CSV | ✅ | ✅ |
| Wide CSV | ✅ | ✅ |
| JSON | — | ✅ |

## Install

```bash
npm install mcmc-visualizer
```

## Quick Start

```typescript
import { fromTuringCSV, fromStanCSV, fromAutoDetect } from 'mcmc-visualizer';

// Parse from a CSV string
const data = fromTuringCSV(csvText);

// Or auto-detect the format
const data2 = fromAutoDetect(csvText);

// Get variable names and chain names
console.log(data.variableNames); // ['alpha', 'beta', 'sigma']
console.log(data.chainNames);    // ['chain#1', 'chain#2']

// Get draws for a specific variable and chain
const draws = data.getDraws('alpha', 'chain#1'); // Float64Array

// Get all draws across chains
const allDraws = data.getAllDraws('alpha'); // Float64Array

// Compute full summary table
const summary = data.summary();
// [{ variable: 'alpha', mean, stdev, ess, rhat, quantiles, hdi90, count }, ...]

// Per-chain stats
const seqStats = data.sequenceStats('alpha', 'chain#1');
// { mean, stdev, ess, autocorrelation, count }
```

## Diagnostics

Built-in MCMC diagnostics with no dependencies:

- **ESS** (Effective Sample Size) via FFT-based autocorrelation
- **R-hat** (Gelman-Rubin convergence diagnostic)
- **Autocorrelation** at all lags
- **HDI** (Highest Density Interval)
- **Quantiles** (5%, 25%, 50%, 75%, 95%)

```typescript
import { computeESS, computeRhat, computeHDI } from 'mcmc-visualizer';

const { ess, autocorrelation } = computeESS(new Float64Array([...]));
const rhat = computeRhat(chainMeans, chainStdevs, chainCounts);
const [lo, hi] = computeHDI(new Float64Array([...]), 0.9);
```

## Export

```typescript
const csv = data.toTuringCSV();      // Long format: chain,var,draw,value
const wide = data.toWideCSV();       // Wide format: chain_,draw_,var1,var2,...
const stan = data.toStanCSV();       // Stan CSV with comment headers
const json = data.toJSON();          // JSON object { chain: { var: [...] } }
```

## Data Manipulation

```typescript
// Discard warmup (first 500 draws)
const postWarmup = data.slice(500);

// Keep only specific chains
const chain1Only = data.filterChains(['chain#1']);

// Keep only specific variables
const subset = data.filterVariables(['alpha', 'beta']);
```

## Construct from Arrays

```typescript
import { fromChainArrays } from 'mcmc-visualizer';

const data = fromChainArrays({
  'chain#1': { alpha: [1.5, 2.3, 1.8], beta: [0.5, 0.7, 0.6] },
  'chain#2': { alpha: [1.6, 2.4, 1.7], beta: [0.45, 0.65, 0.55] },
});
```

## Stan CSV (Multiple Files)

Stan outputs one CSV file per chain:

```typescript
import { fromStanCSVFiles } from 'mcmc-visualizer';

const data = fromStanCSVFiles([chain1Text, chain2Text, chain3Text]);
```

## Browser Usage

Works directly in the browser with any bundler or via CDN:

```html
<input type="file" id="upload" accept=".csv" multiple />
<script type="module">
  import { fromAutoDetect } from 'mcmc-visualizer';

  document.getElementById('upload').addEventListener('change', async (e) => {
    const text = await e.target.files[0].text();
    const data = fromAutoDetect(text);
    console.table(data.summary());
  });
</script>
```

## API

### Factory Functions

| Function | Description |
|----------|-------------|
| `fromTuringCSV(text)` | Parse Turing CSV (long or wide format) |
| `fromStanCSV(text)` | Parse a single Stan CSV file |
| `fromStanCSVFiles(files)` | Parse multiple Stan CSV files as separate chains |
| `fromAutoDetect(text)` | Auto-detect format and parse |
| `fromChainArrays(data)` | Construct from `{ chain: { var: number[] } }` |

### InferenceData

| Method | Returns |
|--------|---------|
| `.getDraws(variable, chain?)` | `Float64Array` |
| `.getAllDraws(variable)` | `Float64Array` (concatenated across chains) |
| `.sequenceStats(variable, chain)` | `SequenceStats` |
| `.variableStats(variable)` | `VariableStats` |
| `.summary()` | `VariableSummary[]` |
| `.toTuringCSV()` | `string` |
| `.toStanCSV()` | `string` |
| `.toWideCSV()` | `string` |
| `.toJSON()` | `string` |
| `.slice(start, end?)` | `InferenceData` |
| `.filterChains(names)` | `InferenceData` |
| `.filterVariables(names)` | `InferenceData` |

### Standalone Stats

| Function | Description |
|----------|-------------|
| `computeESS(chain)` | FFT-based effective sample size |
| `computeRhat(means, stdevs, counts)` | Gelman-Rubin R-hat |
| `computeMean(arr)` | Arithmetic mean |
| `computeStdev(arr)` | Standard deviation |
| `computeQuantiles(arr)` | 5/25/50/75/95th percentiles |
| `computeHDI(arr, mass?)` | Highest density interval |
| `detectFormat(text)` | Detect file format |
