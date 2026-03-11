import type { InferenceData } from '../types';
import type { PlotOptions, PlotHandle } from './types';
import { getPlotly, getLayout, getConfig, CHAIN_COLORS } from './types';

export function violinPlot(
  container: HTMLElement,
  data: InferenceData,
  options?: PlotOptions,
): PlotHandle {
  const Plotly = getPlotly();

  function render() {
    const traces = data.variableNames.map((varName, vi) => {
      const allDraws = Array.from(data.getAllDraws(varName));
      return {
        type: 'violin' as const,
        y: allDraws,
        name: varName,
        box: { visible: true },
        meanline: { visible: true },
        line: { color: CHAIN_COLORS[vi % CHAIN_COLORS.length] },
        fillcolor: CHAIN_COLORS[vi % CHAIN_COLORS.length]!.replace(')', ',0.3)').replace('rgb', 'rgba'),
        opacity: 0.85,
        spanmode: 'soft' as const,
      };
    });

    const layout = {
      ...getLayout(options),
      title: { text: 'Violin Plot' },
      yaxis: { ...getLayout(options).yaxis as object, title: 'Value' },
      showlegend: false,
      height: Math.max(350, data.variableNames.length * 60 + 150),
    };

    Plotly.react(container, traces, layout, getConfig());
  }

  render();
  return {
    destroy: () => Plotly.purge(container),
    update: () => render(),
  };
}
