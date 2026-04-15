/**
 * ArviZ InferenceData JSON adapter.
 * Parses output from `az.to_json()` (ArviZ >= 0.11).
 * Gives compatibility with PyMC, NumPyro, Stan, and Turing.jl (via ArviZ.jl).
 */

import type { ChainData } from '../types';

interface ArviZVariable {
  readonly dims: string[];
  readonly data: unknown;
  readonly attrs?: Record<string, unknown>;
}

interface ArviZGroup {
  readonly data_vars: Record<string, ArviZVariable>;
  readonly coords?: Record<string, unknown[]>;
  readonly attrs?: Record<string, unknown>;
}

interface ArviZJSON {
  readonly [groupName: string]: ArviZGroup | undefined;
}

/**
 * Parse an ArviZ JSON string or pre-parsed object.
 * Returns a Map keyed by group name ('posterior', 'sample_stats', etc.).
 */
export function parseArviZJSON(input: string | object): Map<string, Map<string, ChainData>> {
  const json = typeof input === 'string' ? (JSON.parse(input) as ArviZJSON) : (input as ArviZJSON);
  const result = new Map<string, Map<string, ChainData>>();

  for (const [groupName, group] of Object.entries(json)) {
    if (!group || typeof group !== 'object') continue;
    const dataVars = (group as ArviZGroup).data_vars;
    if (!dataVars || typeof dataVars !== 'object') continue;
    const chains = _groupToChains(dataVars);
    if (chains.size > 0) result.set(groupName, chains);
  }

  return result;
}

/**
 * Parse ArviZ JSON and return only the 'posterior' group.
 * Throws if the posterior group is missing.
 */
export function parseArviZJSONPosterior(input: string | object): Map<string, ChainData> {
  const groups    = parseArviZJSON(input);
  const posterior = groups.get('posterior');
  if (!posterior) {
    throw new Error(
      `ArviZ JSON has no "posterior" group. Available: ${[...groups.keys()].join(', ')}`,
    );
  }
  return posterior;
}

function _groupToChains(dataVars: Record<string, ArviZVariable>): Map<string, ChainData> {
  const chainMap = new Map<number, Map<string, number[]>>();

  for (const [varName, variable] of Object.entries(dataVars)) {
    if (!variable?.dims || !variable.data) continue;
    const chainDim = variable.dims.indexOf('chain');
    const drawDim  = variable.dims.indexOf('draw');
    if (chainDim === -1 || drawDim === -1) continue;

    for (const { chainIdx, leafName, draws } of _flattenVariable(varName, variable.data as unknown[][], variable.dims, chainDim, drawDim)) {
      let vars = chainMap.get(chainIdx);
      if (!vars) { vars = new Map(); chainMap.set(chainIdx, vars); }
      vars.set(leafName, draws);
    }
  }

  const chains = new Map<string, ChainData>();
  for (const [chainIdx, vars] of chainMap) {
    const name   = `chain_${chainIdx}`;
    const draws  = new Map<string, Float64Array>();
    let   maxLen = 0;
    for (const [vn, values] of vars) {
      const arr = new Float64Array(values);
      draws.set(vn, arr);
      maxLen = Math.max(maxLen, arr.length);
    }
    chains.set(name, { name, draws, drawCount: maxLen });
  }

  return chains;
}

interface LeafEntry { chainIdx: number; leafName: string; draws: number[] }

function _flattenVariable(
  varName: string,
  data: unknown[][],
  dims: string[],
  chainDim: number,
  drawDim: number,
): LeafEntry[] {
  const nChains   = (data as unknown[]).length;
  const extraDims = dims.filter((_, i) => i !== chainDim && i !== drawDim);
  const leaves: LeafEntry[] = [];

  if (extraDims.length === 0) {
    for (let ci = 0; ci < nChains; ci++) {
      const chainData = (data as unknown[])[ci] as number[];
      if (!Array.isArray(chainData)) continue;
      leaves.push({ chainIdx: ci, leafName: varName, draws: chainData.map(Number) });
    }
    return leaves;
  }

  for (let ci = 0; ci < nChains; ci++) {
    const chainData = (data as unknown[])[ci] as unknown[];
    if (!Array.isArray(chainData)) continue;
    const nDraws  = chainData.length;
    const indices = _enumerateIndices(chainData[0] as unknown[]);

    for (const idx of indices) {
      const leafName = `${varName}[${idx.join(',')}]`;
      const draws    = new Array<number>(nDraws);
      for (let di = 0; di < nDraws; di++) {
        let node: unknown = chainData[di], valid = true;
        for (const i of idx) {
          if (!Array.isArray(node) || i >= (node as unknown[]).length) { valid = false; break; }
          node = (node as unknown[])[i];
        }
        draws[di] = valid ? Number(node) : NaN;
      }
      leaves.push({ chainIdx: ci, leafName, draws });
    }
  }

  return leaves;
}

function _enumerateIndices(node: unknown, prefix: number[] = []): number[][] {
  if (!Array.isArray(node)) return [prefix];
  const result: number[][] = [];
  for (let i = 0; i < (node as unknown[]).length; i++) {
    result.push(..._enumerateIndices((node as unknown[])[i], [...prefix, i]));
  }
  return result;
}
