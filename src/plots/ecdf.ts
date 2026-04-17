import type { InferenceData } from '../types';
import type { PlotOptions, PlotHandle } from './types';
import type { EcdfPlotData } from './data-types';
import { getPlotly, getLayout, getConfig, resolveChainColors } from './types';

export function getEcdfPlotData(
  data: InferenceData,
  variable: string,
  opts?: PlotOptions,
): EcdfPlotData {
  const colors = resolveChainColors(opts);
  const series = data.chainNames.map((chain, i) => {
    const draws = data.getDraws(variable, chain);
    const sorted = Array.from(draws).sort((a, b) => a - b);
    const n = sorted.length;
    return {
      chain,
      x: sorted,
      y: sorted.map((_, idx) => (idx + 1) / n),
      color: colors[i % colors.length]!,
    };
  });
  return { variable, series };
}

export function ecdfPlot(
  container: HTMLElement,
  data: InferenceData,
  variable: string,
  options?: PlotOptions,
): PlotHandle {
  const Plotly = getPlotly();
  let currentVar = variable;

  function render() {
    const plotData = getEcdfPlotData(data, currentVar, options);
    const traces = plotData.series.map(s => ({
      x: s.x,
      y: s.y,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: s.chain,
      line: { width: 2, shape: 'hv' as const, color: s.color },
    }));

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
