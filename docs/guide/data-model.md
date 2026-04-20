# Data Model

## ChainData

The atomic unit. One object per MCMC chain.

```typescript
interface ChainData {
  readonly name: string;                              // e.g. "chain#1"
  readonly draws: ReadonlyMap<string, Float64Array>;  // variable → samples
  readonly drawCount: number;                         // max length across variables
}
```

All numeric draws are stored as `Float64Array` for memory efficiency.

## InferenceData

The top-level container returned by every `from*` function and implemented by `MCMCData`.

```typescript
interface InferenceData {
  readonly chains: ReadonlyMap<string, ChainData>;
  readonly variableNames: string[];
  readonly chainNames: string[];
  readonly drawCount: number;   // max draws across all chains

  // Data access
  getDraws(variable: string, chain?: string): Float64Array;
  getAllDraws(variable: string): Float64Array;

  // Statistics (computed on each call — not cached)
  sequenceStats(variable: string, chain: string): SequenceStats;
  variableStats(variable: string): VariableStats;
  summary(): VariableSummary[];

  // Immutable transformations (return new InferenceData)
  slice(start: number, end?: number): InferenceData;
  filterChains(chainNames: string[]): InferenceData;
  filterVariables(variableNames: string[]): InferenceData;
}
```

`MCMCData` is the concrete class implementing `InferenceData`. You never need to construct it directly — use the `from*` loader functions.

## Immutable transformations

All transformation methods return **new** `InferenceData` instances. The original is never mutated.

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
