import type { InferenceData } from '../types';
import type { PlotOptions, PlotHandle } from './types';
import { getPlotly, getLayout, getConfig, resolveChainColors } from './types';

export function energyPlot(
  container: HTMLElement,
  data: InferenceData,
  options?: PlotOptions,
): PlotHandle {
  const Plotly = getPlotly();

  function render() {
    const colors = resolveChainColors(options);
    const hasEnergy = data.variableNames.some(
      v => v === 'energy__' || v === 'energy' || v === 'lp__' || v === 'log_density'
    );

    const energyVar = ['energy__', 'energy', 'lp__', 'log_density']
      .find(v => data.variableNames.includes(v));

    if (!energyVar) {
      container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;min-height:200px;color:#5c6278;font-size:0.85rem;font-family:Inter,system-ui,sans-serif">
        <div style="text-align:center">
          <div style="font-size:1.5rem;margin-bottom:8px;opacity:0.4">&#9889;</div>
          <div>No energy/log-density variable found</div>
          <div style="font-size:0.75rem;margin-top:4px;opacity:0.6">Requires: energy__, energy, lp__, or log_density</div>
        </div>
      </div>`;
      return;
    }

    const traces: any[] = [];

    data.chainNames.forEach((chain, i) => {
      const draws = Array.from(data.getDraws(energyVar, chain));

      traces.push({
        x: draws,
        type: 'histogram' as const,
        name: `${chain} (marginal)`,
        opacity: 0.5,
        marker: { color: colors[i % colors.length] },
        histnorm: 'probability density' as const,
      });

      if (draws.length > 1) {
        const transitions = [];
        for (let j = 1; j < draws.length; j++) {
          transitions.push(draws[j]! - draws[j - 1]!);
        }
        traces.push({
          x: transitions,
          type: 'histogram' as const,
          name: `${chain} (transition)`,
          opacity: 0.3,
          marker: {
            color: colors[i % colors.length],
            line: { color: colors[i % colors.length], width: 1 },
          },
          histnorm: 'probability density' as const,
        });
      }
    });

    const layout = {
      ...getLayout(options),
      title: { text: `Energy: ${energyVar}` },
      barmode: 'overlay' as const,
      xaxis: { ...getLayout(options).xaxis as object, title: energyVar },
      yaxis: { ...getLayout(options).yaxis as object, title: 'Density' },
    };

    Plotly.react(container, traces, layout, getConfig());
  }

  render();
  return {
    destroy: () => Plotly.purge(container),
    update: () => render(),
  };
}
