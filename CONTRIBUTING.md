# Contributing

How the packages fit together is in [.docs/ARCHITECTURE.md](.docs/ARCHITECTURE.md).

## Run the checks the way CI does

```sh
pnpm lint            # oxlint + oxfmt --check; pnpm format fixes formatting
pnpm typecheck
pnpm test
pnpm check:package   # publint + arethetypeswrong on the built packages
pnpm audit
```

CI also runs betterleaks over the git history and a Trivy secret scan. A merge request can only merge with a green pipeline.

## Rules that are not up for negotiation

**Never edit a linter config to make an error go away.** Not `.oxlintrc.json`, not `.oxfmtrc.json`, not the `tsconfig` strictness flags. Fix the code. If a rule is wrong for this codebase, change it deliberately in its own commit.

**The SDK never breaks the customer's page.** Nothing in a render path throws because of Varify. A failure (config, cookie, unknown experiment) ends in the untracked original and, where there is one, a call to `onError`.

**`@varify-io/core` has no runtime dependencies** and no framework imports.

**The bucketing formula doesn't change.** Changing it moves visitors between variations of running experiments. The murmur3 and bucket test vectors pin it.

## Code style in short

- When two pieces don't fit, change the one that is wrong, usually the producer of the bad value, instead of wrapping it in an adapter, cast or guard. Prefer the fix that deletes code. Don't handle cases no current caller produces.
- No type assertions in `src`. Fix the type at its source, or narrow with a type guard. Tests are exempt.
- Input from outside the SDK (the config file, cookies, query parameters) is `unknown` until a guard such as `isConfig` or `parseState` has checked it.
- Exports declare their types explicitly; `isolatedDeclarations` enforces it.
- Every type that appears in a public signature is exported from that entry point, including types from `@varify-io/core` used by an integration. `pnpm check:package` fails otherwise (api-extractor's `ae-forgotten-export`).
- Public API changes are breaking changes for customers. Add rather than rename.
- No comments that say what the code does. A comment is for: security reasoning, framework behavior, or an invariant a reader would otherwise "fix" away. Docblocks on public API are fine, since they show up in the editor. Never mention callers, sibling files or ordering, anything an edit elsewhere could make false.

## Tests

Vitest, in `packages/*/test`, one file per source module. Each test reads Arrange, Act, Assert, and its name states the behavior. Module-level state (such as the exposure dedupe in `track.ts`) has no reset, so cases that depend on it need `vi.resetModules()` and a dynamic `await import()`.

For anything that runs in the browser or in the proxy, check it in the example app as well: `pnpm --filter next-app dev`. A green suite says nothing about whether Next.js actually renders what you expect.

## Releases

Changesets are written when releasing on `main`, not in feature merge requests: `pnpm changeset` there records the bump for every package that changed since the last release. Pick the bump from what customers see: `patch` for fixes, `minor` for new API, `major` for anything that breaks existing code. Before 1.0, breaking changes are `minor`.

## Branches

Work on a branch off `develop` and finish it through a merge request into `develop`. `main` is the release branch. Never merge into `develop` or `main` locally.

## Commits

Conventional commits, enforced by commitlint on a `commit-msg` hook. Allowed types: `build`, `chore`, `docs`, `feat`, `fix`, `perf`, `refactor`, `release`, `style`, `test`, `update`. Body lines can be at most 100 characters.

Write the message as the change, nothing else: no tool attribution, no generated-by footers. The body, when there is one, explains _why_; the diff already shows what changed. The same goes for merge request descriptions.

## Dependencies

Renovate isn't running automatically yet. `pnpm renovate:dry-run` lists available updates, and `pnpm renovate` applies them to the working tree (both need Docker). New releases wait 5 days, devDependencies are pinned, and published dependencies keep ranges so customers can dedupe.
