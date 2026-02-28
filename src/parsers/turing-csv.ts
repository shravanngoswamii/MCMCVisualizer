import type { ChainData } from '../types';
import { splitLines, parseCSVLine } from '../utils';

export function parseTuringCSV(text: string): Map<string, ChainData> {
  const lines = splitLines(text);
  if (lines.length === 0) throw new Error('Empty input');

  const firstFields = parseCSVLine(lines[0]!);

  if (firstFields[0] === 'iteration' && firstFields[1] === 'chain') {
    return parseWideFormat(lines, 'iteration', 'chain');
  }
  if (firstFields[0] === 'chain_' && firstFields[1] === 'draw_') {
    return parseWideFormat(lines, 'chain_', 'draw_');
  }

  if (firstFields.length === 4 && !isNaN(parseFloat(firstFields[2]!))) {
    return parseLongFormat(lines);
  }

  throw new Error('Unrecognized Turing CSV format');
}

function parseLongFormat(lines: string[]): Map<string, ChainData> {
  const raw = new Map<string, Map<string, number[]>>();

  for (const line of lines) {
    const fields = parseCSVLine(line);
    if (fields.length < 4) continue;
    const chainName = fields[0]!;
    const varName = fields[1]!;
    const value = parseFloat(fields[3]!);
    if (isNaN(value)) continue;

    let chainVars = raw.get(chainName);
    if (!chainVars) {
      chainVars = new Map();
      raw.set(chainName, chainVars);
    }
    let values = chainVars.get(varName);
    if (!values) {
      values = [];
      chainVars.set(varName, values);
    }
    values.push(value);
  }

  return buildChainData(raw);
}

function parseWideFormat(
  lines: string[],
  chainCol: string,
  drawCol: string,
): Map<string, ChainData> {
  const headers = parseCSVLine(lines[0]!);
  const chainIdx = headers.indexOf(chainCol === 'chain_' ? 'chain_' : 'chain');
  const drawIdx = headers.indexOf(drawCol === 'draw_' ? 'draw_' : 'iteration');

  const isChainFirst = chainCol === 'chain_';

  const variableNames = headers.filter(
    (_, i) =>
      i !== (isChainFirst ? 0 : headers.indexOf('iteration')) &&
      i !== (isChainFirst ? 1 : headers.indexOf('chain')),
  );

  const variableIndices = variableNames.map(v => headers.indexOf(v));

  const raw = new Map<string, Map<string, number[]>>();

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]!);
    if (fields.length < headers.length) continue;

    const chainName = isChainFirst ? fields[0]! : fields[chainIdx]!;

    let chainVars = raw.get(chainName);
    if (!chainVars) {
      chainVars = new Map();
      raw.set(chainName, chainVars);
    }

    for (let j = 0; j < variableNames.length; j++) {
      const varName = variableNames[j]!;
      const value = parseFloat(fields[variableIndices[j]!]!);
      if (isNaN(value)) continue;

      let values = chainVars.get(varName);
      if (!values) {
        values = [];
        chainVars.set(varName, values);
      }
      values.push(value);
    }
  }

  return buildChainData(raw);
}

function buildChainData(raw: Map<string, Map<string, number[]>>): Map<string, ChainData> {
  const chains = new Map<string, ChainData>();

  for (const [chainName, vars] of raw) {
    const draws = new Map<string, Float64Array>();
    let maxLen = 0;
    for (const [varName, values] of vars) {
      const arr = new Float64Array(values);
      draws.set(varName, arr);
      maxLen = Math.max(maxLen, arr.length);
    }
    chains.set(chainName, { name: chainName, draws, drawCount: maxLen });
  }

  return chains;
}
