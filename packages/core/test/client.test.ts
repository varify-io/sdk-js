import { describe, expect, it, vi } from 'vitest';

import { createVarifyClient, VarifyError } from '../src/client';
import type { Config } from '../src/types';

const CONFIG: Config = {
  experiments: [
    { id: 48812, slug: 'checkout-cta', tracking_enabled: true, variations: [{ id: 48838, slug: 'new-cta', traffic_allocation: 50 }] },
  ],
};

const respondWith = (body: unknown, status = 200) => vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));

describe('createVarifyClient', () => {
  it('loads the server-side delivery file of the team', async () => {
    const fetchMock = respondWith(CONFIG);

    const config = await createVarifyClient({ teamId: 'KBYQpQERndt9fr', fetch: fetchMock }).loadConfig();

    expect(config).toEqual(CONFIG);
    expect(fetchMock).toHaveBeenCalledWith('https://delivery.varify.io/ss/KBYQpQERndt9fr.json', expect.anything());
  });

  it('uses a custom config url', async () => {
    const fetchMock = respondWith(CONFIG);

    await createVarifyClient({ teamId: 'KBYQpQERndt9fr', configUrl: 'https://example.com/config.json', fetch: fetchMock }).loadConfig();

    expect(fetchMock).toHaveBeenCalledWith('https://example.com/config.json', expect.anything());
  });

  it.each([
    ['an HTTP error', respondWith({}, 404), 'http'],
    ['an unexpected shape', respondWith({ experiments: [{ id: 'x' }] }), 'invalid-config'],
    ['a body that is not JSON', vi.fn<typeof fetch>(async () => new Response('<html>')), 'invalid-config'],
    [
      'a network error',
      vi.fn<typeof fetch>(async () => {
        throw new TypeError('fetch failed');
      }),
      'network',
    ],
  ])('reports %s and yields null', async (_, fetchMock, reason) => {
    const onError = vi.fn<(error: VarifyError) => void>();

    const config = await createVarifyClient({ teamId: 'KBYQpQERndt9fr', fetch: fetchMock, onError }).loadConfig();

    expect(config).toBeNull();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ reason }));
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(VarifyError);
  });

  it('gives up after the timeout', async () => {
    const onError = vi.fn<(error: VarifyError) => void>();
    const hangingFetch = vi.fn<typeof fetch>(
      (_, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        }),
    );

    const config = await createVarifyClient({ teamId: 'KBYQpQERndt9fr', timeoutMs: 20, fetch: hangingFetch, onError }).loadConfig();

    expect(config).toBeNull();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ reason: 'timeout' }));
  });
});
