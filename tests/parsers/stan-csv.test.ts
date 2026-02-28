import { describe, it, expect } from 'vitest';
import { fromStanCSV, fromStanCSVFiles } from '../../src/index';

const STAN_CSV = [
  '# Stan CSV',
  '# model: test_model',
  'lp__,accept_stat__,alpha,beta',
  '-5.2,0.99,1.5,0.5',
  '-4.8,0.98,2.3,0.7',
  '-5.0,0.97,1.8,0.6',
  '-4.9,0.99,2.1,0.8',
  '-5.1,0.96,1.9,0.55',
].join('\n');

const STAN_CSV_CHAIN2 = [
  '# Stan CSV',
  '# model: test_model',
  'lp__,accept_stat__,alpha,beta',
  '-5.3,0.95,1.6,0.45',
  '-4.7,0.97,2.4,0.65',
  '-5.1,0.96,1.7,0.55',
  '-4.6,0.98,2.0,0.75',
  '-5.0,0.99,2.2,0.6',
].join('\n');

describe('parseStanCSV', () => {
  it('parses a single Stan CSV file', () => {
    const data = fromStanCSV(STAN_CSV);
    expect(data.chainNames).toEqual(['chain#1']);
    expect(data.variableNames).toContain('alpha');
    expect(data.variableNames).toContain('beta');
    expect(data.variableNames).not.toContain('lp__');
    expect(data.variableNames).not.toContain('accept_stat__');
    expect(data.drawCount).toBe(5);

    const alpha = data.getDraws('alpha', 'chain#1');
    expect(alpha[0]).toBeCloseTo(1.5);
    expect(alpha[4]).toBeCloseTo(1.9);
  });

  it('parses multiple Stan CSV files as separate chains', () => {
    const data = fromStanCSVFiles([STAN_CSV, STAN_CSV_CHAIN2]);
    expect(data.chainNames).toEqual(['chain#1', 'chain#2']);

    const alphaC2 = data.getDraws('alpha', 'chain#2');
    expect(alphaC2[0]).toBeCloseTo(1.6);
    expect(alphaC2[4]).toBeCloseTo(2.2);
  });
});
