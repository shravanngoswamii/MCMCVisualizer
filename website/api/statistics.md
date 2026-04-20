# Statistics Reference

## Per-chain — SequenceStats

Returned by `data.sequenceStats(variable, chain)`.

| Field | Type | Description |
|---|---|---|
| `mean` | `number` | Arithmetic mean |
| `stdev` | `number` | Standard deviation |
| `count` | `number` | Number of draws |
| `ess` | `number` | ESS via FFT-based Geyer monotone estimator (single chain) |
| `essPerDraw` | `number` | `ess / count` |
| `mcse` | `number` | MCSE = `stdev / √ess` |
| `skewness` | `number` | Standardized third central moment |
| `excessKurtosis` | `number` | Standardized fourth central moment minus 3 |
| `autocorrelation` | `number[]` | Autocorrelation values at lags 0, 1, 2, … (from FFT) |

> **Note on standard deviation:** The current implementation divides by `n` (population SD), not `n-1` (sample SD). For typical MCMC chains (n ≥ 500) the difference is negligible. Skewness and kurtosis inherit this.

## Per-variable — VariableStats

Returned by `data.variableStats(variable)`. Aggregates across all chains.

| Field | Type | Description |
|---|---|---|
| `mean` | `number` | Grand mean across all chains |
| `stdev` | `number` | SD of all draws pooled |
| `count` | `number` | Total draws across all chains |
| `ess` | `number` | Sum of single-chain ESS values |
| `essPerDraw` | `number` | `ess / count` |
| `mcse` | `number` | Multi-chain MCSE via bulk ESS |
| `bulkEss` | `number` | Rank-normalized bulk ESS (Vehtari 2021) |
| `tailEss` | `number` | Tail ESS for extremes (Vehtari 2021) |
| `rhat` | `number \| undefined` | Rank-normalized R-hat = max(bulk, tail). `undefined` if < 2 chains |
| `splitRhat` | `number \| undefined` | Simple split R-hat |
| `geweke` | `{ z, pValue }` | Geweke convergence test on pooled draws |
| `skewness` | `number` | Skewness of all draws pooled |
| `excessKurtosis` | `number` | Excess kurtosis of all draws pooled |
| `quantiles` | `{ q5, q25, q50, q75, q95 }` | Posterior quantiles |
| `hdi90` | `[number, number]` | 90% Highest Density Interval |
| `hdi90Width` | `number` | Width of the 90% HDI |

## summary()

Returns `VariableSummary[]` — one row per variable, each row is `{ variable: string } & VariableStats`.

```typescript
const rows = data.summary();
// rows[0] = { variable: 'mu', mean: 1.23, rhat: 1.001, bulkEss: 4523, ... }
```

This is the data source for `summaryTable()` and the `mcmc summary` CLI command.
