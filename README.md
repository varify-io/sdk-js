# varify-sdk-js

JavaScript SDKs for running Varify experiments in the frameworks themselves: assignment happens on the server (or in the framework's runtime) instead of in varify.js on the page.

| Package                                | What it is                                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------------------------- |
| [`@varify-io/core`](packages/core)     | Framework-agnostic: loads the delivery file, buckets users locally, keeps assignments sticky |
| [`@varify-io/nextjs`](packages/nextjs) | Next.js App Router: proxy/middleware, `getVariation`, `useVariation`, `<VarifyExperiment>`   |

[`examples/next-app`](examples/next-app) uses both against a real delivery file. The package READMEs are the user documentation.

## Setup

Needs Node 20+ and pnpm (`corepack enable pnpm` picks the version from `package.json`).

```sh
pnpm install
pnpm build
```

## Scripts

| Command                 | Does                                                 |
| ----------------------- | ---------------------------------------------------- |
| `pnpm build`            | Builds every package with tsdown                     |
| `pnpm test`             | Vitest in every package                              |
| `pnpm typecheck`        | `tsc` in every package                               |
| `pnpm lint`             | oxlint + oxfmt check; `pnpm format` fixes formatting |
| `pnpm check:package`    | publint + arethetypeswrong on the built packages     |
| `pnpm changeset`        | Records a version bump for the next release          |
| `pnpm renovate:dry-run` | Lists available dependency updates (needs Docker)    |
| `pnpm renovate`         | Applies them to the working tree                     |

## Example app

```sh
cp examples/next-app/.env.example examples/next-app/.env.local
pnpm --filter next-app dev   # http://localhost:3100
```

`.env.example` points at a local laravel-spark; drop `VARIFY_CONFIG_URL` to read from `https://delivery.varify.io`. Set `VARIFY_SCRIPT_URL` and `VARIFY_IID` to load varify.js and see exposures tracked.

## Contributing

Branches, commits, releases and code rules: [CONTRIBUTING.md](CONTRIBUTING.md). How a request flows through the SDK: [.docs/ARCHITECTURE.md](.docs/ARCHITECTURE.md).
