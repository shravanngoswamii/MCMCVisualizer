# Exporting & Format Detection

## toJSON

Currently one export format is available: generic JSON.

```typescript
import { toJSON } from 'mcmc-visualizer';

const jsonString = toJSON(data);
// Output: { "chain#1": { "mu": [1.2, 1.3, ...], "sigma": [...] }, "chain#2": { ... } }
```

This format is readable by `fromChainArrays()` after `JSON.parse()`.

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

ArviZ JSON is **not** auto-detected (it requires `fromArviZJSON()` explicitly) because it has an ambiguous `{` prefix.
