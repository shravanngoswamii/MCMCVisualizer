/**
 * Trace plot — sequential parameter values per chain over iterations.
 *
 * Two entry points:
 *   tracePlotSpec()  — returns a plain PlotSpec object. No DOM, no Plotly.
 *                      Works in Node.js, CLI, React/Vue wrappers, AI agents.
 *   tracePlot()      — renders directly to an HTMLElement (browser only).
 */

import type { InferenceData } from '../types';
import type { PlotOptions, PlotHandle, PlotSpec } from './types';
import { getPlotly, getLayout, getConfig, CHAIN_COLORS, resolveChainColors } from './types';

// ============================================================================
// Framework-agnostic spec
// ============================================================================

/** Build a Plotly trace-plot spec without touching the DOM or requiring Plotly. */
export function tracePlotSpec(
  data:     InferenceData,
  variable: string,
  options?: PlotOptions,
): PlotSpec {
  const traces = data.chainNames.map((chain, i) => ({
    y:    Array.from(data.getDraws(variable, chain)),
    type: 'scatter' as const,
    mode: 'lines'   as const,
    name: chain,
    line: { width: 0.8, color: resolveChainColors(options)[i % resolveChainColors(options).length] },
  }));

  const base = getLayout(options);
  const layout = {
    ...base,
    title:  { text: `Trace: ${variable}` },
    xaxis:  { ...(base['xaxis'] as object), title: { text: 'Iteration' } },
    yaxis:  { ...(base['yaxis'] as object), title: { text: variable } },
    legend: { orientation: 'h' as const, y: -0.15 },
  };

  return { data: traces, layout, config: getConfig() };
}

// ============================================================================
// DOM-rendering version (browser only)
// ============================================================================

/** Render a trace plot into an HTMLElement. Returns a handle for updates/cleanup. */
export function tracePlot(
  container: HTMLElement,
  data:      InferenceData,
  variable:  string,
  options?:  PlotOptions,
): PlotHandle {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Plotly = getPlotly() as any;
  let currentVar = variable;

  function render(): void {
    const spec = tracePlotSpec(data, currentVar, options);
    Plotly.react(container, spec.data, spec.layout, spec.config);
  }

  render();

  return {
    destroy: () => Plotly.purge(container),
    update:  (v?: string) => { if (v) currentVar = v; render(); },
  };
}
