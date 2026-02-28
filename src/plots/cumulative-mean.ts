import type { InferenceData } from '../types';
import type { PlotOptions, PlotHandle } from './types';
import { getPlotly, getLayout, getConfig, CHAIN_COLORS } from './types';

export function cumulativeMeanPlot(
  container: HTMLElement,
  data: InferenceData,
  variable: string,
  options?: PlotOptions,
): PlotHandle {
  const Plotly = getPlotly();
  let currentVar = variable;

  function render() {
    const traces = data.chainNames.map((chain, i) => {
      const draws = data.getDraws(currentVar, chain);
      const cumMean: number[] = [];
      let sum = 0;
      for (let j = 0; j < draws.length; j++) {
        sum += draws[j]!;
        cumMean.push(sum / (j + 1));
      }
      return {
        y: cumMean,
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: chain,
        line: { width: 1.5, color: CHAIN_COLORS[i % CHAIN_COLORS.length] },
      };
    });
    const layout = {
      ...getLayout(options),
      title: { text: `Cumulative Mean: ${currentVar}` },
      xaxis: { ...getLayout(options).xaxis as object, title: 'Iteration' },
      yaxis: { ...getLayout(options).yaxis as object, title: `Mean (${currentVar})` },
    };
    Plotly.react(container, traces, layout, getConfig());
  }

  render();
  return {
    destroy: () => Plotly.purge(container),
    update: (v) => { if (v) currentVar = v; render(); },
  };
}
