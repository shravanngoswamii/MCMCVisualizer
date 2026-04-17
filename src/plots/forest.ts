import type { InferenceData } from '../types';
import type { PlotOptions, PlotHandle } from './types';
import type { ForestPlotData } from './data-types';
import { getPlotly, getLayout, getConfig, resolveChainColors } from './types';

export function getForestPlotData(
  data: InferenceData,
  opts?: PlotOptions,
): ForestPlotData {
  const colors = resolveChainColors(opts);
  const summaries = data.summary();
  const rows = summaries.map(s => ({
    variable: s.variable,
    mean:     s.mean,
    hdiLow:   s.hdi90[0],
    hdiHigh:  s.hdi90[1],
    rhat:     s.rhat ?? NaN,
    essBulk:  s.bulkEss,
  }));
  return { rows, color: colors[0]! };
}

export function forestPlot(
  container: HTMLElement,
  data: InferenceData,
  options?: PlotOptions,
): PlotHandle {
  const Plotly = getPlotly();

  function render() {
    const plotData = getForestPlotData(data, options);
    const { rows, color } = plotData;
    const vars  = rows.map(r => r.variable);
    const means = rows.map(r => r.mean);

    // Retrieve full summaries for IQR trace (q25/q75 not in ForestPlotData rows)
    const summaries = data.summary();

    const hdiTrace = {
      x: means,
      y: vars,
      type: 'scatter' as const,
      mode: 'markers' as const,
      marker: { size: 9, color, symbol: 'diamond' },
      error_x: {
        type: 'data' as const,
        symmetric: false,
        array: rows.map(r => r.hdiHigh - r.mean),
        arrayminus: rows.map(r => r.mean - r.hdiLow),
        thickness: 1.5,
        width: 0,
        color,
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
        color,
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
