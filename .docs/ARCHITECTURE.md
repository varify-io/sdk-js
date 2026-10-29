# Architecture

How the SDK assigns and tracks a visitor.

## Packages

- **`@varify-io/core`** knows nothing about frameworks: it loads the config, validates input, and evaluates assignments. It has no runtime dependencies and never throws into a render. Every failure turns into "show the original, track nothing".
- **`@varify-io/nextjs`** owns everything request- and React-specific: the proxy, the cookie, Server Component and client APIs, tracking and the debug panel. The `./client` entry point holds the `'use client'` parts.

A new framework integration builds on `core` the way `nextjs` does and doesn't reach into another integration.

## A request

```
browser ──▶ proxy ──▶ Server Components ──▶ HTML + tracking effects ──▶ varify.js ──▶ tracking provider
              │             │
              ▼             ▼
       loadConfig()    loadConfig() (once per request, React cache)
       evaluate()      evaluate() with the cookie the proxy set
       set cookie
```

1. **The proxy** (Next.js `proxy.ts` / `middleware.ts`) reads the `varify` cookie, applies `?varify-force`, and evaluates every experiment in the config. If the state changed, it writes the cookie on the response and on the forwarded request, so rendering in the same request already sees it. It also sends `cache-control: private, no-store`, because a cached response would hand one visitor's id to everyone. Bots and non-cookie stores skip this step.
2. **Rendering** evaluates again from that cookie, once per request (`React.cache`). It never generates an id itself: without a cookie (a bot, or a route outside the matcher) it falls back to the untracked original, because a fresh id per request would assign the visitor anew on every page.
3. **Tracking** happens in the browser. `<VarifyExperiment>`, `<VarifyTracking>` and `useVariation` report the exposure from an effect, at most once per experiment per pathname (the first variation wins). They call `window.varify.trackServerSide`, or queue in `window.varify.serverSideQueue` until varify.js loads and drains it. varify.js applies consent and the team's dataSaveMode, then sends the exposure to the tracking provider.

varify.js skips experiments of type `server` in its own delivery, so they are never assigned twice.

## The config

`https://delivery.varify.io/ss/{teamId}.json` is a static file that laravel-spark regenerates whenever an experiment changes. It is fetched with a 300 ms timeout. A failed or malformed load returns `null`: assignments are kept, nothing is assigned or tracked. `isConfig` validates the shape, because the file is input from outside the SDK.

## Assignment

Forced, then stored, then bucketed (see the [core README](../packages/core/README.md#assignment-rules)). The bucket is `murmur3("{experimentId}:{userId}", seed 1) / 2³² × 100`. Any other implementation has to reproduce this formula exactly, or visitors would be split differently. The test vectors in `packages/core/test/murmur3.test.ts` and `bucket.test.ts` define it.

## The cookie

`{uid}.{experimentId}-{variationId}_{experimentId}-{variationId}…`: a UUIDv4, then one entry per experiment, with variation `0` for the original. It's httpOnly, `SameSite=Lax`, and lasts 400 days. The format avoids characters that need encoding and stays far shorter than JSON. `parseState` rejects anything malformed, so a tampered cookie gets the visitor a new id instead of crashing the render.
