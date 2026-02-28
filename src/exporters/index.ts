import type { InferenceData } from '../types';
import { toStanName } from '../utils';

export function toTuringCSV(data: InferenceData): string {
  const lines: string[] = [];
  for (const chainName of data.chainNames) {
    const chain = data.chains.get(chainName)!;
    for (const varName of data.variableNames) {
      const draws = chain.draws.get(varName);
      if (!draws) continue;
      for (let i = 0; i < draws.length; i++) {
        lines.push(`${chainName},${varName},${i},${draws[i]}`);
      }
    }
  }
  return lines.join('\n');
}

export function toMCMCChainsCSV(data: InferenceData): string {
  const lines: string[] = [];
  lines.push(['iteration', 'chain', ...data.variableNames].join(','));
  for (const chainName of data.chainNames) {
    const chain = data.chains.get(chainName)!;
    for (let i = 0; i < chain.drawCount; i++) {
      const vals: string[] = [`${i + 1}`, chainName];
      for (const v of data.variableNames) {
        const draws = chain.draws.get(v);
        vals.push(draws && i < draws.length ? `${draws[i]}` : '');
      }
      lines.push(vals.join(','));
    }
  }
  return lines.join('\n');
}

export function toStanCSV(data: InferenceData): string {
  const sections: string[] = [];
  for (let ci = 0; ci < data.chainNames.length; ci++) {
    const chainName = data.chainNames[ci]!;
    const chain = data.chains.get(chainName)!;

    const lines: string[] = [];
    lines.push(`# Stan CSV export - ${chainName}`);
    lines.push(`# model = mcmc-visualizer export`);
    lines.push(`# method = sample`);

    const stanNames = data.variableNames.map(toStanName);
    const headerCols = ['lp__', 'accept_stat__', ...stanNames];
    lines.push(headerCols.join(','));

    for (let i = 0; i < chain.drawCount; i++) {
      const vals: string[] = ['0', '1'];
      for (const v of data.variableNames) {
        const draws = chain.draws.get(v);
        vals.push(draws && i < draws.length ? `${draws[i]}` : '');
      }
      lines.push(vals.join(','));
    }

    sections.push(lines.join('\n'));
  }
  return sections.join('\n\n');
}

export function toWideCSV(data: InferenceData): string {
  const lines: string[] = [];
  lines.push(['chain_', 'draw_', ...data.variableNames].join(','));

  for (const chainName of data.chainNames) {
    const chain = data.chains.get(chainName)!;
    for (let i = 0; i < chain.drawCount; i++) {
      const vals: string[] = [chainName, `${i + 1}`];
      for (const v of data.variableNames) {
        const draws = chain.draws.get(v);
        vals.push(draws && i < draws.length ? `${draws[i]}` : '');
      }
      lines.push(vals.join(','));
    }
  }

  return lines.join('\n');
}

export function toJSON(data: InferenceData): string {
  const result: Record<string, Record<string, number[]>> = {};
  for (const chainName of data.chainNames) {
    const chain = data.chains.get(chainName)!;
    const chainObj: Record<string, number[]> = {};
    for (const varName of data.variableNames) {
      const draws = chain.draws.get(varName);
      chainObj[varName] = draws ? Array.from(draws) : [];
    }
    result[chainName] = chainObj;
  }
  return JSON.stringify(result, null, 2);
}

export function toMCMCChainsJSON(data: InferenceData): string {
  const nIter = data.drawCount;
  const nParams = data.variableNames.length;
  const nChains = data.chainNames.length;

  const flat: (number | null)[] = new Array(nIter * nParams * nChains);
  for (let c = 0; c < nChains; c++) {
    const chain = data.chains.get(data.chainNames[c]!)!;
    for (let p = 0; p < nParams; p++) {
      const draws = chain.draws.get(data.variableNames[p]!);
      for (let i = 0; i < nIter; i++) {
        const flatIdx = i + p * nIter + c * nIter * nParams;
        flat[flatIdx] = draws && i < draws.length ? draws[i]! : null;
      }
    }
  }

  const obj = {
    size: [nIter, nParams, nChains],
    value_flat: flat,
    iterations: Array.from({ length: nIter }, (_, i) => i + 1),
    parameters: data.variableNames,
    chains: Array.from({ length: nChains }, (_, i) => i + 1),
    logevidence: null,
    name_map: { parameters: data.variableNames, internals: [] as string[] },
    info: {},
  };
  return JSON.stringify(obj);
}
