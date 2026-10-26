import type { Assignment } from '@varify-io/core';

export interface PageAssignments {
  pathname: string | undefined;
  assignments: ReadonlyMap<number, Assignment>;
}

const EMPTY: PageAssignments = { pathname: undefined, assignments: new Map() };

let snapshot = EMPTY;
const listeners = new Set<() => void>();

/** Records what the current page rendered, for the debug panel; starts over on every pathname. */
export const reportAssignment = (assignment: Assignment): void => {
  const pathname = globalThis.location?.pathname;
  const assignments = new Map(snapshot.pathname === pathname ? snapshot.assignments : []);
  assignments.set(assignment.experimentId, assignment);
  snapshot = { pathname, assignments };
  listeners.forEach((listener) => listener());
};

export const subscribeToPageAssignments = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getPageAssignments = (): PageAssignments => snapshot;

export const getServerPageAssignments = (): PageAssignments => EMPTY;
