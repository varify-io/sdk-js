import type { State } from './types';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EXPERIMENT_ID = /^[1-9]\d*$/;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Validates state from an untrusted source such as a cookie; anything malformed yields `undefined`. */
export const parseState = (value: unknown): State | undefined => {
  if (!isRecord(value) || typeof value['uid'] !== 'string' || !UUID_V4.test(value['uid']) || !isRecord(value['assignments'])) {
    return undefined;
  }

  const assignments: Record<number, number | null> = {};
  for (const [experimentId, variationId] of Object.entries(value['assignments'])) {
    const isVariationId = variationId === null || (typeof variationId === 'number' && Number.isInteger(variationId));
    if (!EXPERIMENT_ID.test(experimentId) || !isVariationId) {
      return undefined;
    }
    assignments[Number(experimentId)] = variationId;
  }

  return { uid: value['uid'], assignments };
};
