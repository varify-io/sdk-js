'use client';

import { fallbackAssignment, type Assignment } from '@varify-io/core';
import { createContext, useContext, type ReactNode } from 'react';

import { useExposure } from './tracking';

const AssignmentsContext = createContext<Record<number, Assignment> | null>(null);

export interface VarifyClientProviderProps {
  assignments: Record<number, Assignment>;
  children?: ReactNode;
}

export const VarifyClientProvider = ({ assignments, children }: VarifyClientProviderProps): ReactNode => (
  <AssignmentsContext.Provider value={assignments}>{children}</AssignmentsContext.Provider>
);

const useAssignment = (experiment: number | Assignment): Assignment => {
  const assignments = useContext(AssignmentsContext);
  if (typeof experiment !== 'number') {
    return experiment;
  }

  const assignment = assignments?.[experiment];
  if (assignment === undefined && process.env.NODE_ENV !== 'production') {
    console.warn(
      assignments === null
        ? `[varify] useVariation(${experiment}) has no <VarifyProvider> above it; rendering the original.`
        : `[varify] Experiment ${experiment} is not running; rendering the original.`,
    );
  }
  return assignment ?? fallbackAssignment(experiment);
};

/** The variation id for this user, or `null` for the original. Tracks the exposure once per page view. */
export const useVariation = (experiment: number | Assignment): number | null => {
  const assignment = useAssignment(experiment);
  useExposure(assignment);
  return assignment.variation;
};
