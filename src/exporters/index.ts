import type { InferenceData } from "../types";

/**
 * Serialize chain data to a plain JSON string for inspection or storage.
 * Structure: { chainName: { variableName: number[] } }
 */
export function toJSON(data: InferenceData): string {
	const result: Record<string, Record<string, number[]>> = {};
	for (const chainName of data.chainNames) {
		result[chainName] = {};
		for (const varName of data.variableNames) {
			result[chainName][varName] = Array.from(
				data.getDraws(varName, chainName),
			);
		}
	}
	return JSON.stringify(result);
}
