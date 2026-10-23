import { murmur3 } from './murmur3';

/** A user's position in an experiment, 0 ≤ bucket < 100. The worker must compute exactly the same value. */
export const bucket = (experimentId: number, userId: string): number => (murmur3(`${experimentId}:${userId}`, 1) / 2 ** 32) * 100;
