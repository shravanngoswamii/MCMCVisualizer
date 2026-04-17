import type { InferenceData } from "../types";
import type { PlotOptions, PlotHandle, PlotSpec } from "./types";
import { getPlotly, getLayout, getConfig, resolveChainColors } from "./types";
import type { TracePlotData } from "./data-types";

/** Compute trace plot data — no DOM, no Plotly. Pass to any renderer. */
export function getTracePlotData(
	data: InferenceData,
	variable: string,
	opts?: PlotOptions,
): TracePlotData {
	const colors = resolveChainColors(opts);
	return {
		variable,
		series: data.chainNames.map((chain, i) => ({
			chain,
			iterations: Array.from(
				{ length: data.getDraws(variable, chain).length },
				(_, j) => j + 1,
			),
			values: data.getDraws(variable, chain),
			color: colors[i % colors.length] ?? "#636EFA",
		})),
	};
}

/** Plotly JSON spec — no DOM required. */
export function tracePlotSpec(
	data: InferenceData,
	variable: string,
	opts?: PlotOptions,
): PlotSpec {
	const { series } = getTracePlotData(data, variable, opts);
	const base = getLayout(opts);
	return {
		data: series.map((s) => ({
			x: s.iterations,
			y: Array.from(s.values),
			type: "scatter" as const,
			mode: "lines" as const,
			name: s.chain,
			line: { width: 0.8, color: s.color },
		})),
		layout: {
			...base,
			title: { text: `Trace: ${variable}` },
			xaxis: { ...(base["xaxis"] as object), title: { text: "Iteration" } },
			yaxis: { ...(base["yaxis"] as object), title: { text: variable } },
			legend: { orientation: "h" as const, y: -0.15 },
		},
		config: getConfig(),
	};
}

/** Render into an HTMLElement (Plotly adapter). */
export function tracePlot(
	container: HTMLElement,
	data: InferenceData,
	variable: string,
	opts?: PlotOptions,
): PlotHandle {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const Plotly = getPlotly() as any;
	let currentVar = variable;
	const render = () => {
		const spec = tracePlotSpec(data, currentVar, opts);
		Plotly.react(container, spec.data, spec.layout, spec.config);
	};
	render();
	return {
		destroy: () => Plotly.purge(container),
		update: (v?: string) => {
			if (v) currentVar = v;
			render();
		},
	};
}
