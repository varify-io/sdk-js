import { fallbackAssignment, type Assignment } from '@varify-io/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getPageAssignments, reportAssignment, subscribeToPageAssignments } from '../src/page-assignments';

const VARIATION: Assignment = {
  experimentId: 48812,
  variation: 48838,
  source: 'stored',
  tracking: { experiment: { id: 48812, name: 'checkout-cta' }, variation: { id: 48838, name: 'new-cta' } },
};

const visit = (pathname: string) => vi.stubGlobal('location', { pathname });

describe('page assignments', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('collects what the current page rendered', () => {
    visit('/checkout');

    reportAssignment(VARIATION);
    reportAssignment(fallbackAssignment(50001));

    expect(getPageAssignments().pathname).toBe('/checkout');
    expect([...getPageAssignments().assignments.keys()]).toEqual([48812, 50001]);
  });

  it('starts over on another pathname', () => {
    visit('/a');
    reportAssignment(VARIATION);

    visit('/b');
    reportAssignment(fallbackAssignment(50001));

    expect(getPageAssignments()).toEqual({ pathname: '/b', assignments: new Map([[50001, fallbackAssignment(50001)]]) });
  });

  it('notifies subscribers with a new snapshot', () => {
    visit('/c');
    const listener = vi.fn<() => void>();
    const unsubscribe = subscribeToPageAssignments(listener);
    const before = getPageAssignments();

    reportAssignment(VARIATION);
    unsubscribe();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getPageAssignments()).not.toBe(before);
  });
});
