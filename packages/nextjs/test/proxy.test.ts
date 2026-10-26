import type { Config } from '@varify-io/core';
import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

import { decodeState, encodeState } from '../src/cookie';
import { createVarify } from '../src/create-varify';

const UID = '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90';
const CONFIG: Config = {
  experiments: [
    { id: 48812, slug: 'checkout-cta', tracking_enabled: true, variations: [{ id: 48838, slug: 'new-cta', traffic_allocation: 50 }] },
  ],
};

const configFetch = (config: Config | null = CONFIG) =>
  vi.fn<typeof fetch>(async () => (config === null ? new Response('', { status: 500 }) : new Response(JSON.stringify(config))));

const request = (url = 'https://shop.example/checkout', init: { cookie?: string; userAgent?: string } = {}) =>
  new NextRequest(url, {
    headers: {
      'user-agent': init.userAgent ?? 'Mozilla/5.0 (Macintosh) Safari/605.1.15',
      ...(init.cookie === undefined ? {} : { cookie: init.cookie }),
    },
  });

const varifyWith = (fetchMock = configFetch()) => createVarify({ teamId: 'KBYQpQERndt9fr', fetch: fetchMock, debug: false });

describe('proxy', () => {
  it('gives a new visitor an id and assignments, on the response and the forwarded request', async () => {
    const response = await varifyWith().proxy(request());

    const state = decodeState(response.cookies.get('varify')?.value);
    expect(state?.assignments).toHaveProperty('48812');
    expect(response.headers.get('x-middleware-request-cookie')).toContain(`varify=${encodeState(state!)}`);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('sets an HttpOnly, lax, 400-day cookie', async () => {
    const response = await varifyWith().proxy(request());

    expect(response.cookies.get('varify')).toMatchObject({ httpOnly: true, sameSite: 'lax', maxAge: 34_560_000, path: '/', secure: true });
  });

  it('leaves a returning visitor untouched', async () => {
    const response = await varifyWith().proxy(request(undefined, { cookie: `varify=${UID}.48812-48838` }));

    expect(response.cookies.get('varify')).toBeUndefined();
  });

  it('stores a forced variation', async () => {
    const response = await varifyWith().proxy(
      request('https://shop.example/checkout?varify-force=48812-0', { cookie: `varify=${UID}.48812-48838` }),
    );

    expect(decodeState(response.cookies.get('varify')?.value)).toEqual({ uid: UID, assignments: { 48812: null } });
  });

  it('keeps stored assignments when the config fails to load', async () => {
    const response = await varifyWith(configFetch(null)).proxy(request(undefined, { cookie: `varify=${UID}.48812-48838` }));

    expect(response.cookies.get('varify')).toBeUndefined();
  });

  it('gives bots no id', async () => {
    const fetchMock = configFetch();

    const response = await varifyWith(fetchMock).proxy(request(undefined, { userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1)' }));

    expect(response.cookies.get('varify')).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
