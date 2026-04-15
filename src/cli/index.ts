#!/usr/bin/env node
/**
 * mcmc CLI — MCMC analysis from the command line.
 *
 * Commands:  summary | diagnose | rhat | ess | convert | plot
 * Options:   --format json|table  --vars a,b  --chains c1,c2  --warmup N
 *            --from <fmt>  --to <fmt>  --type <plotType>  --stdin  --out <file>
 *
 * Examples:
 *   mcmc summary posterior.json
 *   mcmc diagnose output.csv --format json | jq '.[] | select(.rhat > 1.01)'
 *   mcmc plot posterior.json --type trace --vars mu --theme light > spec.json
 *   cat chains.csv | mcmc ess --stdin
 */

import * as fs       from 'node:fs';
import * as path     from 'node:path';
import * as readline from 'node:readline';

import { MCMCData }                    from '../inference-data';
import { fromAutoDetect, fromTuringCSV, fromStanCSV, fromMCMCChainsJSON } from '../index';
import { parseArviZJSONPosterior }     from '../parsers/arviz-json';
import type { InferenceData, VariableSummary } from '../types';

// ============================================================================
// Entry
// ============================================================================

async function main(): Promise<void> {
  const argv             = process.argv.slice(2);
  const { command, file, flags } = parseArgv(argv);

  if (!command || flags['help'] || flags['h'] || command === 'help') {
    printHelp(); process.exit(0);
  }
  if (flags['version'] || flags['v'] || command === 'version') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    process.stdout.write((require('../../package.json') as { version: string }).version + '\n');
    process.exit(0);
  }

  const text = flags['stdin'] ? await readStdin() : readFile(file);
  const data = loadData(text, flags['from'] as string | undefined);

  const afterSlice  = flags['warmup'] ? data.slice(parseInt(flags['warmup'] as string, 10)) : data;
  const afterVars   = flags['vars']   ? afterSlice.filterVariables((flags['vars']   as string).split(',').map(s => s.trim())) : afterSlice;
  const filtered    = flags['chains'] ? afterVars.filterChains((flags['chains'] as string).split(',').map(s => s.trim())) : afterVars;

  const fmt    = (flags['format'] as string) ?? 'table';
  const output = dispatch(command, filtered, fmt, flags);

  const outFile = flags['out'] as string | undefined;
  if (outFile) {
    fs.writeFileSync(path.resolve(outFile), output, 'utf-8');
  } else {
    process.stdout.write(output + (output.endsWith('\n') ? '' : '\n'));
  }
}

// ============================================================================
// Command dispatch
// ============================================================================

function dispatch(cmd: string, data: InferenceData, fmt: string, flags: Flags): string {
  switch (cmd) {
    case 'summary':  return runSummary(data, fmt);
    case 'diagnose': return runDiagnose(data, fmt);
    case 'rhat':     return runRhat(data, fmt);
    case 'ess':      return runEss(data, fmt);
    case 'convert':  return runConvert(data, (flags['to'] as string) ?? 'json');
    case 'plot':     return runPlot(data, (flags['type'] as string) ?? 'trace', (flags['var'] as string) ?? data.variableNames[0] ?? '', flags);
    default:         die(`Unknown command: "${cmd}". Run "mcmc help" for usage.`);
  }
}

function runSummary(data: InferenceData, fmt: string): string {
  const rows = data.summary();
  if (fmt === 'json') return JSON.stringify(rows, null, 2);
  return renderSummaryTable(rows);
}

function runDiagnose(data: InferenceData, fmt: string): string {
  const rows = data.summary().map(r => ({
    variable: r.variable,
    rhat:      fmt4(r.rhat),
    splitRhat: fmt4(r.splitRhat),
    essBulk:   fmt1(r.bulkEss),
    essTail:   fmt1(r.tailEss),
    mcse:      fmt6(r.mcse),
    geweke_z:  fmt4(r.geweke.z),
    status:    convergenceStatus(r),
  }));
  if (fmt === 'json') return JSON.stringify(rows, null, 2);
  return renderTable(['variable', 'rhat', 'splitRhat', 'essBulk', 'essTail', 'mcse', 'geweke_z', 'status'], rows);
}

