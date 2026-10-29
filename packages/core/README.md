# @varify-io/core

The framework-agnostic core of the Varify SDKs: it loads a team's experiment config, assigns visitors locally and keeps their assignments sticky. It has no runtime dependencies and runs anywhere with `fetch` and `crypto.randomUUID`.

For a Next.js app, use [`@varify-io/nextjs`](../nextjs) instead. Use this package to build an integration for another framework.

## Usage

```ts
import { createVarifyClient, evaluate, getAssignment, parseForceParam, parseState } from '@varify-io/core';

const client = createVarifyClient({ teamId: 'your-team-id', onError: (error) => log(error.reason) });

// Once per request
const config = await client.loadConfig(); // never throws; null when loading failed
const stored = parseState(readFromYourStore()); // undefined when missing or malformed
const force = parseForceParam(url.searchParams.get('varify-force'));

const evaluation = evaluate(config, stored, { force });
if (evaluation.changed) {
  writeToYourStore(evaluation.state);
}

const assignment = getAssignment(evaluation, 269);
assignment.variation; // a variation id, or null for the original
assignment.tracking; // hand this to window.varify.trackServerSide on the page; null means do not track
```

## API

| Export                                    | Description                                                                                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `createVarifyClient(options)`             | Returns `{ loadConfig }`. Options: `teamId` (the team's public id, not the numeric `iid`), `timeoutMs` (300), `onError`, `configUrl`, `fetch` |
| `evaluate(config, state, options?)`       | Assigns every experiment; returns `{ state, changed, assignments }`. Options: `force`, `generateUserId`                                       |
| `getAssignment(evaluation, experimentId)` | The assignment, or the untracked original for an unknown experiment                                                                           |
| `fallbackAssignment(experimentId)`        | The untracked original, for when there is no evaluation (no visitor id, no config)                                                            |
| `parseState(value)`                       | Validates stored state from an untrusted source                                                                                               |
| `parseForceParam(value)`, `FORCE_PARAM`   | Parses `varify-force={experimentId}-{variationId}`; variation `0` is the original                                                             |
| `bucket(experimentId, userId)`            | The visitor's position in an experiment, `0 ≤ bucket < 100`                                                                                   |
| `isConfig(value)`                         | Type guard for the config shape                                                                                                               |
| `VarifyError`                             | Passed to `onError`, with `reason`: `timeout`, `network`, `http` or `invalid-config`                                                          |

## Assignment rules

In order, for every experiment in the config:

1. A forced variation (from `varify-force`) wins.
2. A stored assignment is kept, if that variation still exists.
3. Otherwise the visitor is bucketed: `murmur3("{experimentId}:{userId}", seed 1) / 2³² × 100`, matched against the variations' traffic allocations in order. Whatever the allocations leave over is the original.

With a `null` config, the stored assignments are passed through untouched and nothing is assigned, so a failed load never loses stickiness.
