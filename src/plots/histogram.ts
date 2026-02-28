import type { InferenceData } from '../types';
import type { PlotOptions, PlotHandle } from './types';
import { getPlotly, getLayout, getConfig, CHAIN_COLORS } from './types';

export function histogramPlot(
  container: HTMLElement,
  data: InferenceData,
  variable: string,
  options?: PlotOptions,
): PlotHandle {
  const Plotly = getPlotly();
  let currentVar = variable;

  function render() {
    const traces = data.chainNames.map((chain, i) => ({
      x: Array.from(data.getDraws(currentVar, chain)),
      type: 'histogram' as const,
      name: chain,
      opacity: 0.6,
      marker: { color: CHAIN_COLORS[i % CHAIN_COLORS.length] },
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
