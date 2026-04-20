import type { InferenceData } from "../types";
import type { PlotOptions, PlotHandle } from "./types";
import {
	getPlotly,
	getLayout,
	getConfig,
	resolveChainColors,
	colorWithAlpha,
} from "./types";

export interface ScatterPlotOptions extends PlotOptions {
	markerSize?: number;
	markerOpacity?: number;
}

export function scatterPlot(
	container: HTMLElement,
	data: InferenceData,
	variableX: string,
	variableY: string,
	options?: ScatterPlotOptions,
): PlotHandle {
	const Plotly = getPlotly();
	let curX = variableX;
	let curY = variableY;

	function render() {
		const colors = resolveChainColors(options);
		const size = options?.markerSize ?? 4;
		const opacity = options?.markerOpacity ?? 0.65;

		const traces = data.chainNames.map((chain, i) => ({
			x: Array.from(data.getDraws(curX, chain)),
			y: Array.from(data.getDraws(curY, chain)),
			type: "scatter" as const,
			mode: "markers" as const,
			name: chain,
			marker: {
				size,
				opacity,
				color: colors[i % colors.length],
				line: { width: 0.3, color: colorWithAlpha(colors[i % colors.length]!, 0.8) },
			},
			hovertemplate: `${curX}: %{x:.3f}<br>${curY}: %{y:.3f}<extra>%{fullData.name}</extra>`,
		}));

		const base = getLayout(options);
		const layout = {
			...base,
			title: { text: `${curX} vs ${curY}`, ...(base["title"] as object) },
			xaxis: {
				...(base["xaxis"] as object),
				title: { text: curX, ...(((base["xaxis"] as Record<string, unknown>)?.["title"] as object) || {}) },
			},
			yaxis: {
				...(base["yaxis"] as object),
				title: { text: curY, ...(((base["yaxis"] as Record<string, unknown>)?.["title"] as object) || {}) },
			},
			hovermode: "closest",
		};

		Plotly.react(container, traces, layout, getConfig());
	}

	render();
	return {
		destroy: () => Plotly.purge(container),
		update: (v?: string) => {
			if (v) curY = v;
			render();
		},
	};
}

export function scatter3dPlot(
	container: HTMLElement,
	data: InferenceData,
	variableX: string,
	variableY: string,
	variableZ: string,
	options?: ScatterPlotOptions,
): PlotHandle {
	const Plotly = getPlotly();
	let curX = variableX;
	let curY = variableY;
	let curZ = variableZ;

	function render() {
		const colors = resolveChainColors(options);
		const size = options?.markerSize ?? 3;
		const opacity = options?.markerOpacity ?? 0.6;

		const traces = data.chainNames.map((chain, i) => ({
			x: Array.from(data.getDraws(curX, chain)),
			y: Array.from(data.getDraws(curY, chain)),
			z: Array.from(data.getDraws(curZ, chain)),
			type: "scatter3d" as const,
			mode: "markers" as const,
			name: chain,
			marker: {
				size,
				opacity,
				color: colors[i % colors.length],
				line: { width: 0.2, color: colorWithAlpha(colors[i % colors.length]!, 0.7) },
			},
			hovertemplate: `${curX}: %{x:.3f}<br>${curY}: %{y:.3f}<br>${curZ}: %{z:.3f}<extra>%{fullData.name}</extra>`,
		}));

		const base = getLayout(options);
		const layout = {
			...base,
			title: { text: `${curX} × ${curY} × ${curZ}`, ...(base["title"] as object) },
			scene: {
				xaxis: { title: curX, gridcolor: (base["xaxis"] as Record<string, unknown>)?.["gridcolor"] },
				yaxis: { title: curY, gridcolor: (base["yaxis"] as Record<string, unknown>)?.["gridcolor"] },
				zaxis: { title: curZ, gridcolor: (base["xaxis"] as Record<string, unknown>)?.["gridcolor"] },
			},
			hovermode: "closest",
		};

		Plotly.react(container, traces, layout, getConfig());
	}

	render();
	return {
		destroy: () => Plotly.purge(container),
		update: (v?: string) => {
			if (v) curZ = v;
			render();
		},
	};
}
