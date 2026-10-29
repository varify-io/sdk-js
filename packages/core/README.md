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

## `createVarifyClient(options)`

| Option      | Type                           | Default                                       | Description                                                                                                                                                                                            |
| ----------- | ------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `teamId`    | `string`                       | required                                      | The team's public id (the sqid), not the numeric `iid` from the varify.js snippet. Only used to build the default `configUrl`.                                                                         |
| `configUrl` | `string`                       | `https://delivery.varify.io/ss/{teamId}.json` | Where the config is loaded from. Replaces the whole URL: point it at your own cache or mirror of the file, or at another environment. See [Serving the config yourself](#serving-the-config-yourself). |
| `timeoutMs` | `number`                       | `300`                                         | How long `loadConfig()` waits before giving up. A timeout counts as a failed load.                                                                                                                     |
| `fetch`     | `typeof fetch`                 | `globalThis.fetch`                            | Called as `fetch(url, { headers: { accept: 'application/json' }, signal })`. Replace it to add caching or retries, or to stub the network in tests.                                                    |
| `onError`   | `(error: VarifyError) => void` | none                                          | Called once per failed load. `loadConfig()` never throws; without `onError`, failures are silent.                                                                                                      |

`loadConfig()` fetches on every call and caches nothing, so call it once per request. It resolves to the config, or to `null` when loading failed. `error.reason` says why:

| `reason`         | When                                                                  |
| ---------------- | --------------------------------------------------------------------- |
| `timeout`        | No response within `timeoutMs`                                        |
| `network`        | `fetch` threw                                                         |
| `http`           | A non-2xx response; the status is in `error.message`                  |
| `invalid-config` | The body is not JSON, or doesn't have the config's shape (`isConfig`) |

### Serving the config yourself

The config is a static JSON file, so you can sync it into your own cache or CDN and set `configUrl` to that copy. This removes a request to Varify from every page load.

- Serve the file unchanged. Anything that fails `isConfig` counts as a failed load, and every visitor sees the original.
- Keep the copy fresh. Varify regenerates the file whenever an experiment starts, stops or changes its traffic split, and your copy only shows that after it syncs. A stale copy keeps showing an ended experiment, or holds back a new one.
- `timeoutMs` and `onError` apply to your URL like to Varify's.

## `evaluate(config, state, options?)`

| Parameter                | Type                 | Description                                                                                                                                                                |
| ------------------------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config`                 | `Config \| null`     | The result of `loadConfig()`. `null` passes the stored assignments through untouched and assigns nothing.                                                                  |
| `state`                  | `State \| undefined` | The visitor's stored state, checked with `parseState`. `undefined` makes a new visitor with a new id.                                                                      |
| `options.force`          | `ForcedVariation`    | From `parseForceParam`. `variationId: null` forces the original. A variation id the experiment doesn't have is ignored, and assignment continues as if nothing was forced. |
| `options.generateUserId` | `() => string`       | Creates the id for a new visitor. Defaults to `crypto.randomUUID()`. It has to return a UUIDv4, or `parseState` rejects the stored state on the next request.              |

It returns an `Evaluation`:

| Field         | Type                      | Description                                                                                                                         |
| ------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `state`       | `State`                   | `{ uid, assignments }` to persist. It holds exactly the experiments in the config, so ended experiments drop out.                   |
| `changed`     | `boolean`                 | Whether `state` differs from what was passed in. Persist only when it is `true`.                                                    |
| `assignments` | `Map<number, Assignment>` | One per experiment in the config, keyed by experiment id. Read it with `getAssignment`, which falls back to the untracked original. |

An `Assignment`:

| Field          | Type                                           | Description                                                                                                                   |
| -------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `experimentId` | `number`                                       |                                                                                                                               |
| `variation`    | `number \| null`                               | The variation id, or `null` for the original                                                                                  |
| `tracking`     | `TrackingPayload \| null`                      | Pass this to `window.varify.trackServerSide` on the page. `null` when the experiment has tracking disabled, or for a fallback |
| `source`       | `'forced' \| 'stored' \| 'hash' \| 'fallback'` | How the variation was chosen, for debugging                                                                                   |

## Assignment rules

In order, for every experiment in the config:

1. A forced variation (from `varify-force`) wins.
2. A stored assignment is kept, if that variation still exists.
3. Otherwise the visitor is bucketed: `murmur3("{experimentId}:{userId}", seed 1) / 2³² × 100`, matched against the variations' traffic allocations in order. Whatever the allocations leave over is the original.

With a `null` config, the stored assignments are passed through untouched and nothing is assigned, so a failed load never loses stickiness.
