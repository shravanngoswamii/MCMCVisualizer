export function computeRhat(
  chainMeans: number[],
  chainStdevs: number[],
  chainCounts: number[],
): number | undefined {
  if (chainMeans.length <= 1) return undefined;
  for (const c of chainCounts) {
    if (c <= 1) return undefined;
  }

  const m = chainMeans.length;
  const meanChainLength = mean(chainCounts);
  if (meanChainLength === undefined) return undefined;

  const vars = chainStdevs.map((s, i) => (s * s * chainCounts[i]!) / (chainCounts[i]! - 1));

  const stdevOfMeans = stdev(chainMeans);
  if (stdevOfMeans === undefined) return undefined;

  const varOfMeans = (stdevOfMeans * stdevOfMeans * m) / (m - 1);
  const meanOfVars = mean(vars);
  if (meanOfVars === undefined || meanOfVars === 0) return undefined;

  return Math.sqrt((meanChainLength - 1) / meanChainLength + varOfMeans / meanOfVars);
}

function mean(arr: number[]): number | undefined {
  if (arr.length === 0) return undefined;
  let sum = 0;
  for (const v of arr) sum += v;
  return sum / arr.length;
}

function stdev(arr: number[]): number | undefined {
  if (arr.length <= 1) return undefined;
  const m = mean(arr)!;
  let sumsq = 0;
  for (const v of arr) sumsq += v * v;
  return Math.sqrt(sumsq / arr.length - m * m);
}
