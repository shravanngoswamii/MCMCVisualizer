import type { InferenceData } from "../types";
import type { PlotOptions, PlotHandle } from "./types";
import type { RankPlotData } from "./data-types";
import {
	getPlotly,
	getLayout,
	getConfig,
	resolveChainColors,
	colorWithAlpha,
} from "./types";

export function getRankPlotData(
	data: InferenceData,
	variable: string,
	opts?: PlotOptions,
): RankPlotData {
	const colors = resolveChainColors(opts);
	const nBins = 20;

	// Collect all draws to build a global rank map
	const allDraws: number[] = [];
	const chainDraws: Float64Array[] = [];
	for (const chain of data.chainNames) {
		const d = data.getDraws(variable, chain);
		chainDraws.push(d);
		for (let i = 0; i < d.length; i++) allDraws.push(d[i]!);
	}

	const totalN = allDraws.length;
	const sorted = [...allDraws].sort((a, b) => a - b);
	const rankMap = new Map<number, number>();
	for (let i = 0; i < sorted.length; i++) {
		if (!rankMap.has(sorted[i]!)) rankMap.set(sorted[i]!, i + 1);
	}

	// Bin edges: 0, 1/nBins, 2/nBins, ..., (nBins-1)/nBins in normalized-rank space
	const binEdges = Array.from({ length: nBins }, (_, k) => k / nBins);

	const series = data.chainNames.map((chain, ci) => {
		const draws = chainDraws[ci]!;
		const counts = new Array<number>(nBins).fill(0);
		for (let i = 0; i < draws.length; i++) {
			const normRank = rankMap.get(draws[i]!)! / totalN;
			const bin = Math.min(nBins - 1, Math.floor(normRank * nBins));
			counts[bin]!++;
		}
		return {
			chain,
			bins: binEdges,
			counts,
			color: colors[ci % colors.length]!,
		};
	});

	return { variable, nBins, series };
}

export function rankPlot(
	container: HTMLElement,
	data: InferenceData,
	variable: string,
	options?: PlotOptions,
): PlotHandle {
	const Plotly = getPlotly();
	let currentVar = variable;

	function render() {
		const plotData = getRankPlotData(data, currentVar, options);
		const { nBins, series } = plotData;

		// Total draws across all chains (needed for expected line)
		const totalN = series.reduce(
			(sum, s) => sum + s.counts.reduce((a, b) => a + b, 0),
			0,
		);
		const nChains = series.length;

		const traces = series.map((s) => ({
			x: s.bins,
			y: s.counts,
			type: "bar" as const,
			name: s.chain,
			opacity: 0.65,
			marker: { color: colorWithAlpha(s.color, 0.7), line: { color: s.color, width: 1 } },
			hovertemplate: "Rank %{x:.2f}: %{y}<extra>%{fullData.name}</extra>",
		}));

		const base = getLayout(options);
		const layout = {
			...base,
			title: { text: `Rank Histogram: ${currentVar}`, ...(base["title"] as object) },
			barmode: "overlay" as const,
			xaxis: {
				...(base["xaxis"] as object),
				title: { text: "Normalized Rank", ...(((base["xaxis"] as Record<string, unknown>)?.["title"] as object) || {}) },
			},
			yaxis: {
				...(base["yaxis"] as object),
				title: { text: "Count", ...(((base["yaxis"] as Record<string, unknown>)?.["title"] as object) || {}) },
			},
			shapes: [
				{
					type: "line" as const,
					x0: 0,
					x1: 1,
					y0: totalN / nChains / nBins,
					y1: totalN / nChains / nBins,
					line: { color: "#aaa", width: 1.5, dash: "dash" as const },
				},
			],
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
