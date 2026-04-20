# Functional Statistics API

All stat functions are exported individually and operate on raw `Float64Array` inputs. Use these when you don't want to go through `InferenceData`, or when building custom diagnostics.

```typescript
import {
  computeMean, computeStdev, computeQuantiles, computeHDI,
  computeSkewness, computeExcessKurtosis,
  computeESS, computeEssBulk, computeEssTail, computeEssBasic,
  computeRhat,
  computeMCSE, computeMCSEMultiChain, computeMCSEQuantile, computeMCSEStd,
  computeGeweke,
  computeSplitRhat,
} from 'mcmc-visualizer';

// Single-chain ESS
const { ess, autocorrelation } = computeESS(draws);

// Multi-chain bulk/tail ESS — pass array of Float64Arrays (one per chain)
const bulkEss = computeEssBulk([chain1, chain2, chain3, chain4]);
const tailEss = computeEssTail([chain1, chain2, chain3, chain4]);

// Rank-normalized R-hat
const rhat = computeRhat([chain1, chain2, chain3, chain4], 'rank');
//                                                          ↑ 'rank' | 'bulk' | 'tail' | 'basic'

// MCSE variants
const mcseMean  = computeMCSE(singleChain);
const mcseMulti = computeMCSEMultiChain([c1, c2, c3, c4]);
const mcseQ95   = computeMCSEQuantile(draws, 0.95, effectiveSS);
const mcseStd   = computeMCSEStd([c1, c2, c3, c4]);

// Geweke test
const { z, pValue } = computeGeweke(draws);

// Descriptive
const { q5, q25, q50, q75, q95 } = computeQuantiles(draws);
const [lo, hi] = computeHDI(draws, 0.9);
```

## Algorithm reference

| Function | Algorithm | Reference |
|---|---|---|
| `computeESS` | Geyer monotone sequence estimator; autocorrelation via radix-2 / Bluestein FFT | Geyer 1992 |
| `computeEssBulk` | Rank-normalized ESS with Geyer estimator + antithetic correction on split chains | Vehtari et al. 2021 |
| `computeEssTail` | ESS on quantile indicator functions (lower + upper 5%) | Vehtari et al. 2021 |
| `computeRhat("rank")` | max(bulk, tail) R-hat; Blom rank transform then probit | Vehtari et al. 2021 |
| `computeRhat("tail")` | Fold around median → rank normalize → Gelman-Rubin | Vehtari et al. 2021 |
| `computeMCSE` | `SD / √ESS` | Standard |
| `computeMCSEQuantile` | Beta(α, β) inverse CDF with α = ESS·p + 1 | Flegal & Jones 2011 |
| `computeMCSEStd` | Delta method on proxy (x − μ)² | Standard |
| `computeGeweke` | Spectral z-test; linear Bartlett window; first 10% vs last 50% | Geweke 1991 |
| `computeHDI` | Sliding window: shortest interval containing `ceil(mass × n)` sorted draws | Standard |
| `computeQuantiles` | Linear interpolation at fractional positions | Standard |
