# varify-sdk-js

JavaScript SDKs for running Varify experiments in the frameworks themselves: assignment happens on the server (or in the framework's runtime) instead of in varify.js on the page.

| Package                                | What it is                                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------------------------- |
| [`@varify-io/core`](packages/core)     | Framework-agnostic: loads the delivery file, buckets users locally, keeps assignments sticky |
| [`@varify-io/nextjs`](packages/nextjs) | Next.js App Router: proxy/middleware, `getVariation`, `useVariation`, `<VarifyExperiment>`   |

[`examples/next-app`](examples/next-app) uses both against a real delivery file.

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

- Branch off `develop` and merge back through an MR; `main` is the release branch.
- Commits follow Conventional Commits, enforced by commitlint (types in `commitlint.config.cjs`).
- A change that affects a published package needs a changeset: `pnpm changeset`.

CI runs lint, typecheck, tests, the package check, `pnpm audit`, and secret scans (betterleaks over the git history, Trivy over the files). An MR can only merge when the pipeline passes.
