# Repository Guidelines

## Project Structure & Module Organization

This repository is a pnpm workspace coordinated by Turborepo. Package code lives under
`packages/*`; the current package is `packages/npm-starter`, with its public API rooted at
`packages/npm-starter/src/index.ts`. Add implementation files beside that entry point and export
public symbols from it. Shared TypeScript settings are in `tsconfig.base.json`, while repository
formatting and linting rules are in `biome.jsonc`. CI workflows live in `.github/workflows`, release
metadata in `.changeset`, and contributor notes in `docs/`. Generated `dist/`, coverage, and
`.artifacts/` content must not be committed.

## Build, Test, and Development Commands

Use Node.js 18.18 or newer and pnpm 11.15.0.

- `pnpm install --frozen-lockfile` installs the exact locked dependency graph.
- `pnpm dev` starts package builds in watch mode.
- `pnpm check` runs Biome formatting and lint checks; `pnpm check:fix` applies safe fixes.
- `pnpm typecheck` runs strict TypeScript checks across packages.
- `pnpm test` runs Vitest through Turborepo.
- `pnpm build` creates ESM, CommonJS, and declaration output in `dist/`.
- `pnpm pack` builds a publishable tarball in `.artifacts/` for package inspection.

Run `pnpm check && pnpm typecheck && pnpm test && pnpm build` before opening a pull request.

## Coding Style & Naming Conventions

Biome enforces two-space indentation, double quotes, no required semicolons, and a 100-character
line width. TypeScript is strict and targets ES2022 with NodeNext module resolution. Use
`camelCase` for variables and functions, `PascalCase` for types and classes, and descriptive
lowercase file names (for example, `client-options.ts`). Keep the public surface explicit through
`src/index.ts`; avoid exporting internal helpers accidentally.

## Testing Guidelines

Vitest is the test runner. Place tests near their implementation using `*.test.ts` or `*.spec.ts`.
Cover new behavior, edge cases, and regressions. No coverage threshold is currently configured, so
favor meaningful assertions over superficial line coverage. `--passWithNoTests` supports empty
starter packages but is not a substitute for tests once behavior is added.

## Commits, Pull Requests, and Releases

Follow `docs/git-convention.md`: `<type>(<scope>): <imperative summary>`, with a required scope,
for example `feat(sdk): add client factory`. Keep each commit to one logical change. Pull requests
should explain what changed and why, link relevant issues, and list verification commands. Call out
API changes, risks, and follow-ups. Add a changeset with `pnpm changeset` for publishable changes;
omit it only for changes that do not affect the released package.
