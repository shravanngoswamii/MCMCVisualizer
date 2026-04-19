/**
 * Custom theme for full visual control over Plotly output.
 * Pass as `theme` in PlotOptions to override the built-in 'dark' or 'light' presets.
 *
 * ```ts
 * const myTheme: CustomTheme = { paper_bgcolor: 'transparent', font: { color: '#eee' } };
 * plots.tracePlot(el, data, variable, { theme: myTheme });
 * ```
 */
export interface CustomTheme {
	/** Plotly paper_bgcolor — outer background. Use 'transparent' to inherit from parent. */
	paper_bgcolor?: string;
	/** Plotly plot_bgcolor — inner chart area. */
	plot_bgcolor?: string;
	/** Axis/title font. */
	font?: { color?: string; family?: string; size?: number };
	/** Grid line color. */
	gridcolor?: string;
	/** Zero-line color (defaults to gridcolor). */
	zerolinecolor?: string;
	/** Hover label colors. */
	hoverlabel?: {
		bgcolor?: string;
		bordercolor?: string;
		font?: { color?: string };
	};
	/** Per-chain colors. Replaces the built-in palette for all plot types. */
	chainColors?: string[];
}

export interface PlotOptions {
	height?: number;
	width?: number;
	/** Built-in preset or a full CustomTheme object. Defaults to 'dark'. */
	theme?: "dark" | "light" | CustomTheme;
}

export interface PlotHandle {
	destroy(): void;
	update(variable?: string): void;
}

export interface PlotSpec {
	readonly data: unknown[];
	readonly layout: Record<string, unknown>;
	readonly config: Record<string, unknown>;
}

// Default chain colors (Plotly palette)
export const CHAIN_COLORS = [
	"#636EFA",
	"#EF553B",
	"#00CC96",
	"#AB63FA",
	"#FFA15A",
	"#19D3F3",
	"#FF6692",
	"#B6E880",
];

const FONT = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/**
 * Convert any hex color to rgba with given alpha.
 * Handles #RGB, #RRGGBB, and #RRGGBBAA formats.
 */
