import { describe, expect, it } from 'vitest';

import { cookieSettings, decodeState, encodeState } from '../src/cookie';

const UID = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90';

describe('cookie state', () => {
  it('round-trips assignments, with 0 for the original', () => {
    const state = { uid: UID, assignments: { 48812: 48838, 50001: null } };

    const encoded = encodeState(state);

    expect(encoded).toBe(`${UID}.48812-48838_50001-0`);
    expect(decodeState(encoded)).toEqual(state);
  });

  it('round-trips a state without assignments', () => {
    expect(decodeState(encodeState({ uid: UID, assignments: {} }))).toEqual({ uid: UID, assignments: {} });
  });

  it('only uses characters that are valid in a cookie value', () => {
    expect(encodeState({ uid: UID, assignments: { 48812: 48838, 50001: null } })).toMatch(/^[0-9a-f.\-_]+$/);
  });

  it.each([undefined, '', 'garbage', `not-a-uuid.48812-1`, `${UID}.48812:1`, `${UID}.abc-1`])('rejects %j', (value) => {
    expect(decodeState(value)).toBeUndefined();
  });

  it('defaults to a 400-day lax cookie named varify', () => {
    expect(cookieSettings()).toEqual({ name: 'varify', maxAge: 34_560_000, domain: undefined, sameSite: 'lax' });
  });
});
