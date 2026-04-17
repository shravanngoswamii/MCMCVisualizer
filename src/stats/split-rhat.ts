import { computeMean, computeStdev } from "./summary";

export function computeSplitRhat(chains: Float64Array[]): number | undefined {
	if (chains.length === 0) return undefined;

	const splitChains: Float64Array[] = [];
	for (const chain of chains) {
		const half = Math.floor(chain.length / 2);
		if (half < 2) return undefined;
		splitChains.push(chain.slice(0, half));
		splitChains.push(chain.slice(half, half * 2));
	}

	const m = splitChains.length;
	if (m <= 1) return undefined;

	const means = splitChains.map((c) => computeMean(c));
	const sds = splitChains.map((c) => computeStdev(c));
	const counts = splitChains.map((c) => c.length);

	for (const c of counts) {
		if (c <= 1) return undefined;
	}

	const n = counts.reduce((a, b) => a + b, 0) / m;
	const grandMean = means.reduce((a, b) => a + b, 0) / m;

	let B = 0;
	for (let i = 0; i < m; i++) {
		B += (means[i]! - grandMean) ** 2;
	}
	B = (n / (m - 1)) * B;

	let W = 0;
	for (let i = 0; i < m; i++) {
		W += (sds[i]! * sds[i]! * counts[i]!) / (counts[i]! - 1);
	}
	W /= m;

	if (W === 0) return undefined;

	const varHat = ((n - 1) / n) * W + B / n;
	return Math.sqrt(varHat / W);
}
