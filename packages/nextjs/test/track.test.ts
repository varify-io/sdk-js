import type { TrackingPayload } from '@varify-io/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { trackExposure } from '../src/track';

const PAYLOAD: TrackingPayload = { experiment: { id: 48812, name: 'checkout-cta' }, variation: { id: 48838, name: 'new-cta' } };
const ORIGINAL: TrackingPayload = { experiment: { id: 48812, name: 'checkout-cta' }, variation: { id: null, name: null } };

const host = globalThis as typeof globalThis & { varify?: Record<string, unknown> };

let page = 0;
const visit = (pathname: string) => vi.stubGlobal('location', { pathname });

describe('trackExposure', () => {
  beforeEach(() => {
    page += 1;
    visit(`/page-${page}`);
  });

  afterEach(() => {
    delete host.varify;
    vi.unstubAllGlobals();
  });

  it('queues exposures until varify.js has loaded', () => {
    trackExposure(PAYLOAD);

    expect(host.varify?.['serverSideQueue']).toEqual([PAYLOAD]);
  });

  it('keeps existing window.varify properties such as iid', () => {
    host.varify = { iid: 15 };

    trackExposure(PAYLOAD);

    expect(host.varify['iid']).toBe(15);
  });

  it('calls varify.js directly once it is available', () => {
    const trackServerSide = vi.fn<(payload: TrackingPayload) => void>();
    host.varify = { trackServerSide };

    trackExposure(PAYLOAD);

    expect(trackServerSide).toHaveBeenCalledWith(PAYLOAD);
    expect(host.varify['serverSideQueue']).toBeUndefined();
  });

  it('tracks an exposure once per pathname', () => {
    trackExposure(PAYLOAD);
    trackExposure({ ...PAYLOAD });

    expect(host.varify?.['serverSideQueue']).toEqual([PAYLOAD]);
  });

  it('keeps the first variation when one page shows two variations of an experiment', () => {
    trackExposure(PAYLOAD);
    trackExposure(ORIGINAL);

    expect(host.varify?.['serverSideQueue']).toEqual([PAYLOAD]);
  });

  it('tracks again after navigating to another pathname', () => {
    trackExposure(PAYLOAD);
    visit(`/page-${page}/next`);

    trackExposure(PAYLOAD);

    expect(host.varify?.['serverSideQueue']).toEqual([PAYLOAD, PAYLOAD]);
  });
});
