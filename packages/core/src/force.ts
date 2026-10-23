import type { ForcedVariation } from './types';

export const FORCE_PARAM = 'varify-force';

/** Parses `{experimentId}-{variationId}` as varify.js does; variation `0` forces the original. */
export const parseForceParam = (value: string | null | undefined): ForcedVariation | undefined => {
  const match = /^(\d+)-(\d+)$/.exec(value ?? '');
  if (match === null) {
    return undefined;
  }

  const variationId = Number(match[2]);
  return { experimentId: Number(match[1]), variationId: variationId === 0 ? null : variationId };
};
