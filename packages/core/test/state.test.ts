import { describe, expect, it } from 'vitest';

import { parseForceParam } from '../src/force';
import { parseState } from '../src/state';

const UID = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90';

describe('parseState', () => {
  it('accepts a valid state', () => {
    expect(parseState({ uid: UID, assignments: { '48812': 48838, '50001': null } })).toEqual({
      uid: UID,
      assignments: { 48812: 48838, 50001: null },
    });
  });

  it.each([
    ['a non-object', 'nope'],
    ['a missing uid', { assignments: {} }],
    ['a uid that is not a UUIDv4', { uid: 'customer-123', assignments: {} }],
    ['missing assignments', { uid: UID }],
    ['a non-numeric experiment id', { uid: UID, assignments: { abc: 1 } }],
    ['a non-integer variation id', { uid: UID, assignments: { '48812': '48838' } }],
  ])('rejects %s', (_, value) => {
    expect(parseState(value)).toBeUndefined();
  });
});

describe('parseForceParam', () => {
  it('parses an experiment and variation', () => {
    expect(parseForceParam('48812-48838')).toEqual({ experimentId: 48812, variationId: 48838 });
  });

  it('treats variation 0 as the original', () => {
    expect(parseForceParam('48812-0')).toEqual({ experimentId: 48812, variationId: null });
  });

  it.each([null, undefined, '', '48812', '48812-abc', '48812:48838'])('ignores %j', (value) => {
    expect(parseForceParam(value)).toBeUndefined();
  });
});
