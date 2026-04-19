import type { InferenceData } from "../types";
import type { PlotOptions, PlotHandle } from "./types";
import { getPlotly, getLayout, getConfig, resolveChainColors, colorWithAlpha } from "./types";

export function violinPlot(
	container: HTMLElement,
	data: InferenceData,
	options?: PlotOptions,
): PlotHandle {
	const Plotly = getPlotly();

	function render() {
		const colors = resolveChainColors(options);
		const traces = data.variableNames.map((varName, vi) => {
			const allDraws = Array.from(data.getAllDraws(varName));
			return {
				type: "violin" as const,
				y: allDraws,
				name: varName,
				box: { visible: true },
				meanline: { visible: true },
				line: { color: colors[vi % colors.length] },
				fillcolor: colorWithAlpha(colors[vi % colors.length]!, 0.3),
				opacity: 0.85,
				spanmode: "soft" as const,
				hovertemplate: "%{y:.4f}<extra>%{fullData.name}</extra>",
			};
		});

		const base = getLayout(options);
		const layout = {
			...base,
			title: { text: "Violin Plot", ...(base["title"] as object) },
			yaxis: {
				...(base["yaxis"] as object),
				title: { text: "Value", ...(((base["yaxis"] as Record<string, unknown>)?.["title"] as object) || {}) },
			},
			showlegend: false,
			height: Math.max(350, data.variableNames.length * 60 + 150),
		};

		Plotly.react(container, traces, layout, getConfig());
	}

	render();
	return {
		destroy: () => Plotly.purge(container),
		update: () => render(),
	};
}
