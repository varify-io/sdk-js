import { bucket } from './bucket';
import type { Assignment, AssignmentSource, Config, ConfigExperiment, ConfigVariation, Evaluation, ForcedVariation, State } from './types';

export interface EvaluateOptions {
  force?: ForcedVariation | undefined;
  generateUserId?: () => string;
}

interface Resolution {
  variation: ConfigVariation | undefined;
  source: AssignmentSource;
}

const FALLBACK: Assignment = { variation: null, tracking: null, source: 'fallback' };

const pickByBucket = (variations: ConfigVariation[], position: number): ConfigVariation | undefined => {
  let remaining = position;
  return variations.find(({ traffic_allocation }) => {
    if (remaining < traffic_allocation) {
      return true;
    }
    remaining -= traffic_allocation;
    return false;
  });
};

const resolve = (
  experiment: ConfigExperiment,
  uid: string,
  stored: State['assignments'] | undefined,
  force: ForcedVariation | undefined,
): Resolution => {
  const findVariation = (id: number) => experiment.variations.find((variation) => variation.id === id);

  if (force?.experimentId === experiment.id) {
    if (force.variationId === null) {
      return { variation: undefined, source: 'forced' };
    }
    const forced = findVariation(force.variationId);
    if (forced !== undefined) {
      return { variation: forced, source: 'forced' };
    }
  }

  const storedId = stored?.[experiment.id];
  if (storedId === null) {
    return { variation: undefined, source: 'stored' };
  }
  if (storedId !== undefined) {
    const storedVariation = findVariation(storedId);
    if (storedVariation !== undefined) {
      return { variation: storedVariation, source: 'stored' };
    }
  }

  return { variation: pickByBucket(experiment.variations, bucket(experiment.id, uid)), source: 'hash' };
};

const isSameState = (previous: State | undefined, next: State): boolean => {
  if (previous === undefined || previous.uid !== next.uid) {
    return false;
  }
  const previousKeys = Object.keys(previous.assignments);
  const nextKeys = Object.keys(next.assignments);
  return (
    previousKeys.length === nextKeys.length && nextKeys.every((key) => previous.assignments[Number(key)] === next.assignments[Number(key)])
  );
};

/**
 * Assigns every experiment in `config` and returns the state to persist.
 * Without a config (it failed to load) the stored assignments are kept untouched, so a transient error never loses stickiness.
 */
export const evaluate = (config: Config | null, state: State | undefined, options: EvaluateOptions = {}): Evaluation => {
  const uid = state?.uid ?? (options.generateUserId ?? (() => crypto.randomUUID()))();

  if (config === null) {
    return { state: { uid, assignments: { ...state?.assignments } }, changed: state === undefined, assignments: new Map() };
  }

  const stored: State['assignments'] = {};
  const assignments = new Map<number, Assignment>();

  for (const experiment of config.experiments) {
    const { variation, source } = resolve(experiment, uid, state?.assignments, options.force);
    const variationId = variation?.id ?? null;

    stored[experiment.id] = variationId;
    assignments.set(experiment.id, {
      variation: variationId,
      tracking: experiment.tracking_enabled
        ? { experiment: { id: experiment.id, name: experiment.slug }, variation: { id: variationId, name: variation?.slug ?? null } }
        : null,
      source,
    });
  }

  const next: State = { uid, assignments: stored };
  return { state: next, changed: !isSameState(state, next), assignments };
};

export const getAssignment = (evaluation: Evaluation, experimentId: number): Assignment =>
  evaluation.assignments.get(experimentId) ?? FALLBACK;
