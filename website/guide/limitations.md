# Known Limitations

| Area | Limitation |
|---|---|
| **Standard deviation** | Divides by `n` not `n-1`. For typical MCMC chains (n ≥ 500) the difference is < 0.1%, but it is technically a biased estimator. Affects skewness and kurtosis computation too. |
| **HDI multimodal** | The sliding-window algorithm returns the shortest *contiguous* interval. For strongly bimodal posteriors this returns the widest single mode. There is no multi-interval HDI. |
| **No caching** | `sequenceStats()`, `variableStats()`, and `summary()` recompute on every call. For large posteriors (> 50k draws × 100 variables), calling `summary()` in a tight loop is expensive. |
| **`densityPlot` no spec** | `densityPlot()` and `getDensityPlotData()` exist but there is no `densityPlotSpec()`. All other plots have a spec function. |
| **Missing diagnostics** | No BFMI (critical for HMC/NUTS), no Heidelberger-Welch, no Raftery-Lewis, no nested R-hat, no multivariate PSRF, no R*, no ESS/sec, no posterior correlation matrix, no DIC/LOO-CV. |
| **Export formats** | Only generic JSON export. No Turing CSV, Stan CSV, or ArviZ JSON re-export. |
| **ArviZ recursion depth** | The ArviZ JSON parser uses recursion for multi-dimensional parameter flattening. Extremely high-dimensional parameters (> 1000 dimensions) risk stack overflow. |
| **NetCDF** | Cannot read NetCDF files. `netcdfjs` only reads NetCDF v3 (classic format), but ArviZ writes NetCDF v4 (HDF5-based). They are not compatible without conversion. |
| **Autocorrelation inconsistency** | The ACF shown in `autocorrelationPlot` uses a simple lag formula; the autocorrelation used internally for ESS uses the FFT-based power spectrum. Both are correct but not identical for finite-length chains. |
