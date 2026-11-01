# TypeScript npm package starter

A production-ready starting point for a TypeScript npm package. It provides ESM and CommonJS builds, generated type declarations, formatting and linting, release versioning, and continuous integration.

## Start building

Add your package's public API in `packages/npm-starter/src/index.ts`. Anything exported from this file becomes part of your published API.

## Development

```sh
pnpm install
pnpm check
pnpm test
pnpm build
```

To publish a release, add a changeset with `pnpm changeset`, then run `pnpm version-packages` and `pnpm release` after the version bump has been committed.

## License

MIT
