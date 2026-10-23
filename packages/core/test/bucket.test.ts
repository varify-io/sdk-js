import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { bucket } from '../src/bucket';

const SAMPLE_SIZE = 100_000;
const users = Array.from({ length: SAMPLE_SIZE }, () => randomUUID());

describe('bucket', () => {
  it('is deterministic for the same experiment and user', () => {
    const userId = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90';

    expect(bucket(48812, userId)).toBe(bucket(48812, userId));
  });

  it('stays within 0 ≤ bucket < 100', () => {
    const buckets = users.map((userId) => bucket(48812, userId));

    expect(Math.min(...buckets)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...buckets)).toBeLessThan(100);
  });

  it('spreads users evenly across ten ranges', () => {
    const counts = Array.from({ length: 10 }, () => 0);

    for (const userId of users) {
      counts[Math.floor(bucket(48812, userId) / 10)]! += 1;
    }

    for (const count of counts) {
      expect(count / SAMPLE_SIZE).toBeCloseTo(0.1, 1);
      expect(Math.abs(count / SAMPLE_SIZE - 0.1)).toBeLessThan(0.005);
    }
  });

  it('places a user independently in different experiments', () => {
    const inFirstTenthOfA = users.filter((userId) => bucket(48812, userId) < 10);
    const alsoInFirstTenthOfB = inFirstTenthOfA.filter((userId) => bucket(50001, userId) < 10);

    expect(Math.abs(alsoInFirstTenthOfB.length / inFirstTenthOfA.length - 0.1)).toBeLessThan(0.015);
  });
});
