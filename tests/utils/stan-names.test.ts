import { describe, it, expect } from 'vitest';
import { fromStanName, toStanName } from '../../src/utils';

describe('fromStanName', () => {
  it('converts single-index name', () => {
    expect(fromStanName('theta.1')).toBe('theta[1]');
  });

  it('converts multi-index name', () => {
    expect(fromStanName('mat.1.2')).toBe('mat[1,2]');
  });

  it('converts triple-index name', () => {
    expect(fromStanName('arr.3.2.1')).toBe('arr[3,2,1]');
  });

  it('leaves plain names unchanged', () => {
    expect(fromStanName('mu')).toBe('mu');
  });

  it('leaves names with non-numeric dots unchanged', () => {
    expect(fromStanName('a.b.c')).toBe('a.b.c');
  });

  it('leaves lp__ unchanged', () => {
    expect(fromStanName('lp__')).toBe('lp__');
  });
});

describe('toStanName', () => {
  it('converts single-index name', () => {
    expect(toStanName('theta[1]')).toBe('theta.1');
  });

  it('converts multi-index name', () => {
    expect(toStanName('mat[1,2]')).toBe('mat.1.2');
  });

  it('leaves plain names unchanged', () => {
    expect(toStanName('mu')).toBe('mu');
  });

  it('round-trips correctly', () => {
    const names = ['theta[1]', 'mat[1,2]', 'arr[3,2,1]', 'mu', 'sigma'];
    for (const name of names) {
      expect(fromStanName(toStanName(name))).toBe(name);
    }
  });
});
