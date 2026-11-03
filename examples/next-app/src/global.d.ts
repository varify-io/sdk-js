import type { TrackingPayload } from '@varify-io/nextjs/client';

declare global {
  interface Window {
    varify?: {
      serverSideQueue?: TrackingPayload[];
      trackServerSide?: (payload: TrackingPayload) => void;
    };
  }
}
