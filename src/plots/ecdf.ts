import type { InferenceData } from '../types';
import type { PlotOptions, PlotHandle } from './types';
import { getPlotly, getLayout, getConfig, CHAIN_COLORS } from './types';

export function ecdfPlot(
  container: HTMLElement,
  data: InferenceData,
  variable: string,
  options?: PlotOptions,
): PlotHandle {
  const Plotly = getPlotly();
  let currentVar = variable;

  function computeECDF(draws: Float64Array): { x: number[]; y: number[] } {
    const sorted = Array.from(draws).sort((a, b) => a - b);
    const n = sorted.length;
    return {
      x: sorted,
      y: sorted.map((_, i) => (i + 1) / n),
    };
  }

  function render() {
    const traces = data.chainNames.map((chain, i) => {
      const { x, y } = computeECDF(data.getDraws(currentVar, chain));
      return {
        x,
        y,
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: chain,
        line: { width: 2, shape: 'hv' as const, color: CHAIN_COLORS[i % CHAIN_COLORS.length] },
      };
    });

    const layout = {
      ...getLayout(options),
      title: { text: `Empirical CDF: ${currentVar}` },
      xaxis: { ...getLayout(options).xaxis as object, title: currentVar },
      yaxis: { ...getLayout(options).yaxis as object, title: 'Cumulative Probability', range: [0, 1] },
    };

    Plotly.react(container, traces, layout, getConfig());
  }

  render();
  return {
    destroy: () => Plotly.purge(container),
    update: (v) => { if (v) currentVar = v; render(); },
  };
}
