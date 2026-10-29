'use client';

import { useEffect, useState } from 'react';

// Shows what the SDK handed to varify.js. Without varify.js on the page, exposures stay in the queue.
export const ExposureQueue = () => {
  const [queue, setQueue] = useState('[]');

  useEffect(() => {
    const interval = setInterval(() => {
      setQueue(JSON.stringify(window.varify?.serverSideQueue ?? [], null, 2));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section>
      <h2>window.varify.serverSideQueue</h2>
      <pre>{queue}</pre>
    </section>
  );
};
