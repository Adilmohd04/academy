import { normaliseGroupKey } from './courseEquivalences';

describe('normaliseGroupKey', () => {
  it('canonicalises what an operator would naturally type', () => {
    // The point of normalising: these must all land in the same group, or two
    // admins describing one academic course create groups that never match.
    const variants = [
      'Python Fundamentals',
      'python fundamentals',
      '  Python   Fundamentals  ',
      'Python-Fundamentals',
      'Python_Fundamentals',
    ];

    for (const variant of variants) {
      expect(normaliseGroupKey(variant).key).toBe('python-fundamentals');
    }
  });

  it('does not merge genuinely different courses', () => {
    expect(normaliseGroupKey('Python Fundamentals').key).not.toBe(
      normaliseGroupKey('Python Advanced').key,
    );
  });

  it('strips leading and trailing separators', () => {
    expect(normaliseGroupKey('--python--').key).toBe('python');
  });

  it('rejects input with nothing usable in it', () => {
    for (const bad of ['', '   ', '---', '!!!', null, undefined, 42, {}]) {
      const result = normaliseGroupKey(bad as unknown);
      expect(result.key).toBeUndefined();
      expect(result.error).toBeTruthy();
    }
  });

  it('rejects an over-long key rather than silently truncating', () => {
    const result = normaliseGroupKey('a'.repeat(121));
    expect(result.key).toBeUndefined();
    expect(result.error).toMatch(/120/);
  });

  it('accepts a key exactly at the limit', () => {
    expect(normaliseGroupKey('a'.repeat(120)).key).toHaveLength(120);
  });
});
