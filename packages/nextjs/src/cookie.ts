import { parseState, type State } from '@varify-io/core';

export interface CookieStateOptions {
  name?: string;
  /** Seconds. Defaults to 400 days, the maximum browsers accept. */
  maxAge?: number;
  domain?: string;
  sameSite?: 'lax' | 'strict' | 'none';
}

export interface CookieStateStore extends Required<Omit<CookieStateOptions, 'domain'>> {
  kind: 'cookie';
  domain: string | undefined;
}

export const cookieState = (options: CookieStateOptions = {}): CookieStateStore => ({
  kind: 'cookie',
  name: options.name ?? 'varify',
  maxAge: options.maxAge ?? 60 * 60 * 24 * 400,
  domain: options.domain,
  sameSite: options.sameSite ?? 'lax',
});

/**
 * `{uid}.{experimentId}-{variationId}_…`, with variation `0` for the original (as in `varify-force`).
 * Only characters that are valid in a cookie value, and far shorter than URL-encoded JSON.
 */
export const encodeState = (state: State): string => {
  const entries = Object.entries(state.assignments).map(([experimentId, variationId]) => `${experimentId}-${variationId ?? 0}`);
  return `${state.uid}.${entries.join('_')}`;
};

export const decodeState = (value: string | undefined): State | undefined => {
  const separator = value?.indexOf('.') ?? -1;
  if (value === undefined || separator === -1) {
    return undefined;
  }

  const assignments: Record<string, number | null> = {};
  const entries = value.slice(separator + 1);
  for (const entry of entries === '' ? [] : entries.split('_')) {
    const match = /^(\d+)-(\d+)$/.exec(entry);
    if (match === null) {
      return undefined;
    }
    const variationId = Number(match[2]);
    assignments[match[1]!] = variationId === 0 ? null : variationId;
  }

  return parseState({ uid: value.slice(0, separator), assignments });
};
