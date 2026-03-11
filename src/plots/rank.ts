import type { InferenceData } from '../types';
import type { PlotOptions, PlotHandle } from './types';
import { getPlotly, getLayout, getConfig, CHAIN_COLORS } from './types';

export function rankPlot(
  container: HTMLElement,
  data: InferenceData,
  variable: string,
  options?: PlotOptions,
): PlotHandle {
  const Plotly = getPlotly();
  let currentVar = variable;

  function render() {
    const allDraws: number[] = [];
    const chainDraws: Float64Array[] = [];
    for (const chain of data.chainNames) {
      const d = data.getDraws(currentVar, chain);
      chainDraws.push(d);
      for (let i = 0; i < d.length; i++) allDraws.push(d[i]!);
    }

    const sorted = [...allDraws].sort((a, b) => a - b);
    const rankMap = new Map<number, number>();
    for (let i = 0; i < sorted.length; i++) {
      if (!rankMap.has(sorted[i]!)) rankMap.set(sorted[i]!, i + 1);
    }

    const nBins = 20;
    const totalN = allDraws.length;
    const traces = data.chainNames.map((chain, ci) => {
      const draws = chainDraws[ci]!;
      const ranks: number[] = [];
      for (let i = 0; i < draws.length; i++) {
        ranks.push(rankMap.get(draws[i]!)! / totalN);
      }
      return {
        x: ranks,
        type: 'histogram' as const,
        name: chain,
        nbinsx: nBins,
        opacity: 0.6,
        marker: { color: CHAIN_COLORS[ci % CHAIN_COLORS.length] },
      };
    });

    const layout = {
      ...getLayout(options),
      title: { text: `Rank Histogram: ${currentVar}` },
      barmode: 'overlay' as const,
      xaxis: { ...getLayout(options).xaxis as object, title: 'Normalized Rank' },
      yaxis: { ...getLayout(options).yaxis as object, title: 'Count' },
      shapes: [{
        type: 'line' as const,
        x0: 0, x1: 1,
        y0: totalN / data.chainNames.length / nBins,
        y1: totalN / data.chainNames.length / nBins,
        line: { color: '#888', width: 1.5, dash: 'dash' as const },
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
