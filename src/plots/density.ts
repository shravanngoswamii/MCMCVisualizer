import type { InferenceData } from "../types";
import type { PlotOptions, PlotHandle } from "./types";
import type { DensityPlotData } from "./data-types";
import {
	getPlotly,
	getLayout,
	getConfig,
	resolveChainColors,
	colorWithAlpha,
} from "./types";

function kde(
	values: Float64Array,
	nPoints = 200,
): { x: number[]; y: number[] } {
	const n = values.length;
	if (n === 0) return { x: [], y: [] };

	let min = values[0]!,
		max = values[0]!;
	let mean = 0;
	for (let i = 0; i < n; i++) {
		if (values[i]! < min) min = values[i]!;
		if (values[i]! > max) max = values[i]!;
		mean += values[i]!;
	}
	mean /= n;

	let variance = 0;
	for (let i = 0; i < n; i++) variance += (values[i]! - mean) ** 2;
	variance /= n;
	const sd = Math.sqrt(variance);

	const sortedCopy = new Float64Array(values);
	sortedCopy.sort();
	const q25 = sortedCopy[Math.floor(n * 0.25)]!;
	const q75 = sortedCopy[Math.floor(n * 0.75)]!;
	const iqr = q75 - q25;

	const h = 0.9 * Math.min(sd, iqr / 1.34) * Math.pow(n, -0.2);
	if (h <= 0 || isNaN(h)) return { x: [], y: [] };

	const pad = 3 * h;
	const xMin = min - pad;
	const xMax = max + pad;
	const step = (xMax - xMin) / (nPoints - 1);

	const x: number[] = [];
	const y: number[] = [];

	for (let i = 0; i < nPoints; i++) {
		const xi = xMin + i * step;
		let density = 0;
		for (let j = 0; j < n; j++) {
			const u = (xi - values[j]!) / h;
			density += Math.exp(-0.5 * u * u);
		}
		density /= n * h * Math.sqrt(2 * Math.PI);
		x.push(xi);
		y.push(density);
	}

	return { x, y };
}

export function getDensityPlotData(
	data: InferenceData,
	variable: string,
	opts?: PlotOptions,
): DensityPlotData {
	const colors = resolveChainColors(opts);
	const curves = data.chainNames.map((chain, i) => {
		const draws = data.getDraws(variable, chain);
		const { x, y } = kde(draws);
		return { chain, x, y, color: colors[i % colors.length]! };
	});
	return { variable, curves };
}

export function densityPlot(
	container: HTMLElement,
	data: InferenceData,
	variable: string,
	options?: PlotOptions,
): PlotHandle {
	const Plotly = getPlotly();
	let currentVar = variable;

	function render() {
		const plotData = getDensityPlotData(data, currentVar, options);
		const traces = plotData.curves.map((curve) => ({
			x: curve.x,
			y: curve.y,
			type: "scatter" as const,
			mode: "lines" as const,
			name: curve.chain,
			fill: "tozeroy" as const,
			fillcolor: colorWithAlpha(curve.color, 0.15),
			line: { width: 2, color: curve.color },
			hovertemplate: "%{y:.4f}<extra>%{fullData.name}</extra>",
		}));

		const base = getLayout(options);
		const layout = {
			...base,
			title: { text: `Density: ${currentVar}`, ...(base["title"] as object) },
			xaxis: {
				...(base["xaxis"] as object),
				title: { text: currentVar, ...(((base["xaxis"] as Record<string, unknown>)?.["title"] as object) || {}) },
			},
			yaxis: {
				...(base["yaxis"] as object),
				title: { text: "Density", ...(((base["yaxis"] as Record<string, unknown>)?.["title"] as object) || {}) },
			},
		};

		Plotly.react(container, traces, layout, getConfig());
	}

	render();
	return {
		destroy: () => Plotly.purge(container),
		update: (v) => {
			if (v) currentVar = v;
			render();
		},
	};
}
