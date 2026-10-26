'use client';

import type { Assignment } from '@varify-io/core';
import { useEffect } from 'react';

import { reportAssignment } from './page-assignments';
import { trackExposure } from './track';

export const useExposure = (assignment: Assignment): void => {
  const { tracking } = assignment;
  const key = `${assignment.experimentId}:${assignment.variation ?? 0}:${assignment.source}`;

  // Keyed by the exposure, not the assignment object, which a server refresh recreates without the exposure changing.
  useEffect(() => {
    reportAssignment(assignment);
    if (tracking !== null) {
      trackExposure(tracking);
    }
  }, [key]);
};

export interface VarifyTrackingProps {
  assignment: Assignment;
}

export const VarifyTracking = ({ assignment }: VarifyTrackingProps): null => {
  useExposure(assignment);
  return null;
};
