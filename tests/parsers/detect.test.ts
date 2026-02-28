import { describe, it, expect } from 'vitest';
import { detectFormat } from '../../src/index';

describe('detectFormat', () => {
  it('detects Stan CSV', () => {
    const text = [
      '# Stan',
      'lp__,accept_stat__,alpha',
      '-5,0.99,1.5',
    ].join('\n');
    expect(detectFormat(text)).toBe('stan-csv');
  });

  it('detects Turing CSV wide format', () => {
    const text = [
      'iteration,chain,alpha',
      '1,chain#1,1.5',
    ].join('\n');
    expect(detectFormat(text)).toBe('turing-csv');
  });

  it('detects Turing CSV long format', () => {
    const text = [
      'chain#1,alpha,0,1.5',
      'chain#1,alpha,1,2.3',
    ].join('\n');
    expect(detectFormat(text)).toBe('turing-csv');
  });

  it('returns unknown for empty input', () => {
    expect(detectFormat('')).toBe('unknown');
  });
});
