import type { InferenceData } from '../types';
import type { PlotOptions, PlotHandle } from './types';
import { getPlotly, getLayout, getConfig, CHAIN_COLORS } from './types';

export function pairPlot(
  container: HTMLElement,
  data: InferenceData,
  variables?: string[],
  options?: PlotOptions,
): PlotHandle {
  const Plotly = getPlotly();
  const vars = variables ?? data.variableNames.slice(0, 4);

  function render() {
    const dimensions = vars.map(v => ({
      label: v,
      values: Array.from(data.getAllDraws(v)),
    }));

    const traces = data.chainNames.map((chain, i) => {
      const dims = vars.map(v => ({
        label: v,
        values: Array.from(data.getDraws(v, chain)),
      }));
      return {
        type: 'splom' as const,
        dimensions: dims,
        name: chain,
        marker: {
          size: 2,
          opacity: 0.3,
          color: CHAIN_COLORS[i % CHAIN_COLORS.length],
        },
        showupperhalf: false,
        diagonal: { visible: true },
      };
    });

    const axisCfg = (theme: string | undefined) => {
      const isDark = theme !== 'light';
      return { gridcolor: isDark ? '#252836' : '#e5e7eb', linecolor: isDark ? '#333' : '#d1d5db' };
    };

    const axisOverrides: Record<string, unknown> = {};
    for (let i = 1; i <= vars.length; i++) {
      axisOverrides[`xaxis${i > 1 ? i : ''}`] = axisCfg(options?.theme);
      axisOverrides[`yaxis${i > 1 ? i : ''}`] = axisCfg(options?.theme);
    }

    const layout = {
      ...getLayout(options),
      ...axisOverrides,
      title: { text: 'Pair Plot' },
      height: Math.max(400, vars.length * 180 + 60),
      dragmode: 'select' as const,
    };

    Plotly.react(container, traces, layout, getConfig());
  }

  render();
  return {
    destroy: () => Plotly.purge(container),
    update: () => render(),
  };
}
