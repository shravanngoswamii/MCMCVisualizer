import type { InferenceData } from '../types';
import type { PlotOptions, PlotHandle } from './types';
import type { CumMeanPlotData } from './data-types';
import { getPlotly, getLayout, getConfig, resolveChainColors } from './types';

export function getCumMeanPlotData(
  data: InferenceData,
  variable: string,
  opts?: PlotOptions,
): CumMeanPlotData {
  const colors = resolveChainColors(opts);

  // Determine iterations array from the first chain's draw count
  const firstChain = data.chainNames[0];
  const firstDraws = firstChain ? data.getDraws(variable, firstChain) : new Float64Array(0);
  const n = firstDraws.length;
  const iterations = Array.from({ length: n }, (_, i) => i + 1);

  const series = data.chainNames.map((chain, i) => {
    const draws = data.getDraws(variable, chain);
    const values: number[] = [];
    let sum = 0;
    for (let j = 0; j < draws.length; j++) {
      sum += draws[j]!;
      values.push(sum / (j + 1));
    }
    return { chain, values, color: colors[i % colors.length]! };
  });

  return { variable, iterations, series };
}

export function cumulativeMeanPlot(
  container: HTMLElement,
  data: InferenceData,
  variable: string,
  options?: PlotOptions,
): PlotHandle {
  const Plotly = getPlotly();
  let currentVar = variable;

  function render() {
    const plotData = getCumMeanPlotData(data, currentVar, options);
    const traces = plotData.series.map(s => ({
      y: s.values,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: s.chain,
      line: { width: 1.5, color: s.color },
    }));
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
