import type { TrackingPayload } from '@varify-io/core';

interface VarifyGlobal {
  trackServerSide?: (payload: TrackingPayload) => void;
  serverSideQueue?: TrackingPayload[];
}

let exposedPathname: string | undefined;
const exposed = new Set<number>();

/**
 * Hands an exposure to varify.js, which applies consent. varify.js tracks every call (it only deduplicates with the
 * team's dataSaveMode), so several instances of one experiment and StrictMode's double effects are dropped here:
 * once per experiment per pathname. The first variation wins, so a page that shows two variations of one experiment
 * (after forcing, or a cached page restored on back navigation) never counts the visitor in both.
 * Before varify.js has loaded, the exposure waits in `window.varify.serverSideQueue`, which varify.js drains on load.
 */
export const trackExposure = (payload: TrackingPayload): void => {
  const host: { location?: Location; varify?: VarifyGlobal } = globalThis;
  const pathname = host.location?.pathname;
  if (pathname !== exposedPathname) {
    exposedPathname = pathname;
    exposed.clear();
  }

  if (exposed.has(payload.experiment.id)) {
    return;
  }
  exposed.add(payload.experiment.id);

  host.varify ??= {};

  if (typeof host.varify.trackServerSide === 'function') {
    host.varify.trackServerSide(payload);
    return;
  }

  host.varify.serverSideQueue ??= [];
  host.varify.serverSideQueue.push(payload);
};
