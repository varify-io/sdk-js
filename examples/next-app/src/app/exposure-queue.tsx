'use client';

import type { TrackingPayload } from '@varify-io/nextjs/client';
import { useEffect, useState } from 'react';

type TrackServerSide = (payload: TrackingPayload) => void;

const handedOver: { via: 'serverSideQueue' | 'trackServerSide'; payload: TrackingPayload }[] = [];
const recorders = new WeakSet<TrackServerSide>();

// varify.js drains the queue internally and copies window.varify when it loads, so both ways in are recorded where
// the SDK uses them: pushes onto the queue, and calls to the trackServerSide that varify.js installs.
const record = (): void => {
  window.varify ??= {};
  const { varify } = window;

  if (varify.serverSideQueue === undefined && varify.trackServerSide === undefined) {
    const queue: TrackingPayload[] = [];
    queue.push = (...payloads) => {
      payloads.forEach((payload) => handedOver.push({ via: 'serverSideQueue', payload }));
      return Array.prototype.push.apply(queue, payloads);
    };
    varify.serverSideQueue = queue;
  }

  const track = varify.trackServerSide;
  if (track !== undefined && !recorders.has(track)) {
    const recorder: TrackServerSide = (payload) => {
      handedOver.push({ via: 'trackServerSide', payload });
      track(payload);
    };
    recorders.add(recorder);
    varify.trackServerSide = recorder;
  }
};

// Exposures are reported from effects, which run after this module has been evaluated.
if (typeof window !== 'undefined') {
  record();
}

export const ExposureQueue = () => {
  const [entries, setEntries] = useState('[]');

  useEffect(() => {
    const interval = setInterval(() => {
      record();
      setEntries(JSON.stringify(handedOver, null, 2));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <section>
      <h2>Exposures handed to varify.js</h2>
      <pre>{entries}</pre>
    </section>
  );
};
