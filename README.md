# @evensurface/paginate

Framework-independent, ORM-agnostic offset pagination by
[Evensurface](https://evensurface.com).

> The `@evensurface` npm scope and the
> [`evensurface/paginate`](https://github.com/evensurface/paginate) repository are planned
> placeholders and are not live yet.

Development requires Node.js 22.18 or newer. The published packages support Node.js 18.18 and
newer.

`@evensurface/paginate` provides page and limit parsing, offset calculation, pagination metadata,
page-navigation windows, and adapter-based pagination. It supports offset pagination only.

First-party ORM integrations:

- [`@evensurface/paginate-drizzle`](packages/adapter/drizzle/README.md) for Drizzle ORM

## Installation

```sh
pnpm add @evensurface/paginate
```

## API

The package exports `paginate`, `parsePage`, `parseLimit`, `calculateOffset`,
`resolvePage`, `createPaginationMetadata`, and `createPageWindow`, along with the
types required to implement a `PaginationAdapter`.

## License

MIT
