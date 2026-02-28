import type { ChainData } from '../types';

interface MCMCChainsJSON {
  size: [number, number, number];
  value_flat: (number | null)[];
  iterations: number[];
  parameters: string[];
  chains: number[];
  logevidence?: unknown;
  name_map?: Record<string, string[]>;
  info?: Record<string, unknown>;
}

export function parseMCMCChainsJSON(text: string): Map<string, ChainData> {
  const obj = JSON.parse(text) as MCMCChainsJSON;

  if (!obj.size || !obj.value_flat || !obj.parameters || !obj.chains) {
    throw new Error('Invalid MCMCChains JSON: missing required fields (size, value_flat, parameters, chains)');
  }

  const [nIter, nParams, nChains] = obj.size;
  const flat = obj.value_flat;
  const paramNames = obj.parameters;
  const chainIds = obj.chains;

  if (flat.length !== nIter * nParams * nChains) {
    throw new Error(
      `MCMCChains JSON size mismatch: expected ${nIter * nParams * nChains} values, got ${flat.length}`,
    );
  }

  const internals = new Set(obj.name_map?.internals ?? []);

  const chains = new Map<string, ChainData>();

  for (let c = 0; c < nChains; c++) {
    const chainName = `chain#${chainIds[c] ?? c + 1}`;
    const draws = new Map<string, Float64Array>();

    for (let p = 0; p < nParams; p++) {
      const name = paramNames[p]!;
      if (internals.has(name)) continue;

      const arr = new Float64Array(nIter);
      for (let i = 0; i < nIter; i++) {
        const flatIdx = i + p * nIter + c * nIter * nParams;
        const val = flat[flatIdx];
        arr[i] = val === null || val === undefined ? NaN : val;
      }
      draws.set(name, arr);
    }

    chains.set(chainName, { name: chainName, draws, drawCount: nIter });
  }

  return chains;
}

export function isMCMCChainsJSON(text: string): boolean {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith('{')) return false;
  try {
    const obj = JSON.parse(trimmed);
    return (
      Array.isArray(obj.size) &&
      obj.size.length === 3 &&
      Array.isArray(obj.value_flat) &&
      Array.isArray(obj.parameters)
    );
  } catch {
    return false;
  }
}
