import type { InferenceData } from '../types';
import type { PlotOptions, PlotHandle } from './types';
import type { HistogramPlotData } from './data-types';
import { getPlotly, getLayout, getConfig, resolveChainColors } from './types';

export function getHistogramPlotData(
  data: InferenceData,
  variable: string,
  opts?: PlotOptions,
): HistogramPlotData {
  const colors = resolveChainColors(opts);
  const series = data.chainNames.map((chain, i) => ({
    chain,
    draws: data.getDraws(variable, chain),
    color: colors[i % colors.length]!,
  }));
  return { variable, series };
}

export function histogramPlot(
  container: HTMLElement,
  data: InferenceData,
  variable: string,
  options?: PlotOptions,
): PlotHandle {
  const Plotly = getPlotly();
  let currentVar = variable;

  function render() {
    const plotData = getHistogramPlotData(data, currentVar, options);
    const traces = plotData.series.map(s => ({
      x: Array.from(s.draws),
      type: 'histogram' as const,
      name: s.chain,
      opacity: 0.6,
      marker: { color: s.color },
    }));
    const layout = {
      ...getLayout(options),
      title: { text: `Distribution: ${currentVar}` },
      barmode: 'overlay' as const,
      xaxis: { ...getLayout(options).xaxis as object, title: currentVar },
      yaxis: { ...getLayout(options).yaxis as object, title: 'Count' },
    };
    Plotly.react(container, traces, layout, getConfig());
  }

  render();
  return {
    destroy: () => Plotly.purge(container),
    update: (v) => { if (v) currentVar = v; render(); },
  };
}
