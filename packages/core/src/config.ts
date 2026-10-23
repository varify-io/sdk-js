import type { Config, ConfigExperiment, ConfigVariation } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isVariation = (value: unknown): value is ConfigVariation =>
  isRecord(value) && Number.isInteger(value['id']) && typeof value['slug'] === 'string' && typeof value['traffic_allocation'] === 'number';

const isExperiment = (value: unknown): value is ConfigExperiment =>
  isRecord(value) &&
  Number.isInteger(value['id']) &&
  typeof value['slug'] === 'string' &&
  typeof value['tracking_enabled'] === 'boolean' &&
  Array.isArray(value['variations']) &&
  value['variations'].every(isVariation);

export const isConfig = (value: unknown): value is Config =>
  isRecord(value) && Array.isArray(value['experiments']) && value['experiments'].every(isExperiment);
