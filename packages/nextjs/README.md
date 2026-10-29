# @varify-io/nextjs

Server-side A/B testing with Varify for the Next.js App Router. The server decides which variation a visitor sees and renders it directly, so there is no flicker and no client-side DOM rewriting.

## Requirements

- Next.js 15.5 or later with the App Router, React 19, Node 20+
- An experiment of type **server-side** in Varify
- varify.js on the page, if exposures should be tracked. The SDK hands every exposure to varify.js, which applies consent and sends it to your tracking provider.

## Install

```sh
pnpm add @varify-io/nextjs
```

## Setup

Create the SDK once, with your team id from the Varify app:

```ts
// src/varify.ts
import { createVarify } from '@varify-io/nextjs';

export const varify = createVarify({ teamId: 'your-team-id' });

export const { getVariation, getVisitorId, VarifyExperiment, VarifyProvider, VarifyDebug } = varify;
```

`teamId` is your team's public id, a string of letters and digits. It is not the numeric id (`iid`) in the varify.js snippet.

Run its proxy on every page request. It gives each visitor an id and their assignments in a cookie before rendering starts:

```ts
// src/proxy.ts (Next.js 16) or src/middleware.ts (Next.js 15, export it as `middleware`)
import type { NextRequest } from 'next/server';

import { varify } from './varify';

export const proxy = (request: NextRequest) => varify.proxy(request);

export const config = {
  matcher: ['/((?!_next/|favicon.ico).*)'],
};
```

Pages outside the matcher render the original and track nothing.

Optionally, add the debug panel to your root layout. It only renders outside production:

```tsx
<body>
  {children}
  <VarifyDebug />
</body>
```

## Server Components

Render a variation with `<VarifyExperiment>`. It tracks the exposure when it renders:

```tsx
import { VarifyExperiment } from '@/varify';

export default function Page() {
  return (
    <>
      <VarifyExperiment id={269} variation={311}>
        <NewCheckoutButton />
      </VarifyExperiment>
      <VarifyExperiment id={269} original>
        <CheckoutButton />
      </VarifyExperiment>
    </>
  );
}
```

Or read the assignment with `getVariation` when the variation changes more than markup:

```tsx
import { getVariation } from '@/varify';

const { variation } = await getVariation(269); // a variation id, or null for the original
```

`getVariation` does not track. Render a `<VarifyExperiment>` (or call `useVariation`) for the same experiment on that page, or the exposure is never counted.

## Client Components

Wrap the part of the tree that needs assignments in `<VarifyProvider>` (a Server Component), then read them with `useVariation`, which also tracks the exposure:

```tsx
// page.tsx
import { VarifyProvider } from '@/varify';

export default function Page() {
  return (
    <VarifyProvider>
      <Cta />
    </VarifyProvider>
  );
}
```

```tsx
// cta.tsx
'use client';

import { useVariation } from '@varify-io/nextjs/client';

export const Cta = () => {
  const variation = useVariation(269);
  return variation === 311 ? <NewCheckoutButton /> : <CheckoutButton />;
};
```

## Tracking

Each experiment is tracked at most once per page (pathname). If a page renders an experiment several times, the first variation counts. The SDK passes exposures to `window.varify.trackServerSide`. Exposures that happen before varify.js has loaded are queued and sent once it loads. Experiments with tracking disabled in Varify are never tracked.

## Your own user ids

`getVisitorId()` returns the id Varify assigns this visitor by, or `null` for bots and pages outside the proxy matcher. Store it next to your own user id, for example on login, to join Varify's assignments with your data later:

```ts
import { getVisitorId } from '@/varify';

const visitorId = await getVisitorId();
```

## Previewing a variation

Add `?varify-force={experimentId}-{variationId}` to any URL, for example `?varify-force=269-311`. Variation `0` forces the original. The forced variation is stored in the cookie, so it sticks for later pages, and it is tracked like any other assignment.

## Behavior to know

- **Sticky assignments.** A visitor keeps their variation for as long as the cookie lasts (400 days), even if the traffic split changes later. Bucketing is deterministic and happens locally, with no network call per visitor.
- **Failure.** The SDK loads the experiment config with a 300 ms timeout. If loading fails, every experiment shows the original and nothing is tracked, while stored assignments are kept. Your pages never break because of Varify.
- **Bots** get no id and always see the original, so crawlers see one stable page.
- **Caching.** Responses that set the cookie are sent with `cache-control: private, no-store`. Pages that read assignments are rendered per request.

## Options

`createVarify(options)`:

| Option      | Default                                       | Description                                                                                                                 |
| ----------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `teamId`    | required                                      | Your team's public id (not the numeric `iid`)                                                                               |
| `timeoutMs` | `300`                                         | How long to wait for the config before showing the original                                                                 |
| `onError`   | none                                          | Called with a `VarifyError` (`reason`: `timeout`, `network`, `http`, `invalid-config`)                                      |
| `cookie`    | see below                                     | Name, domain, `sameSite` and lifetime of the cookie                                                                         |
| `isBot`     | user-agent check                              | `(request) => boolean`, to replace the bot detection                                                                        |
| `debug`     | on outside production                         | Logs each request's assignments and enables `<VarifyDebug>`                                                                 |
| `configUrl` | `https://delivery.varify.io/ss/{teamId}.json` | Load the config from your own cache or mirror instead, see the [core README](../core/README.md#serving-the-config-yourself) |
| `fetch`     | `globalThis.fetch`                            | Replace the fetch implementation                                                                                            |

### Cookie options

The defaults:

```ts
createVarify({
  teamId: 'your-team-id',
  cookie: { name: 'varify', sameSite: 'lax', maxAge: 60 * 60 * 24 * 400 },
});
```

Set `domain` (for example `'.example.com'`) to share assignments across subdomains.
