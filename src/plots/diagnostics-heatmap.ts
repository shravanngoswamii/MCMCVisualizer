import type { VariableSummary, InferenceData } from '../types';
import type { PlotOptions, PlotHandle } from './types';
import type { DiagnosticsHeatmapData } from './data-types';
import { getPlotly, getLayout, getConfig } from './types';

export function getDiagnosticsHeatmapData(
  data: InferenceData,
): DiagnosticsHeatmapData {
  const summaries = data.summary();
  const rows = summaries.map(s => ({
    variable: s.variable,
    essBulk:  s.bulkEss,
    essTail:  s.tailEss,
    rhat:     s.rhat ?? NaN,
  }));
  return { rows };
}

export function diagnosticsHeatmapPlot(
  container: HTMLElement,
  data: InferenceData,
  options?: PlotOptions,
): PlotHandle {
  const Plotly = getPlotly();

  function render() {
    const summaries = data.summary();
    const metrics = [
      {
        label: 'R-hat',
        raw: (summary: VariableSummary) => summary.rhat ?? NaN,
        text: (summary: VariableSummary) => formatValue(summary.rhat),
        score: (summary: VariableSummary) => scoreUpper(summary.rhat, 1.01, 1.10),
      },
      {
        label: 'Split R-hat',
        raw: (summary: VariableSummary) => summary.splitRhat ?? NaN,
        text: (summary: VariableSummary) => formatValue(summary.splitRhat),
        score: (summary: VariableSummary) => scoreUpper(summary.splitRhat, 1.01, 1.10),
      },
      {
        label: 'ESS / draw',
        raw: (summary: VariableSummary) => summary.essPerDraw,
        text: (summary: VariableSummary) => formatValue(summary.essPerDraw),
        score: (summary: VariableSummary) => scoreLower(summary.essPerDraw, 0.25, 0.05),
      },
      {
        label: 'Bulk ESS',
        raw: (summary: VariableSummary) => summary.bulkEss,
        text: (summary: VariableSummary) => integerValue(summary.bulkEss),
        score: (summary: VariableSummary) => scoreLower(summary.bulkEss, 400, 100),
      },
      {
        label: 'Tail ESS',
        raw: (summary: VariableSummary) => summary.tailEss,
        text: (summary: VariableSummary) => integerValue(summary.tailEss),
        score: (summary: VariableSummary) => scoreLower(summary.tailEss, 400, 100),
      },
      {
        label: 'MCSE / sd',
        raw: (summary: VariableSummary) => summary.stdev === 0 ? NaN : summary.mcse / summary.stdev,
        text: (summary: VariableSummary) => summary.stdev === 0 ? '0.000' : formatValue(summary.mcse / summary.stdev),
        score: (summary: VariableSummary) => scoreUpper(summary.stdev === 0 ? 0 : summary.mcse / summary.stdev, 0.02, 0.10),
      },
      {
        label: '|Geweke z|',
        raw: (summary: VariableSummary) => Math.abs(summary.geweke.z),
        text: (summary: VariableSummary) => formatValue(Math.abs(summary.geweke.z)),
        score: (summary: VariableSummary) => scoreUpper(Math.abs(summary.geweke.z), 1.96, 3.0),
      },
    ];

    const x = metrics.map(metric => metric.label);
    const y = summaries.map(summary => summary.variable);
    const z = summaries.map(summary => metrics.map(metric => metric.score(summary)));
    const text = summaries.map(summary => metrics.map(metric => metric.text(summary)));
    const customdata = summaries.map(summary => metrics.map(metric => metric.raw(summary)));

    const layout = {
      ...getLayout(options),
      title: { text: 'Diagnostics Heatmap' },
      xaxis: { ...getLayout(options).xaxis as object, side: 'top' as const },
      yaxis: { ...getLayout(options).yaxis as object, automargin: true, autorange: 'reversed' as const },
      margin: { t: 70, r: 40, b: 40, l: 100 },
    };

    const trace = {
      type: 'heatmap' as const,
      x,
      y,
      z,
      text,
      customdata,
      texttemplate: '%{text}',
      textfont: { size: 11 },
      colorscale: [
        [0, '#10b981'],
        [0.5, '#f59e0b'],
        [1, '#ef4444'],
      ],
      zmin: 0,
      zmax: 1,
      colorbar: { title: 'Risk', thickness: 10 },
      hovertemplate: '%{y}<br>%{x}: %{text}<br>Risk score=%{z:.2f}<extra></extra>',
    };

    Plotly.react(container, [trace], layout, getConfig());
  }

  render();
  return {
    destroy: () => Plotly.purge(container),
    update: () => render(),
  };
}

function clamp(value: number): number {
  if (!isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}

function scoreUpper(value: number | undefined, good: number, bad: number): number {
  if (value === undefined || !isFinite(value)) return 0.5;
  return clamp((value - good) / (bad - good));
}

function scoreLower(value: number | undefined, good: number, bad: number): number {
  if (value === undefined || !isFinite(value)) return 0.5;
  return clamp((good - value) / (good - bad));
}

function formatValue(value: number | undefined): string {
  if (value === undefined || !isFinite(value)) return '—';
  return value.toFixed(3);
}

function integerValue(value: number | undefined): string {
  if (value === undefined || !isFinite(value)) return '—';
  return Math.round(value).toString();
}
