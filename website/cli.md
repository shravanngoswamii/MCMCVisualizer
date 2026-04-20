# CLI Tool

The `mcmc` binary is included in the package (`dist/cli/index.cjs`). Install globally or use via `npx`.

```bash
npm install -g mcmc-visualizer
# or
npx mcmc-visualizer <command> [file] [options]
```

## Commands

```
mcmc summary  <file>   Full statistics table (mean, std, mcse, ess, rhat, ...)
mcmc diagnose <file>   Convergence diagnostics (rhat, splitRhat, ess bulk/tail, mcse, geweke)
mcmc rhat     <file>   R-hat and split R-hat only
mcmc ess      <file>   ESS bulk, tail, per-draw, and count
mcmc convert  <file>   Convert to JSON
mcmc plot     <file>   Output a Plotly JSON spec
```

## Options

| Option | Values | Description |
|---|---|---|
| `--format` | `table` (default), `json` | Output format |
| `--vars a,b,c` | comma-separated | Filter to specific variables |
| `--chains c1,c2` | comma-separated | Filter to specific chains |
| `--warmup N` | integer | Discard first N draws |
| `--from` | `turing-csv`, `stan-csv`, `mcmcchains-json`, `arviz-json` | Skip auto-detection |
| `--to` | `json` | Export format |
| `--type` | `trace`, `density`, `rank`, … | Plot type for `plot` command |
| `--theme` | `dark`, `light` | Theme for plot specs |
| `--height`, `--width` | integer | Plot dimensions in pixels |
| `--stdin` | flag | Read from stdin instead of a file |
| `--out file` | path | Write output to file instead of stdout |
| `--help`, `-h` | flag | Print help |
| `--version`, `-v` | flag | Print package version |

## Examples

```bash
# Print summary table
mcmc summary posterior.json

# Get JSON diagnostics, filter variables with rhat > 1.01
mcmc diagnose output.csv --format json | jq '.[] | select(.rhat > 1.01)'

# Discard 200 warm-up draws, show only two variables
mcmc summary chains.csv --warmup 200 --vars mu,sigma

# Generate a Plotly trace plot spec for a specific variable
mcmc plot posterior.json --type trace --vars mu --theme light > spec.json

# Pipe from stdin
cat chains.csv | mcmc ess --stdin

# Filter chains and write output to file
mcmc diagnose run.json --chains chain#1,chain#2 --out diagnostics.json
```

## Convergence status codes

The `diagnose` command shows a `status` field per variable:

| Status | Condition |
|--------|-----------|
| `OK` | R-hat < 1.01 |
| `WARN` | R-hat 1.01–1.1 |
| `FAIL` | R-hat ≥ 1.1 or undefined |
