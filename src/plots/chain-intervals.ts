import type { InferenceData } from '../types';
import type { PlotOptions, PlotHandle } from './types';
import { getPlotly, getLayout, getConfig, resolveChainColors } from './types';
import { computeMean, computeHDI } from '../stats/summary';

export function chainIntervalsPlot(
  container: HTMLElement,
  data: InferenceData,
  variable: string,
  options?: PlotOptions,
): PlotHandle {
  const Plotly = getPlotly();
  let currentVar = variable;

  function render() {
    const colors = resolveChainColors(options);
    const chainSummaries = data.chainNames.map((chain, index) => {
      const draws = data.getDraws(currentVar, chain);
      const mean = computeMean(draws);
      const hdi90 = computeHDI(draws, 0.9);
      return {
        chain,
        mean,
        hdi90,
        color: colors[index % colors.length],
      };
    });

    const overallStats = data.variableStats(currentVar);
    const minX = Math.min(...chainSummaries.map(s => s.hdi90[0]), overallStats.hdi90[0]);
    const maxX = Math.max(...chainSummaries.map(s => s.hdi90[1]), overallStats.hdi90[1]);

    const traces = [{
      x: chainSummaries.map(s => s.mean),
      y: chainSummaries.map(s => s.chain),
      type: 'scatter' as const,
      mode: 'markers' as const,
      name: 'Chain mean',
      marker: {
        size: 11,
        color: chainSummaries.map(s => s.color),
        line: { width: 1.5, color: '#ffffff' },
      },
      error_x: {
        type: 'data' as const,
        symmetric: false,
        array: chainSummaries.map(s => s.hdi90[1] - s.mean),
        arrayminus: chainSummaries.map(s => s.mean - s.hdi90[0]),
        thickness: 2,
        width: 0,
        color: '#94a3b8',
      },
      customdata: chainSummaries.map(s => [
        s.hdi90[0].toFixed(3),
        s.hdi90[1].toFixed(3),
      ]),
      hovertemplate: '%{y}<br>Mean=%{x:.3f}<br>90% HDI=[%{customdata[0]}, %{customdata[1]}]<extra></extra>',
    }];

    const layout = {
      ...getLayout(options),
      title: { text: `Chain Intervals: ${currentVar}` },
      xaxis: {
        ...getLayout(options).xaxis as object,
        title: currentVar,
        range: [minX, maxX],
      },
      yaxis: { ...getLayout(options).yaxis as object, automargin: true },
      shapes: [
        {
          type: 'rect' as const,
          x0: overallStats.hdi90[0],
          x1: overallStats.hdi90[1],
          yref: 'paper' as const,
          y0: 0,
          y1: 1,
          fillcolor: options?.theme === 'light' ? 'rgba(14, 165, 233, 0.08)' : 'rgba(56, 189, 248, 0.10)',
          line: { width: 0 },
          layer: 'below' as const,
        },
        {
          type: 'line' as const,
          x0: overallStats.mean,
          x1: overallStats.mean,
          yref: 'paper' as const,
          y0: 0,
          y1: 1,
          line: { color: '#f59e0b', width: 2, dash: 'dash' as const },
        },
      ],
      annotations: [{
        x: overallStats.mean,
        y: 1.02,
        yref: 'paper' as const,
        text: `Overall mean ${overallStats.mean.toFixed(3)}`,
        showarrow: false,
        font: { size: 11, color: options?.theme === 'light' ? '#92400e' : '#fbbf24' },
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
