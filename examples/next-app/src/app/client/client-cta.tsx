'use client';

import { useVariation } from '@varify-io/nextjs/client';
import { useState } from 'react';

export const ClientCta = () => {
  const variation = useVariation(269);
  const [clicks, setClicks] = useState(0);

  return (
    <button
      onClick={() => setClicks(clicks + 1)}
      style={{ padding: 12, ...(variation === null ? {} : { background: 'seagreen', color: 'white' }) }}
    >
      {variation === null ? 'Original CTA' : `Variation ${variation}`} · clicked {clicks}×
    </button>
  );
};
