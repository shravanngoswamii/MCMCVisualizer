import type { InferenceData } from '../types';
import type { PlotOptions, PlotHandle } from './types';
import { getPlotly, getLayout, getConfig, CHAIN_COLORS } from './types';

export function forestPlot(
  container: HTMLElement,
  data: InferenceData,
  options?: PlotOptions,
): PlotHandle {
  const Plotly = getPlotly();

  function render() {
    const summaries = data.summary();
    const vars = summaries.map(s => s.variable);
    const means = summaries.map(s => s.mean);

    const hdiTrace = {
      x: means,
      y: vars,
      type: 'scatter' as const,
      mode: 'markers' as const,
      marker: { size: 9, color: CHAIN_COLORS[0], symbol: 'diamond' },
      error_x: {
        type: 'data' as const,
        symmetric: false,
        array: summaries.map(s => s.hdi90[1] - s.mean),
        arrayminus: summaries.map(s => s.mean - s.hdi90[0]),
        thickness: 1.5,
        width: 0,
        color: CHAIN_COLORS[0],
      },
      name: '90% HDI',
      showlegend: true,
    };

    const iqrTrace = {
      x: means,
      y: vars,
      type: 'scatter' as const,
      mode: 'markers' as const,
      marker: { size: 0.1, color: 'rgba(0,0,0,0)' },
      error_x: {
        type: 'data' as const,
        symmetric: false,
        array: summaries.map(s => s.quantiles.q75 - s.mean),
        arrayminus: summaries.map(s => s.mean - s.quantiles.q25),
        thickness: 5,
        width: 0,
        color: CHAIN_COLORS[0],
      },
      name: '50% CI (IQR)',
      showlegend: true,
      hoverinfo: 'skip' as const,
    };

    const layout = {
      ...getLayout(options),
      title: { text: 'Forest Plot' },
      height: Math.max(300, vars.length * 50 + 100),
      xaxis: { ...getLayout(options).xaxis as object, title: 'Value', zeroline: true },
      yaxis: { ...getLayout(options).yaxis as object, automargin: true },
      shapes: [{
        type: 'line' as const, x0: 0, x1: 0,
        yref: 'paper' as const, y0: 0, y1: 1,
        line: { color: '#888', width: 1, dash: 'dash' as const },
      }],
    };
    Plotly.react(container, [iqrTrace, hdiTrace], layout, getConfig());
  }

  render();
  return {
    destroy: () => Plotly.purge(container),
    update: () => render(),
  };
}
