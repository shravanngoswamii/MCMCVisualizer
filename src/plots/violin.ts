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
				x: allDraws,
				y0: varName,
				name: varName,
				orientation: "h" as const,
				side: "both" as const,
				box: { visible: true, width: 0.15 },
				meanline: { visible: true },
				line: { color: colors[vi % colors.length], width: 1.5 },
				fillcolor: colorWithAlpha(colors[vi % colors.length]!, 0.35),
				opacity: 0.9,
				spanmode: "soft" as const,
				bandwidth: undefined,
				width: 0.7,
				scalemode: "width" as const,
				hovertemplate: "%{x:.4f}<extra>%{fullData.name}</extra>",
			};
		});

		const nVars = data.variableNames.length;
		const base = getLayout(options);
		const layout = {
			...base,
			title: { text: "Violin Plot", ...(base["title"] as object) },
			xaxis: {
				...(base["xaxis"] as object),
				title: {
					text: "Value",
					...(((base["xaxis"] as Record<string, unknown>)?.["title"] as object) || {}),
				},
			},
			yaxis: {
				...(base["yaxis"] as object),
				automargin: true,
			},
			showlegend: false,
			height: Math.max(350, nVars * 100 + 120),
			margin: { ...(base["margin"] as object), l: 120 },
		};

		Plotly.react(container, traces, layout, getConfig());
	}

	render();
	return {
		destroy: () => Plotly.purge(container),
		update: () => render(),
	};
}
