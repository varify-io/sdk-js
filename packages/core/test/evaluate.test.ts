import { describe, expect, it } from 'vitest';

import { bucket } from '../src/bucket';
import { evaluate, getAssignment } from '../src/evaluate';
import type { Config, ConfigExperiment, State } from '../src/types';

const UID = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90';

const experiment = (overrides: Partial<ConfigExperiment> = {}): ConfigExperiment => ({
  id: 48812,
  slug: 'checkout-cta',
  tracking_enabled: true,
  variations: [{ id: 48838, slug: 'new-cta', traffic_allocation: 50 }],
  ...overrides,
});

const configWith = (...experiments: ConfigExperiment[]): Config => ({ experiments });

describe('evaluate', () => {
  it('generates a user id and assigns every experiment for a new visitor', () => {
    const result = evaluate(configWith(experiment(), experiment({ id: 50001, slug: 'pricing' })), undefined, { generateUserId: () => UID });

    expect(result.state.uid).toBe(UID);
    expect(Object.keys(result.state.assignments)).toEqual(['48812', '50001']);
    expect(result.changed).toBe(true);
  });

  it('assigns by hash against the traffic split', () => {
    const expected = bucket(48812, UID) < 50 ? 48838 : null;

    const result = evaluate(configWith(experiment()), { uid: UID, assignments: {} });

    expect(getAssignment(result, 48812)).toMatchObject({ variation: expected, source: 'hash' });
  });

  it('keeps a stored assignment when the traffic split changes', () => {
    const state: State = { uid: UID, assignments: { 48812: 48838 } };

    const result = evaluate(configWith(experiment({ variations: [{ id: 48838, slug: 'new-cta', traffic_allocation: 0 }] })), state);

    expect(getAssignment(result, 48812)).toMatchObject({ variation: 48838, source: 'stored' });
    expect(result.changed).toBe(false);
  });

  it('keeps a stored original', () => {
    const state: State = { uid: UID, assignments: { 48812: null } };

    const result = evaluate(configWith(experiment({ variations: [{ id: 48838, slug: 'new-cta', traffic_allocation: 100 }] })), state);

    expect(getAssignment(result, 48812)).toMatchObject({ variation: null, source: 'stored' });
  });

  it('reassigns by hash when the stored variation no longer exists', () => {
    const state: State = { uid: UID, assignments: { 48812: 99999 } };

    const result = evaluate(configWith(experiment({ variations: [{ id: 48838, slug: 'new-cta', traffic_allocation: 100 }] })), state);

    expect(getAssignment(result, 48812)).toMatchObject({ variation: 48838, source: 'hash' });
    expect(result.changed).toBe(true);
  });

  it('drops experiments that are no longer in the config', () => {
    const state: State = { uid: UID, assignments: { 48812: 48838, 777: null } };

    const result = evaluate(configWith(experiment()), state);

    expect(result.state.assignments).toEqual({ 48812: 48838 });
    expect(result.changed).toBe(true);
  });

  it('applies a forced variation and stores it', () => {
    const result = evaluate(
      configWith(experiment()),
      { uid: UID, assignments: { 48812: null } },
      { force: { experimentId: 48812, variationId: 48838 } },
    );

    expect(getAssignment(result, 48812)).toMatchObject({ variation: 48838, source: 'forced' });
    expect(result.state.assignments[48812]).toBe(48838);
  });

  it('forces the original', () => {
    const result = evaluate(
      configWith(experiment()),
      { uid: UID, assignments: { 48812: 48838 } },
      { force: { experimentId: 48812, variationId: null } },
    );

    expect(getAssignment(result, 48812)).toMatchObject({ variation: null, source: 'forced' });
    expect(result.state.assignments[48812]).toBeNull();
  });

  it('ignores a forced variation that does not exist', () => {
    const result = evaluate(
      configWith(experiment()),
      { uid: UID, assignments: { 48812: 48838 } },
      { force: { experimentId: 48812, variationId: 99999 } },
    );

    expect(getAssignment(result, 48812)).toMatchObject({ variation: 48838, source: 'stored' });
  });

  it('builds the tracking payload varify.js expects', () => {
    const result = evaluate(configWith(experiment()), { uid: UID, assignments: { 48812: 48838 } });

    expect(getAssignment(result, 48812).tracking).toEqual({
      experiment: { id: 48812, name: 'checkout-cta' },
      variation: { id: 48838, name: 'new-cta' },
    });
  });

  it('tracks the original with null variation fields', () => {
    const result = evaluate(configWith(experiment()), { uid: UID, assignments: { 48812: null } });

    expect(getAssignment(result, 48812).tracking).toEqual({
      experiment: { id: 48812, name: 'checkout-cta' },
      variation: { id: null, name: null },
    });
  });

  it('does not track an experiment with tracking disabled', () => {
    const result = evaluate(configWith(experiment({ tracking_enabled: false })), { uid: UID, assignments: { 48812: 48838 } });

    expect(getAssignment(result, 48812).tracking).toBeNull();
  });

  it('keeps the stored state untouched without a config', () => {
    const state: State = { uid: UID, assignments: { 48812: 48838 } };

    const result = evaluate(null, state);

    expect(result.state).toEqual(state);
    expect(result.changed).toBe(false);
    expect(getAssignment(result, 48812)).toEqual({ experimentId: 48812, variation: null, tracking: null, source: 'fallback' });
  });

  it('returns the original without tracking for an unknown experiment', () => {
    const result = evaluate(configWith(experiment()), { uid: UID, assignments: {} });

    expect(getAssignment(result, 12345)).toEqual({ experimentId: 12345, variation: null, tracking: null, source: 'fallback' });
  });
});
