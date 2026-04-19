import type { InferenceData } from "../types";
import type { PlotOptions, PlotHandle } from "./types";
import type { EcdfPlotData } from "./data-types";
import { getPlotly, getLayout, getConfig, resolveChainColors } from "./types";

export function getEcdfPlotData(
	data: InferenceData,
	variable: string,
	opts?: PlotOptions,
): EcdfPlotData {
	const colors = resolveChainColors(opts);
	const series = data.chainNames.map((chain, i) => {
		const draws = data.getDraws(variable, chain);
		const sorted = Array.from(draws).sort((a, b) => a - b);
		const n = sorted.length;
		return {
			chain,
			x: sorted,
			y: sorted.map((_, idx) => (idx + 1) / n),
			color: colors[i % colors.length]!,
		};
	});
	return { variable, series };
}

export function ecdfPlot(
	container: HTMLElement,
	data: InferenceData,
	variable: string,
	options?: PlotOptions,
): PlotHandle {
	const Plotly = getPlotly();
	let currentVar = variable;

	function render() {
		const plotData = getEcdfPlotData(data, currentVar, options);
		const traces = plotData.series.map((s) => ({
			x: s.x,
			y: s.y,
			type: "scatter" as const,
			mode: "lines" as const,
			name: s.chain,
			line: { width: 2, shape: "hv" as const, color: s.color },
			hovertemplate: "%{x:.4f}: P=%{y:.3f}<extra>%{fullData.name}</extra>",
		}));

		const base = getLayout(options);
		const layout = {
			...base,
			title: { text: `Empirical CDF: ${currentVar}`, ...(base["title"] as object) },
			xaxis: {
				...(base["xaxis"] as object),
				title: { text: currentVar, ...(((base["xaxis"] as Record<string, unknown>)?.["title"] as object) || {}) },
			},
			yaxis: {
				...(base["yaxis"] as object),
				title: { text: "Cumulative Probability", ...(((base["yaxis"] as Record<string, unknown>)?.["title"] as object) || {}) },
				range: [0, 1],
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
