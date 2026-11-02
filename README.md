# @seashq/pager

Framework-independent, ORM-agnostic utilities for offset pagination.

`@seashq/pager` provides page and limit parsing, offset calculation, pagination metadata,
page-navigation windows, and adapter-based pagination. It supports offset pagination only.

First-party ORM integrations:

- [`@seashq/pager-drizzle`](packages/adapter/drizzle/README.md) for Drizzle ORM

## Installation

```sh
pnpm add @seashq/pager
```

## API

The package exports `paginate`, `parsePage`, `parseLimit`, `calculateOffset`,
`resolvePage`, `createPaginationMetadata`, and `createPageWindow`, along with the
types required to implement a `PaginationAdapter`.

## License

MIT
