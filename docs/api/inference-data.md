# InferenceData Interface

## Reading chains and variables

```typescript
// List all chain names and variable names
data.chainNames;     // ['chain#1', 'chain#2', ...]
data.variableNames;  // ['mu', 'sigma', 'tau', ...]
data.drawCount;      // number of samples (max across chains)

// Get samples for a variable in a specific chain
const muChain1: Float64Array = data.getDraws('mu', 'chain#1');

// Get all samples for a variable, all chains concatenated
const allMu: Float64Array = data.getAllDraws('mu');
```

## Filtering and slicing

All transformation methods return **new** `InferenceData` instances. The original is not mutated.

```typescript
// Discard first 200 draws (warm-up / burn-in)
const withoutWarmup = data.slice(200);

// Slice a range [start, end)
const window = data.slice(100, 600);

// Keep only selected variables
const paramsOnly = data.filterVariables(['mu', 'sigma']);

// Keep only selected chains
const twoChains = data.filterChains(['chain#1', 'chain#2']);

// Chain transforms together
const clean = data.slice(500).filterVariables(['mu']).filterChains(['chain#1']);
```

## Computing statistics

Statistics are computed on every call — results are not cached internally.

```typescript
// Per-chain statistics for one variable
const seqStats = data.sequenceStats('mu', 'chain#1');

// Aggregated multi-chain statistics for one variable
const varStats = data.variableStats('mu');

// Full summary table (all variables × all stats)
const table: VariableSummary[] = data.summary();
```

See the [Statistics reference](/api/statistics) for the full field descriptions.
