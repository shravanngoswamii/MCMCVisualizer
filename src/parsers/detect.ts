import type { FileFormat } from '../types';
import { splitLines, parseCSVLine } from '../utils';
import { isMCMCChainsJSON } from './mcmcchains-json';

export function detectFormat(text: string): FileFormat {
  const trimmed = text.trimStart();
  if (trimmed.startsWith('{') && isMCMCChainsJSON(trimmed)) return 'mcmcchains-json';

  const lines = splitLines(text);
  if (lines.length === 0) return 'unknown';

  if (isStanCSV(lines)) return 'stan-csv';
  if (isTuringCSVWide(lines)) return 'turing-csv';
  if (isTuringCSVLong(lines)) return 'turing-csv';

  return 'unknown';
}

function isStanCSV(lines: string[]): boolean {
  if (!lines[0]?.startsWith('#')) return false;
  const dataLines = lines.filter(l => !l.startsWith('#'));
  if (dataLines.length < 1) return false;
  const headers = parseCSVLine(dataLines[0]!);
  return headers[0] === 'lp__' && headers[1] === 'accept_stat__';
}

function isTuringCSVWide(lines: string[]): boolean {
  const headers = parseCSVLine(lines[0]!);
  return (
    (headers[0] === 'iteration' && headers[1] === 'chain') ||
    (headers[0] === 'chain_' && headers[1] === 'draw_')
  );
}

function isTuringCSVLong(lines: string[]): boolean {
  if (lines.length < 2) return false;
  const first = parseCSVLine(lines[0]!);
  if (first.length !== 4) return false;
  const drawIdx = parseFloat(first[2]!);
  const value = parseFloat(first[3]!);
  return !isNaN(drawIdx) && !isNaN(value) && Number.isInteger(drawIdx);
}
