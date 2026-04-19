import type { InferenceData } from "../types";
import type { PlotOptions, PlotHandle } from "./types";
import type { HistogramPlotData } from "./data-types";
import {
	getPlotly,
	getLayout,
	getConfig,
	resolveChainColors,
	colorWithAlpha,
} from "./types";

export function getHistogramPlotData(
	data: InferenceData,
	variable: string,
	opts?: PlotOptions,
): HistogramPlotData {
	const colors = resolveChainColors(opts);
	const series = data.chainNames.map((chain, i) => ({
		chain,
		draws: data.getDraws(variable, chain),
		color: colors[i % colors.length]!,
	}));
	return { variable, series };
}

export function histogramPlot(
	container: HTMLElement,
	data: InferenceData,
	variable: string,
	options?: PlotOptions,
): PlotHandle {
	const Plotly = getPlotly();
	let currentVar = variable;

	function render() {
		const plotData = getHistogramPlotData(data, currentVar, options);
		const traces = plotData.series.map((s) => ({
			x: Array.from(s.draws),
			type: "histogram" as const,
			name: s.chain,
			opacity: 0.65,
			marker: { color: colorWithAlpha(s.color, 0.7), line: { color: s.color, width: 1 } },
			hovertemplate: "%{x:.3f}: %{y}<extra>%{fullData.name}</extra>",
		}));
		const base = getLayout(options);
		const layout = {
			...base,
			title: { text: `Distribution: ${currentVar}`, ...(base["title"] as object) },
			barmode: "overlay" as const,
			xaxis: {
				...(base["xaxis"] as object),
				title: { text: currentVar, ...(((base["xaxis"] as Record<string, unknown>)?.["title"] as object) || {}) },
			},
			yaxis: {
				...(base["yaxis"] as object),
				title: { text: "Count", ...(((base["yaxis"] as Record<string, unknown>)?.["title"] as object) || {}) },
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