export function hexToRgba(hex: string, alpha: number): string {
	const h = hex.replace("#", "");
	let r: number, g: number, b: number;
	if (h.length === 3) {
		r = parseInt(h[0]! + h[0]!, 16);
		g = parseInt(h[1]! + h[1]!, 16);
		b = parseInt(h[2]! + h[2]!, 16);
	} else {
		r = parseInt(h.slice(0, 2), 16);
		g = parseInt(h.slice(2, 4), 16);
		b = parseInt(h.slice(4, 6), 16);
	}
	return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Convert a color string to rgba with given alpha.
 * Supports hex (#RRGGBB), rgb(), and rgba() formats.
 */
export function colorWithAlpha(color: string, alpha: number): string {
	if (color.startsWith("#")) return hexToRgba(color, alpha);
	if (color.startsWith("rgba")) {
		return color.replace(/,\s*[\d.]+\)$/, `,${alpha})`);
	}
	if (color.startsWith("rgb(")) {
		return color.replace("rgb(", "rgba(").replace(")", `,${alpha})`);
	}
	return color;
}

/**
 * Resolve chain colors from PlotOptions.
 * Returns the custom chainColors if supplied, otherwise the built-in palette.
 */
export function resolveChainColors(opts?: PlotOptions): string[] {
	if (opts?.theme && typeof opts.theme === "object" && opts.theme.chainColors) {
		return opts.theme.chainColors;
	}
	return CHAIN_COLORS;
}

export function darkLayout(opts?: PlotOptions): Record<string, unknown> {
	return {
		paper_bgcolor: "#181b26",
		plot_bgcolor: "#13151e",
		font: { color: "#eaedf3", family: FONT, size: 12 },
		title: { font: { size: 14, color: "#eaedf3" } },
		xaxis: {
			gridcolor: "#262a3a",
			zerolinecolor: "#3a3f52",
			linecolor: "#2f3447",
			title: { font: { size: 12 }, standoff: 8 },
		},
		yaxis: {
			gridcolor: "#262a3a",
			zerolinecolor: "#3a3f52",
			linecolor: "#2f3447",
			title: { font: { size: 12 }, standoff: 8 },
		},
		margin: { t: 50, r: 24, b: 56, l: 64 },
		height: opts?.height,
		width: opts?.width,
		legend: {
			orientation: "h" as const,
			yanchor: "top",
			y: -0.18,
			xanchor: "center",
			x: 0.5,
			font: { size: 11 },
		},
		hoverlabel: {
			bgcolor: "#1e2130",
			bordercolor: "#3a3f52",
			font: { color: "#eaedf3", size: 12 },
		},
		hovermode: "x unified",
	};
}

export function lightLayout(opts?: PlotOptions): Record<string, unknown> {
	return {
		paper_bgcolor: "#ffffff",
		plot_bgcolor: "#f8f9fa",
		font: { color: "#1a1a1a", family: FONT, size: 12 },
		title: { font: { size: 14, color: "#1a1a1a" } },
		xaxis: {
			gridcolor: "#e5e7eb",
			zerolinecolor: "#d1d5db",
			linecolor: "#d1d5db",
			title: { font: { size: 12 }, standoff: 8 },
		},
		yaxis: {
			gridcolor: "#e5e7eb",
			zerolinecolor: "#d1d5db",
			linecolor: "#d1d5db",
			title: { font: { size: 12 }, standoff: 8 },
		},
		margin: { t: 50, r: 24, b: 56, l: 64 },
		height: opts?.height,
		width: opts?.width,
		legend: {
			orientation: "h" as const,
			yanchor: "top",
			y: -0.18,
			xanchor: "center",
			x: 0.5,
			font: { size: 11 },
		},
		hovermode: "x unified",
	};
}

function customLayout(
	ct: CustomTheme,
	opts?: PlotOptions,
): Record<string, unknown> {
	const base = darkLayout(opts);
	const grid = ct.gridcolor ?? "#262a3a";
	const zeroline = ct.zerolinecolor ?? grid;
	const titleFont = {
		...((base.title as Record<string, unknown>)?.font as object),
		...(ct.font?.color !== undefined && { color: ct.font.color }),
	};
	return {
		...base,
		...(ct.paper_bgcolor !== undefined && { paper_bgcolor: ct.paper_bgcolor }),
		...(ct.plot_bgcolor !== undefined && { plot_bgcolor: ct.plot_bgcolor }),
		...(ct.font !== undefined && {
			font: { ...(base.font as object), ...ct.font },
			title: { ...(base.title as object), font: titleFont },
		}),
		...(ct.gridcolor !== undefined && {
			xaxis: {
				...(base.xaxis as object),
				gridcolor: grid,
				zerolinecolor: zeroline,
			},
			yaxis: {
				...(base.yaxis as object),
				gridcolor: grid,
				zerolinecolor: zeroline,
			},
		}),
		...(ct.hoverlabel !== undefined && {
			hoverlabel: { ...(base.hoverlabel as object), ...ct.hoverlabel },
		}),
	};
}

export function getLayout(opts?: PlotOptions): Record<string, unknown> {
	if (!opts?.theme || opts.theme === "dark") return darkLayout(opts);
	if (opts.theme === "light") return lightLayout(opts);
	return customLayout(opts.theme, opts);
}

export function getConfig(): Record<string, unknown> {
	return {
		responsive: true,
		displaylogo: false,
		toImageButtonOptions: { format: "png", height: 600, width: 1200, scale: 2 },
	};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPlotly(): any {
	const g =
		typeof globalThis !== "undefined"
			? (globalThis as Record<string, unknown>)
			: undefined;
	if (g?.["Plotly"]) return g["Plotly"];
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		return require("plotly.js-dist-min");
	} catch {
		/* intentionally empty */
	}
	throw new Error(
		"Plotly.js is not available.\n" +
			'Browser: <script src="https://cdn.plot.ly/plotly-2.35.0.min.js"></script>\n' +
			"Node.js: npm install plotly.js-dist-min",
	);
}


