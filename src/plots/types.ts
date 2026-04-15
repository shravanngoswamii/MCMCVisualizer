export interface PlotOptions {
  height?: number;
  width?: number;
  theme?: 'dark' | 'light';
}

export interface PlotHandle {
  destroy(): void;
  update(variable?: string): void;
}

/**
 * Framework-agnostic Plotly specification.
 *
 * Returned by all `*Spec` functions — works without a DOM, in Node.js,
 * on the CLI, in React/Vue wrappers, and in AI tool responses.
 *
 * ```ts
 * // Browser
 * Plotly.newPlot(el, spec.data, spec.layout, spec.config);
 *
 * // React
 * <Plot data={spec.data} layout={spec.layout} config={spec.config} />
 *
 * // CLI / AI agent
 * console.log(JSON.stringify(spec));
 * ```
 */
export interface PlotSpec {
  readonly data:   unknown[];
  readonly layout: Record<string, unknown>;
  readonly config: Record<string, unknown>;
}

export const CHAIN_COLORS = [
  '#636EFA', '#EF553B', '#00CC96', '#AB63FA',
  '#FFA15A', '#19D3F3', '#FF6692', '#B6E880',
];

const FONT = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export function darkLayout(opts?: PlotOptions): Record<string, unknown> {
  return {
    paper_bgcolor: '#181b26',
    plot_bgcolor:  '#13151e',
    font:   { color: '#eaedf3', family: FONT, size: 12 },
    xaxis:  { gridcolor: '#262a3a', zerolinecolor: '#3a3f52', linecolor: '#2f3447' },
    yaxis:  { gridcolor: '#262a3a', zerolinecolor: '#3a3f52', linecolor: '#2f3447' },
    margin: { t: 40, r: 20, b: 50, l: 60 },
    height: opts?.height,
    width:  opts?.width,
    hoverlabel: { bgcolor: '#1e2130', bordercolor: '#3a3f52', font: { color: '#eaedf3' } },
  };
}

export function lightLayout(opts?: PlotOptions): Record<string, unknown> {
  return {
    paper_bgcolor: '#ffffff',
    plot_bgcolor:  '#f8f9fa',
    font:   { color: '#1a1a1a', family: FONT, size: 12 },
    xaxis:  { gridcolor: '#e5e7eb', zerolinecolor: '#d1d5db', linecolor: '#d1d5db' },
    yaxis:  { gridcolor: '#e5e7eb', zerolinecolor: '#d1d5db', linecolor: '#d1d5db' },
    margin: { t: 40, r: 20, b: 50, l: 60 },
    height: opts?.height,
    width:  opts?.width,
  };
}

export function getLayout(opts?: PlotOptions): Record<string, unknown> {
  return opts?.theme === 'light' ? lightLayout(opts) : darkLayout(opts);
}

export function getConfig(): Record<string, unknown> {
  return {
    responsive: true,
    displaylogo: false,
    toImageButtonOptions: { format: 'png', height: 600, width: 1200, scale: 2 },
  };
}

/**
 * Resolve Plotly from the global scope (browser) or require it (Node.js).
 * Throws a helpful error if neither is available.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPlotly(): any {
  // Browser global
  const g = typeof globalThis !== 'undefined' ? (globalThis as Record<string, unknown>) : undefined;
  if (g?.['Plotly']) return g['Plotly'];

  // Node.js require (optional peer dependency)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('plotly.js-dist-min');
  } catch {
    // intentionally empty
  }

  throw new Error(
    'Plotly.js is not available.\n' +
    'Browser: add <script src="https://cdn.plot.ly/plotly-2.35.0.min.js"></script>\n' +
    'Node.js: npm install plotly.js-dist-min',
  );
}
