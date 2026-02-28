import { describe, it, expect } from 'vitest';
import { fromTuringCSV } from '../../src/index';

const LONG_FORMAT = [
  'chain#1,alpha,0,1.5',
  'chain#1,alpha,1,2.3',
  'chain#1,alpha,2,1.8',
  'chain#1,alpha,3,2.1',
  'chain#1,alpha,4,1.9',
  'chain#1,beta,0,0.5',
  'chain#1,beta,1,0.7',
  'chain#1,beta,2,0.6',
  'chain#1,beta,3,0.8',
  'chain#1,beta,4,0.55',
  'chain#2,alpha,0,1.6',
  'chain#2,alpha,1,2.4',
  'chain#2,alpha,2,1.7',
  'chain#2,alpha,3,2.0',
  'chain#2,alpha,4,2.2',
  'chain#2,beta,0,0.45',
  'chain#2,beta,1,0.65',
  'chain#2,beta,2,0.55',
  'chain#2,beta,3,0.75',
  'chain#2,beta,4,0.6',
].join('\n');

const WIDE_FORMAT = [
  'iteration,chain,alpha,beta',
  '1,chain#1,1.5,0.5',
  '2,chain#1,2.3,0.7',
  '3,chain#1,1.8,0.6',
  '4,chain#1,2.1,0.8',
  '5,chain#1,1.9,0.55',
  '1,chain#2,1.6,0.45',
  '2,chain#2,2.4,0.65',
  '3,chain#2,1.7,0.55',
  '4,chain#2,2.0,0.75',
  '5,chain#2,2.2,0.6',
].join('\n');

const EXPORT_TAB_FORMAT = [
  'chain_,draw_,alpha,beta',
  'chain#1,1,1.5,0.5',
  'chain#1,2,2.3,0.7',
  'chain#1,3,1.8,0.6',
  'chain#1,4,2.1,0.8',
  'chain#1,5,1.9,0.55',
  'chain#2,1,1.6,0.45',
  'chain#2,2,2.4,0.65',
  'chain#2,3,1.7,0.55',
  'chain#2,4,2.0,0.75',
  'chain#2,5,2.2,0.6',
].join('\n');

describe('parseTuringCSV', () => {
  it('parses long format (Coinfer native)', () => {
    const data = fromTuringCSV(LONG_FORMAT);
    expect(data.chainNames).toHaveLength(2);
    expect(data.variableNames).toContain('alpha');
    expect(data.variableNames).toContain('beta');
    expect(data.drawCount).toBe(5);

    const alphaChain1 = data.getDraws('alpha', 'chain#1');
    expect(alphaChain1).toHaveLength(5);
    expect(alphaChain1[0]).toBeCloseTo(1.5);
    expect(alphaChain1[4]).toBeCloseTo(1.9);
  });

  it('parses wide format (iteration,chain,...)', () => {
    const data = fromTuringCSV(WIDE_FORMAT);
    expect(data.chainNames).toHaveLength(2);
    expect(data.variableNames).toContain('alpha');
    expect(data.variableNames).toContain('beta');

    const betaChain2 = data.getDraws('beta', 'chain#2');
    expect(betaChain2).toHaveLength(5);
    expect(betaChain2[0]).toBeCloseTo(0.45);
  });

  it('parses ExportTab format (chain_,draw_,...)', () => {
    const data = fromTuringCSV(EXPORT_TAB_FORMAT);
    expect(data.chainNames).toHaveLength(2);
    expect(data.variableNames).toContain('alpha');
  });

  it('getAllDraws concatenates across chains', () => {
    const data = fromTuringCSV(LONG_FORMAT);
    const allAlpha = data.getAllDraws('alpha');
    expect(allAlpha).toHaveLength(10);
  });

  it('throws on empty input', () => {
    expect(() => fromTuringCSV('')).toThrow('Empty input');
  });
});
