# TypeScript Pagination for Any Framework or ORM

`@evensurface/paginate` is a small, type-safe offset pagination library for Node.js and
TypeScript. It turns untrusted `page` and `limit` values into database-ready offsets and returns
consistent pagination metadata for APIs, server-rendered pages, and admin dashboards.

Use the core package with any database or ORM, or add the first-party Drizzle ORM adapter.

> The `@evensurface` npm scope and the
> [`evensurface/paginate`](https://github.com/evensurface/paginate) repository are planned
> placeholders and are not live yet.

## Choose a package

| Package | Use it when | Documentation |
| --- | --- | --- |
| `@evensurface/paginate` | You want ORM-agnostic pagination utilities or a custom adapter | [Core guide](packages/paginate/README.md) |
| `@evensurface/paginate-drizzle` | You use Drizzle ORM and want inferred row types | [Drizzle guide](packages/adapter/drizzle/README.md) |

## What it handles

- Parses page and page-size values from URLs, forms, and API requests
- Clamps page sizes to configurable minimum and maximum limits
- Calculates safe SQL-style `limit` and `offset` values
- Returns totals, page counts, item ranges, and next/previous-page flags
- Resolves out-of-range requests to the last available page
- Generates compact navigation such as `1 … 4 5 6 … 20`
- Preserves item types through generic and Drizzle-specific adapters

This library implements **offset pagination**. It does not generate routes, render pagination UI,
or prescribe a web framework.

## Quick start

Install the core package:

```sh
pnpm add @evensurface/paginate
```

Create an adapter for your data source and paginate a query:

```ts
import { paginate, type PaginationAdapter } from "@evensurface/paginate"

type User = { id: number; name: string }
type UserFilter = { active: boolean }

const adapter: PaginationAdapter<UserFilter, UserFilter, User> = {
  count: (filter) => database.users.count(filter),
  fetch: (filter, { limit, offset }) =>
    database.users.findMany({ ...filter, limit, offset, orderBy: { id: "asc" } }),
}

const result = await paginate({
  adapter,
  query: { active: true },
  countQuery: { active: true },
  page: request.query.page,
  limit: request.query.limit,
})
```

The result contains the selected items and frontend-ready metadata:

```ts
{
  items: [/* typed User records */],
  pagination: {
    page: 2,
    limit: 20,
    offset: 20,
    total: 95,
    totalPages: 5,
    hasNextPage: true,
    hasPreviousPage: true,
    firstItem: 21,
    lastItem: 40,
  },
}
```

## Drizzle ORM quick start

```sh
pnpm add @evensurface/paginate @evensurface/paginate-drizzle drizzle-orm
```

```ts
import { desc, eq } from "drizzle-orm"
import { paginate } from "@evensurface/paginate-drizzle"
import { db } from "./db"
import { users } from "./schema"

const where = eq(users.active, true)

const result = await paginate({
  query: () => db.select().from(users).where(where).orderBy(desc(users.id)),
  countQuery: db.$count(users, where),
  page: request.query.page,
  limit: request.query.limit,
})
```

See the [Drizzle pagination guide](packages/adapter/drizzle/README.md) for filtered queries,
joins, count queries, stable ordering, and page-size configuration.

## Defaults and behavior

| Input or situation | Behavior |
| --- | --- |
| Missing or invalid `page` | Uses page `1` |
| Missing or invalid `limit` | Uses `20` |
| `limit` below `1` or above `100` | Clamps valid integers to the allowed range |
| Requested page exceeds the result set | Returns the last available page |
| Query has no matching records | Returns no items and skips the fetch query |

All defaults are configurable. Read the [complete core package documentation](packages/paginate/README.md)
for API examples and customization.

## When should I use offset pagination?

Offset pagination is a good fit for admin tables, search results, directories, and other interfaces
where users expect numbered pages and direct navigation. For very large or rapidly changing feeds,
cursor pagination may provide more stable performance and ordering.

The tradeoff is that every paginated request performs a count before fetching rows, deep offsets
can become increasingly expensive, and separate count/fetch operations can observe different data
when records change concurrently. The application must also provide deterministic ordering and
ensure the count and fetch use equivalent filters. See the package guides for the complete
operational considerations.

## Requirements

- Published packages: Node.js 18.18 or newer
- Repository development: Node.js 22.18 or newer and pnpm 11.15.0

## Contributing

This repository is a pnpm workspace managed with Turborepo. Package source lives under `packages/`.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm typecheck
pnpm test
pnpm build
```

## License

MIT
