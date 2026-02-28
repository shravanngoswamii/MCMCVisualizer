import type { ChainData } from '../types';
import { splitLines, parseCSVLine, fromStanName } from '../utils';

export function parseStanCSV(text: string): Map<string, ChainData> {
  return parseStanCSVFiles([text]);
}

export function parseStanCSVFiles(files: string[]): Map<string, ChainData> {
  const chains = new Map<string, ChainData>();

  for (let idx = 0; idx < files.length; idx++) {
    const text = files[idx]!;
    const chainName = `chain#${idx + 1}`;
    const lines = splitLines(text);

    const dataLines = lines.filter(l => !l.startsWith('#'));
    if (dataLines.length < 2) continue;

    const headers = parseCSVLine(dataLines[0]!);
    const keepIndices: number[] = [];
    const varNames: string[] = [];

    for (let i = 0; i < headers.length; i++) {
      const h = headers[i]!;
      if (!h.endsWith('__')) {
        keepIndices.push(i);
        varNames.push(fromStanName(h));
      }
    }

    const draws = new Map<string, number[]>();
    for (const v of varNames) draws.set(v, []);

    for (let i = 1; i < dataLines.length; i++) {
      const fields = parseCSVLine(dataLines[i]!);
      if (fields.length < headers.length) continue;

      for (let j = 0; j < keepIndices.length; j++) {
        const value = parseFloat(fields[keepIndices[j]!]!);
        if (!isNaN(value)) {
          draws.get(varNames[j]!)!.push(value);
        }
      }
    }

    const typedDraws = new Map<string, Float64Array>();
    let maxLen = 0;
    for (const [v, arr] of draws) {
      const typed = new Float64Array(arr);
      typedDraws.set(v, typed);
      maxLen = Math.max(maxLen, typed.length);
    }

    chains.set(chainName, { name: chainName, draws: typedDraws, drawCount: maxLen });
  }

  return chains;
}
