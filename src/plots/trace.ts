import type { InferenceData } from '../types';
import type { PlotOptions, PlotHandle } from './types';
import { getPlotly, getLayout, getConfig, CHAIN_COLORS } from './types';

export function tracePlot(
  container: HTMLElement,
  data: InferenceData,
  variable: string,
  options?: PlotOptions,
): PlotHandle {
  const Plotly = getPlotly();
  let currentVar = variable;

  function render() {
    const traces = data.chainNames.map((chain, i) => ({
      y: Array.from(data.getDraws(currentVar, chain)),
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: chain,
      line: { width: 0.8, color: CHAIN_COLORS[i % CHAIN_COLORS.length] },
    }));
    const layout = {
      ...getLayout(options),
      title: { text: `Trace: ${currentVar}` },
      xaxis: { ...getLayout(options).xaxis as object, title: 'Iteration' },
      yaxis: { ...getLayout(options).yaxis as object, title: currentVar },
    };
    Plotly.react(container, traces, layout, getConfig());
  }

  render();
  return {
    destroy: () => Plotly.purge(container),
    update: (v) => { if (v) currentVar = v; render(); },
  };
}