function runRhat(data: InferenceData, fmt: string): string {
  const rows = data.summary().map(r => ({ variable: r.variable, rhat: r.rhat, splitRhat: r.splitRhat, status: rhatStatus(r.rhat) }));
  if (fmt === 'json') return JSON.stringify(rows, null, 2);
  return renderTable(['variable', 'rhat', 'splitRhat', 'status'], rows);
}

function runEss(data: InferenceData, fmt: string): string {
  const rows = data.summary().map(r => ({ variable: r.variable, essBulk: r.bulkEss, essTail: r.tailEss, essPerDraw: r.essPerDraw, count: r.count }));
  if (fmt === 'json') return JSON.stringify(rows, null, 2);
  return renderTable(['variable', 'essBulk', 'essTail', 'essPerDraw', 'count'], rows);
}

function runConvert(data: InferenceData, to: string): string {
  switch (to) {
    case 'turing-csv':      return data.toTuringCSV();
    case 'mcmcchains-csv':  return data.toMCMCChainsCSV();
    case 'stan-csv':        return data.toStanCSV();
    case 'wide-csv':        return data.toWideCSV();
    case 'mcmcchains-json': return data.toMCMCChainsJSON();
    default:                return data.toJSON();
  }
}

function runPlot(data: InferenceData, type: string, variable: string, flags: Flags): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const plots = require('../plots') as Record<string, unknown>;
  const specFn = plots[`${type}PlotSpec`];
  if (typeof specFn !== 'function') {
    const available = Object.keys(plots).filter(k => k.endsWith('PlotSpec')).map(k => k.replace('PlotSpec', '')).join(', ');
    die(`Unknown plot type: "${type}". Available: ${available}`);
  }
  const opts = { theme: (flags['theme'] as string) ?? 'dark', height: flags['height'] ? +flags['height'] : undefined, width: flags['width'] ? +flags['width'] : undefined };
  return JSON.stringify((specFn as (d: InferenceData, v: string, o: unknown) => unknown)(data, variable, opts), null, 2);
}

// ============================================================================
// I/O helpers
// ============================================================================

function readFile(file: string | undefined): string {
  if (!file) die('No input file. Use --stdin to read from stdin.');
  const p = path.resolve(file);
  if (!fs.existsSync(p)) die(`File not found: ${p}`);
  return fs.readFileSync(p, 'utf-8');
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (process.stdin.isTTY) { resolve(''); return; }
    let data = '';
    const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
    rl.on('line', l => { data += l + '\n'; });
    rl.on('close', () => resolve(data));
    rl.on('error', reject);
  });
}

function loadData(text: string, fmt?: string): InferenceData {
  switch (fmt) {
    case 'turing-csv':      return fromTuringCSV(text);
    case 'stan-csv':        return fromStanCSV(text);
    case 'mcmcchains-json': return fromMCMCChainsJSON(text);
    case 'arviz-json':      return new MCMCData(parseArviZJSONPosterior(text));
    default:                return fromAutoDetect(text);
  }
}

// ============================================================================
// Table rendering
// ============================================================================

function renderSummaryTable(rows: VariableSummary[]): string {
  if (rows.length === 0) return '(no variables)\n';
  type Col = [keyof VariableSummary, string, (v: unknown) => string];
  const cols: Col[] = [
    ['variable',  'variable',  v => String(v)],
    ['mean',      'mean',      v => fmt6(v as number)],
    ['stdev',     'sd',        v => fmt6(v as number)],
    ['quantiles', 'q5',        v => fmt4((v as { q5: number }).q5)],
    ['quantiles', 'q95',       v => fmt4((v as { q95: number }).q95)],
    ['mcse',      'mcse',      v => fmt6(v as number)],
    ['bulkEss',   'ess_bulk',  v => fmt1(v as number)],
    ['tailEss',   'ess_tail',  v => fmt1(v as number)],
    ['rhat',      'rhat',      v => fmt4(v as number)],
  ];
  return renderRawTable(cols.map(c => c[1]), rows.map(r => cols.map(([f,,fn]) => fn(r[f]))));
}

