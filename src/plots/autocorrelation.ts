import type { InferenceData } from '../types';
import type { PlotOptions, PlotHandle } from './types';
import { getPlotly, getLayout, getConfig, CHAIN_COLORS } from './types';

export function autocorrelationPlot(
  container: HTMLElement,
  data: InferenceData,
  variable: string,
  options?: PlotOptions,
): PlotHandle {
  const Plotly = getPlotly();
  let currentVar = variable;
  const MAX_LAG = 50;

  function acf(draws: Float64Array, maxLag: number): number[] {
    const n = draws.length;
    let mean = 0;
    for (let i = 0; i < n; i++) mean += draws[i]!;
    mean /= n;
    let variance = 0;
    for (let i = 0; i < n; i++) variance += (draws[i]! - mean) ** 2;
    if (variance === 0) return new Array(maxLag + 1).fill(0) as number[];
    const result: number[] = [];
    for (let lag = 0; lag <= maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < n - lag; i++) sum += (draws[i]! - mean) * (draws[i + lag]! - mean);
      result.push(sum / variance);
    }
    return result;
  }

  function render() {
    const lags = Array.from({ length: MAX_LAG + 1 }, (_, i) => i);
    const traces = data.chainNames.map((chain, i) => {
      const draws = data.getDraws(currentVar, chain);
      const values = acf(draws, MAX_LAG);
      return {
        x: lags,
        y: values,
        type: 'bar' as const,
        name: chain,
        marker: { color: CHAIN_COLORS[i % CHAIN_COLORS.length] },
        opacity: 0.7,
      };
    });
    const layout = {
      ...getLayout(options),
      title: { text: `Autocorrelation: ${currentVar}` },
      barmode: 'group' as const,
      xaxis: { ...getLayout(options).xaxis as object, title: 'Lag' },
      yaxis: { ...getLayout(options).yaxis as object, title: 'ACF', range: [-0.2, 1.05] },
      shapes: [{
        type: 'line' as const, x0: 0, x1: MAX_LAG, y0: 0, y1: 0,
        line: { color: '#888', width: 1, dash: 'dash' as const },
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
