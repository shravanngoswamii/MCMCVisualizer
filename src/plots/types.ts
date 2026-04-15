/**
 * Custom theme for full visual control over Plotly output.
 * Pass as `theme` in PlotOptions to override the built-in 'dark' or 'light' presets.
 *
 * Example — match the bayes app's dark design system:
 * ```ts
 * import { BAYES_THEME } from 'mcmc-visualizer/plots';
 * plots.tracePlot(el, data, variable, { theme: BAYES_THEME });
 * ```
 */
export interface CustomTheme {
  /** Plotly paper_bgcolor — outer background. Use 'transparent' to inherit from parent. */
  paper_bgcolor?: string;
  /** Plotly plot_bgcolor — inner chart area. */
  plot_bgcolor?:  string;
  /** Axis/title font. */
  font?:          { color?: string; family?: string; size?: number };
  /** Grid line color. */
  gridcolor?:     string;
  /** Zero-line color (defaults to gridcolor). */
  zerolinecolor?: string;
  /** Hover label colors. */
  hoverlabel?:    { bgcolor?: string; bordercolor?: string; font?: { color?: string } };
  /** Per-chain colors. Replaces the built-in palette for all plot types. */
  chainColors?:   string[];
}

export interface PlotOptions {
  height?: number;
  width?:  number;
  /** Built-in preset or a full CustomTheme object. Defaults to 'dark'. */
  theme?:  'dark' | 'light' | CustomTheme;
}

export interface PlotHandle {
  destroy(): void;
  update(variable?: string): void;
}

export interface PlotSpec {
  readonly data:   unknown[];
  readonly layout: Record<string, unknown>;
  readonly config: Record<string, unknown>;
}

// Default chain colors (Plotly palette)
export const CHAIN_COLORS = [
  '#636EFA', '#EF553B', '#00CC96', '#AB63FA',
  '#FFA15A', '#19D3F3', '#FF6692', '#B6E880',
];

const FONT = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/**
 * Resolve chain colors from PlotOptions.
 * Returns the custom chainColors if supplied, otherwise the built-in palette.
 */
export function resolveChainColors(opts?: PlotOptions): string[] {
  if (opts?.theme && typeof opts.theme === 'object' && opts.theme.chainColors) {
    return opts.theme.chainColors;
  }
  return CHAIN_COLORS;
}

export function darkLayout(opts?: PlotOptions): Record<string, unknown> {
  return {
    paper_bgcolor: '#181b26',
    plot_bgcolor:  '#13151e',
    font:          { color: '#eaedf3', family: FONT, size: 12 },
    xaxis:         { gridcolor: '#262a3a', zerolinecolor: '#3a3f52', linecolor: '#2f3447' },
    yaxis:         { gridcolor: '#262a3a', zerolinecolor: '#3a3f52', linecolor: '#2f3447' },
    margin:        { t: 40, r: 20, b: 50, l: 60 },
    height:        opts?.height,
    width:         opts?.width,
    hoverlabel:    { bgcolor: '#1e2130', bordercolor: '#3a3f52', font: { color: '#eaedf3' } },
  };
}

export function lightLayout(opts?: PlotOptions): Record<string, unknown> {
  return {
    paper_bgcolor: '#ffffff',
    plot_bgcolor:  '#f8f9fa',
    font:          { color: '#1a1a1a', family: FONT, size: 12 },
    xaxis:         { gridcolor: '#e5e7eb', zerolinecolor: '#d1d5db', linecolor: '#d1d5db' },
    yaxis:         { gridcolor: '#e5e7eb', zerolinecolor: '#d1d5db', linecolor: '#d1d5db' },
    margin:        { t: 40, r: 20, b: 50, l: 60 },
    height:        opts?.height,
    width:         opts?.width,
  };
}

function customLayout(ct: CustomTheme, opts?: PlotOptions): Record<string, unknown> {
  const base   = darkLayout(opts);
  const grid   = ct.gridcolor   ?? '#262a3a';
  const zeroline = ct.zerolinecolor ?? grid;
  return {
    ...base,
    ...(ct.paper_bgcolor !== undefined && { paper_bgcolor: ct.paper_bgcolor }),
    ...(ct.plot_bgcolor  !== undefined && { plot_bgcolor:  ct.plot_bgcolor  }),
    ...(ct.font          !== undefined && { font: { ...(base.font as object), ...ct.font } }),
    ...(ct.gridcolor     !== undefined && {
      xaxis: { ...(base.xaxis as object), gridcolor: grid, zerolinecolor: zeroline },
      yaxis: { ...(base.yaxis as object), gridcolor: grid, zerolinecolor: zeroline },
    }),
    ...(ct.hoverlabel    !== undefined && { hoverlabel: { ...(base.hoverlabel as object), ...ct.hoverlabel } }),
  };
}

export function getLayout(opts?: PlotOptions): Record<string, unknown> {
  if (!opts?.theme || opts.theme === 'dark')  return darkLayout(opts);
  if (opts.theme === 'light')                 return lightLayout(opts);
  return customLayout(opts.theme, opts);
}

export function getConfig(): Record<string, unknown> {
  return {
    responsive:              true,
    displaylogo:             false,
    toImageButtonOptions:    { format: 'png', height: 600, width: 1200, scale: 2 },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPlotly(): any {
  const g = typeof globalThis !== 'undefined' ? (globalThis as Record<string, unknown>) : undefined;
  if (g?.['Plotly']) return g['Plotly'];
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('plotly.js-dist-min');
  } catch { /* intentionally empty */ }
  throw new Error(
    'Plotly.js is not available.\n' +
    'Browser: <script src="https://cdn.plot.ly/plotly-2.35.0.min.js"></script>\n' +
    'Node.js: npm install plotly.js-dist-min',
  );
}

/**
 * Pre-built theme matching the bayes app dark design system.
 * Uses the exact background colors, grid colors, and chain palette from the app.
 *
 * ```ts
 * import { plots, BAYES_DARK_THEME } from 'mcmc-visualizer';
 * plots.tracePlot(el, data, variable, { theme: BAYES_DARK_THEME });
 * ```
 */
export const BAYES_DARK_THEME: CustomTheme = {
  paper_bgcolor: 'transparent',
  plot_bgcolor:  'transparent',
  font:          { color: '#FFFFFF', family: "Inter, system-ui, sans-serif", size: 12 },
  gridcolor:     '#7C7C7C',
  zerolinecolor: '#9E9E9E',
  hoverlabel:    { bgcolor: '#222224', bordercolor: '#9E9E9E', font: { color: '#FFFFFF' } },
  // chainColorForIndex palette from bayes app (distinctipy)
  chainColors: [
    '#1E6759', '#2894b2', '#ff8000', '#0080ff',
    '#80bf80', '#470ba7', '#c80b32', '#fd7ee5',
    '#027d30', '#00ffff', '#00ff80', '#9c5a86',
    '#808000', '#8ed7fa', '#80ff00', '#6e52ff',
  ],
};
