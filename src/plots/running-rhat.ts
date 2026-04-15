import type { InferenceData } from '../types';
import type { PlotOptions, PlotHandle } from './types';
import { getPlotly, getLayout, getConfig, CHAIN_COLORS, resolveChainColors } from './types';
import { computeMean, computeStdev } from '../stats/summary';

export function runningRhatPlot(
  container: HTMLElement,
  data: InferenceData,
  variable: string,
  options?: PlotOptions,
): PlotHandle {
  const Plotly = getPlotly();
  let currentVar = variable;

  function render() {
    const colors = resolveChainColors(options);
    const chains = data.chainNames.map(c => data.getDraws(currentVar, c));
    const minLen = Math.min(...chains.map(c => c.length));
    const step = Math.max(1, Math.floor(minLen / 200));
    const startAt = Math.max(20, step);

    const iterations: number[] = [];
    const rhatValues: number[] = [];

    for (let n = startAt; n <= minLen; n += step) {
      const sliced = chains.map(c => c.slice(0, n));
      const means = sliced.map(c => computeMean(c));
      const sds = sliced.map(c => computeStdev(c));
      const counts = sliced.map(c => c.length);

      const rhat = computeRhatFromParts(means, sds, counts);
      if (rhat !== undefined && !isNaN(rhat)) {
        iterations.push(n);
        rhatValues.push(rhat);
      }
    }

    const traces = [{
      x: iterations,
      y: rhatValues,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'R\u0302',
      line: { width: 2, color: colors[0] },
    }];

    const layout = {
      ...getLayout(options),
      title: { text: `Running R\u0302: ${currentVar}` },
      xaxis: { ...getLayout(options).xaxis as object, title: 'Iteration' },
      yaxis: { ...getLayout(options).yaxis as object, title: 'R\u0302' },
      shapes: [{
        type: 'line' as const,
        x0: iterations[0] ?? 0, x1: iterations[iterations.length - 1] ?? 1,
        y0: 1.0, y1: 1.0,
        line: { color: '#22c55e', width: 1, dash: 'dash' as const },
      }, {
        type: 'line' as const,
        x0: iterations[0] ?? 0, x1: iterations[iterations.length - 1] ?? 1,
        y0: 1.05, y1: 1.05,
        line: { color: '#ef4444', width: 1, dash: 'dot' as const },
      }],
    };

    Plotly.react(container, traces, layout, getConfig());
  }

  render();
  return {
    destroy: () => Plotly.purge(container),
    update: (v) => { if (v) currentVar = v; render(); },
  };
}

function computeRhatFromParts(
  chainMeans: number[],
  chainStdevs: number[],
  chainCounts: number[],
): number | undefined {
  if (chainMeans.length <= 1) return undefined;
  for (const c of chainCounts) {
    if (c <= 1) return undefined;
  }

  const m = chainMeans.length;
  const n = chainCounts.reduce((a, b) => a + b, 0) / m;
  const grandMean = chainMeans.reduce((a, b) => a + b, 0) / m;

  let B = 0;
  for (let i = 0; i < m; i++) B += (chainMeans[i]! - grandMean) ** 2;
  B = (n / (m - 1)) * B;

  let W = 0;
  for (let i = 0; i < m; i++) {
    W += chainStdevs[i]! * chainStdevs[i]! * chainCounts[i]! / (chainCounts[i]! - 1);
  }
  W /= m;

  if (W === 0) return undefined;
  return Math.sqrt(((n - 1) / n) * W / W + B / (n * W));
}