function renderTable(cols: string[], rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '(empty)\n';
  return renderRawTable(cols, rows.map(r => cols.map(c => fmtCell(r[c]))));
}

function renderRawTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map(r => (r[i] ?? '').length)));
  const sep    = '  ';
  const head   = headers.map((h, i) => h.padEnd(widths[i]!)).join(sep);
  const line   = widths.map(w => '─'.repeat(w)).join('──');
  const body   = rows.map(r => r.map((c, i) => c.padStart(widths[i]!)).join(sep)).join('\n');
  return `\n ${head}\n ${line}\n${body.split('\n').map(l => ' ' + l).join('\n')}\n`;
}

// ============================================================================
// Formatting & status
// ============================================================================

function fmt1(v: number): string { return isNaN(v) ? 'NaN' : v.toFixed(1); }
function fmt4(v: number | undefined): string { return v === undefined || isNaN(v) ? 'NaN' : v.toFixed(4); }
function fmt6(v: number): string { return isNaN(v) ? 'NaN' : v.toFixed(6); }
function fmtCell(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'number') return isNaN(v) ? 'NaN' : v.toFixed(4);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function convergenceStatus(r: VariableSummary): string {
  const rhat = r.rhat ?? r.splitRhat;
  if (rhat === undefined || isNaN(rhat)) return '?';
  if (rhat > 1.10) return 'FAIL';
  if (rhat > 1.01) return 'WARN';
  return 'OK';
}

function rhatStatus(v: number | undefined): string {
  if (v === undefined || isNaN(v)) return '?';
  return v > 1.10 ? 'FAIL' : v > 1.01 ? 'WARN' : 'OK';
}

// ============================================================================
// Argument parser
// ============================================================================

type Flags = Record<string, string | boolean>;
interface ParsedArgv { command?: string; file?: string; flags: Flags }

function parseArgv(argv: string[]): ParsedArgv {
  const flags: Flags = {};
  let command: string | undefined, file: string | undefined, pos = 0;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith('--')) {
      const key = arg.slice(2), next = argv[i + 1];
      flags[key] = (next && !next.startsWith('-')) ? (i++, next) : true;
    } else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1), next = argv[i + 1];
      flags[key] = (next && !next.startsWith('-')) ? (i++, next) : true;
    } else {
      if (pos === 0) command = arg;
      else if (pos === 1) file = arg;
      pos++;
    }
  }
  return { command, file, flags };
}

// ============================================================================
// Utilities
// ============================================================================

function die(msg: string): never {
  process.stderr.write(`error: ${msg}\n`); process.exit(1);
}

function printHelp(): void {
  process.stdout.write(`
mcmc-visualizer  CLI

USAGE
  mcmc <command> [file] [options]
  cat file | mcmc <command> --stdin

COMMANDS
  summary  <file>    Summary statistics table
  diagnose <file>    R-hat, ESS, MCSE, Geweke
  rhat     <file>    Per-variable R-hat values
  ess      <file>    Per-variable bulk/tail ESS
  convert  <file>    Convert between formats
  plot     <file>    Output Plotly JSON spec

OPTIONS
  --format  json|table     Output format (default: table)
  --vars    a,b,c          Filter variables
  --chains  c1,c2          Filter chains
  --warmup  <n>            Discard first n draws
  --stdin                  Read from stdin
  --out     <file>         Write to file
  --from    turing-csv|stan-csv|arviz-json|mcmcchains-json
  --to      json|turing-csv|stan-csv|wide-csv|mcmcchains-json
  --type    trace|histogram|density|forest|rank|violin|energy|pairs|autocorrelation
  --var     <name>         Variable name for plot command
  --theme   dark|light     Plot theme (default: dark)
`);
}

main().catch(err => { process.stderr.write(`fatal: ${(err as Error).message}\n`); process.exit(1); });
