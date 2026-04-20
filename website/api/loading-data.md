# Loading Data

## fromChainArrays

The lowest-friction entry point. Pass data you already have in memory.

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

Use this when receiving data from a WebSocket stream or any custom sampler.

## fromTuringCSV

Parses CSV files produced by Turing.jl and similar MCMC frameworks. Three sub-formats are auto-detected:

**Long format** (chain/variable/draw columns):
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

```typescript
import { fromTuringCSV } from 'mcmc-visualizer';
const data = fromTuringCSV(csvText);
```

## fromStanCSV / fromStanCSVFiles

Parses Stan's CSV output format. Comment lines starting with `#` are skipped. Internal variables ending in `__` (e.g. `lp__`, `accept_stat__`, `divergent__`, `treedepth__`) are automatically excluded from the parameter set.

Stan dot-notation is converted to bracket notation: `theta.1.2` → `theta[1,2]`.

```typescript
import { fromStanCSV, fromStanCSVFiles } from 'mcmc-visualizer';

// Single file = single chain
const single = fromStanCSV(fileText);

// Multiple files = one chain per file, named chain#1, chain#2, ...
const multi = fromStanCSVFiles([file1Text, file2Text, file3Text, file4Text]);
```

## fromMCMCChainsJSON

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

```typescript
import { fromMCMCChainsJSON } from 'mcmc-visualizer';
const data = fromMCMCChainsJSON(jsonText);
```

## fromArviZJSON

Parses the JSON output from Python's ArviZ (`az.to_json()`). Compatible with PyMC, NumPyro, Stan (via ArviZ), and Turing.jl (via ArviZ.jl). Multi-dimensional parameters (matrices, tensors) are flattened: `theta[0][1]` → `theta[0,1]`.

Only the `posterior` group is loaded by default. Use `parseArviZJSON()` to access all groups.

```typescript
import { fromArviZJSON, parseArviZJSON } from 'mcmc-visualizer';

// Posterior group only
const data = fromArviZJSON(jsonStringOrObject);

// All groups — returns Map<string, InferenceData>
const allGroups = parseArviZJSON(jsonStringOrObject);
const posterior = allGroups.get('posterior');
const sampleStats = allGroups.get('sample_stats');
```

## fromAutoDetect

Tries all text-based formats in priority order and throws if none match. ArviZ JSON is not included — use `fromArviZJSON()` explicitly.

**Priority:** MCMCChains JSON → Stan CSV → Turing CSV (wide) → Turing CSV (long)

```typescript
import { fromAutoDetect } from 'mcmc-visualizer';
const data = fromAutoDetect(text);  // throws if format unknown
```

## detectFormat

```typescript
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
