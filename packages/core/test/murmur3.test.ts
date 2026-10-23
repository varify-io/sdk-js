import { describe, expect, it } from 'vitest';

import { murmur3 } from '../src/murmur3';

describe('murmur3', () => {
  it.each([
    ['', 0, 0],
    ['', 1, 0x514e28b7],
    ['hello', 0, 0x248bfa47],
    ['The quick brown fox jumps over the lazy dog', 0, 0x2e4ff723],
    ['a', 0x9747b28c, 0x7fa09ea6],
    ['aa', 0x9747b28c, 0x5d211726],
    ['aaa', 0x9747b28c, 0x283e0130],
    ['aaaa', 0x9747b28c, 0x5a97808a],
    ['Hello, world!', 0x9747b28c, 0x24884cba],
  ])('hashes %j with seed %i to the reference value', (key, seed, expected) => {
    expect(murmur3(key, seed)).toBe(expected);
  });

  it('returns an unsigned 32-bit integer', () => {
    const hash = murmur3('48812:3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90', 1);

    expect(Number.isInteger(hash)).toBe(true);
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThan(2 ** 32);
  });
});
