# @evensurface/paginate-drizzle — Drizzle ORM Pagination for TypeScript

`@evensurface/paginate-drizzle` adds type-safe, database-only offset pagination to Drizzle ORM. It
applies `limit` and `offset` to a Drizzle select query, runs a matching count query, and returns the
selected rows with complete pagination metadata.

Use it for paginated API endpoints, admin tables, search results, and server-rendered lists built
with Drizzle ORM and Node.js.

## What you get

- Inferred item types from Drizzle partial selects and joins
- Direct support for `db.$count()` and `select({ total: count() })`
- Safe parsing of request `page` and `limit` values
- Configurable minimum, default, and maximum page sizes
- Totals, page counts, offsets, item ranges, and next/previous flags
- One select execution per non-empty page and no select execution for empty results

This package provides database pagination only. It does not create routes, services, or UI
components.

## Requirements

- Node.js 18.18 or newer
- Drizzle ORM `0.45.4` or newer, below `1.0.0`
- `@evensurface/paginate`

## Installation

```sh
pnpm add @evensurface/paginate @evensurface/paginate-drizzle drizzle-orm
```

```sh
npm install @evensurface/paginate @evensurface/paginate-drizzle drizzle-orm
```

```sh
yarn add @evensurface/paginate @evensurface/paginate-drizzle drizzle-orm
```

## Quick start

Build a deterministic select-query factory, create a count query with the same filters, and pass
request inputs directly to `paginate`:

```ts
import { asc, desc, eq } from "drizzle-orm"
import { paginate } from "@evensurface/paginate-drizzle"
import { db } from "./db"
import { users } from "./schema"

const where = eq(users.active, true)

const result = await paginate({
  query: () =>
    db
      .select({
        id: users.id,
        name: users.name,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt), asc(users.id)),
  countQuery: db.$count(users, where),
  page: request.query.page,
  limit: request.query.limit,
})
```

The selected row type is inferred. For example, `result.items` above has the type:

```ts
type SelectedRows = Array<{
  id: number
  name: string
  createdAt: Date
}>
```

The full result is ready for an API response or a rendered view:

```ts
{
  items: [/* inferred Drizzle rows */],
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

## Count matching rows

The count query must describe the same filtered dataset as the select query. The adapter supports
two Drizzle count patterns.

### Use `db.$count()`

This is the shortest option:

```ts
const where = eq(users.active, true)

const result = await paginate({
  query: () => db.select().from(users).where(where).orderBy(asc(users.id)),
  countQuery: db.$count(users, where),
  page,
  limit,
})
```

### Use a select count query

Use Drizzle's `count()` expression when you need a composed count query:

```ts
import { count, eq } from "drizzle-orm"

const where = eq(users.active, true)

const result = await paginate({
  query: () => db.select().from(users).where(where).orderBy(asc(users.id)),
  countQuery: db.select({ total: count() }).from(users).where(where),
  page,
  limit,
})
```

The count select must return exactly one row with a non-negative safe-integer `total` field. Direct
`$count()` results have the same numeric requirement. Empty, multi-row, fractional, negative, and
unsafe count results throw a `RangeError`, since they indicate an invalid count or usually an
incorrectly grouped aggregate.

## Add search and optional filters

Build the select and count queries from the same conditions. Drizzle's dynamic query mode is useful
when filters are conditional:

```ts
import { and, asc, count, desc, eq, ilike } from "drizzle-orm"

const filters = [eq(users.active, true)]

if (search) {
  filters.push(ilike(users.name, `%${search}%`))
}

const where = and(...filters)

let countQuery = db
  .select({ total: count() })
  .from(users)
  .$dynamic()

countQuery = countQuery.where(where)

const result = await paginate({
  query: () => {
    let query = db
      .select({
        id: users.id,
        name: users.name,
        createdAt: users.createdAt,
      })
      .from(users)
      .$dynamic()

    query = query.where(where).orderBy(desc(users.createdAt), asc(users.id))
    return query
  },
  countQuery,
  page,
  limit,
})
```

The adapter cannot determine whether the two queries use equivalent filters. Mismatched filters
produce metadata that does not describe the returned rows.

## Paginate joins and partial selects

Drizzle's inferred result type is preserved through partial selects and joins:

```ts
import { asc, eq } from "drizzle-orm"

const where = eq(users.active, true)

const result = await paginate({
  query: () =>
    db
      .select({
        userId: users.id,
        userName: users.name,
        teamName: teams.name,
      })
      .from(users)
      .leftJoin(teams, eq(users.teamId, teams.id))
      .where(where)
      .orderBy(asc(users.id)),
  countQuery: db.$count(users, where),
  page,
  limit,
})
```

Count the entity being paginated, not blindly the raw joined rows. One-to-many joins can duplicate
rows and inflate counts; use an appropriate distinct, subquery, or grouped strategy for your data
model.

## Configure page sizes

By default, missing or invalid limits become `20`, and valid limits are clamped between `1` and
`100`. Customize the values per call:

```ts
const createQuery = () => db.select().from(users).orderBy(asc(users.id))
const countQuery = db.$count(users)

const result = await paginate({
  query: createQuery,
  countQuery,
  page,
  limit,
  pageSizeOptions: {
    defaultLimit: 25,
    minLimit: 5,
    maxLimit: 200,
  },
})
```

Page and limit values may come directly from URL query parameters. Invalid pages become page `1`.
If the requested page is higher than the available range, it resolves to the last page.

## Always use deterministic ordering

Offset pagination needs stable ordering. Add an `orderBy`, and when the primary sort can contain
ties, add a unique column such as the primary key:

```ts
.orderBy(desc(users.createdAt), asc(users.id))
```

Without a unique tie-breaker, records with equal sort values can move between pages or appear more
than once as the database chooses their relative order.

## Query factories and safe reuse

Pass `query` as a function that creates a new select builder. Drizzle's `.limit()` and `.offset()`
methods mutate a builder, so the adapter calls the factory once per non-empty pagination request
and applies pagination only to that fresh builder. This keeps reusable base conditions safe and
also prevents concurrent requests from changing each other's pagination. Returning a builder that
was already returned by the factory throws a `TypeError` instead of silently reusing its mutated
pagination state.

## Query execution behavior

The adapter:

1. Parses the requested page and limit, validating page-size configuration.
2. Executes the count query.
3. Resolves the requested page against the total.
4. Skips the select query when the total is zero.
5. Otherwise creates one select query, applies `.limit(limit).offset(offset)`, and executes it once.

Resolving the page after counting means a request such as page `999` returns the real last page
instead of an empty page.

The count and select are separate database statements. Rows can change between them unless the
caller runs both through a transaction or another database-specific consistent-snapshot strategy.
The adapter intentionally does not start transactions because transaction semantics belong to the
application and database driver.

## Drizzle-specific tradeoffs

- **The select query must be a factory.** Drizzle mutates builders when `.limit()` and `.offset()`
  are applied. Creating a builder is slightly more verbose, but it prevents pagination state from
  leaking into later or concurrent executions.
- **Exact counts may dominate request time.** A filtered count, distinct count, grouped subquery,
  or count across joins can cost more than fetching one page. Inspect the query plan and indexes
  for production workloads.
- **Join cardinality is application-specific.** The adapter cannot know whether you intend to
  count users, joined rows, or distinct entities. A valid SQL count can still be the wrong count
  for the interface being paginated.
- **A transaction is not automatic.** The adapter accepts existing Drizzle builders and does not
  choose isolation levels or open a transaction. Build both queries from the same transaction
  object when a consistent database snapshot is required.
- **Deep pages retain normal offset costs.** The adapter does not optimize or emulate offsets.
  Database work generally increases as the offset grows.
- **Ordering is not enforced by the type system.** A query without `orderBy` still typechecks.
  Always use a deterministic order with a unique final tie-breaker.

These constraints are intentional: the adapter stays database-driver independent and leaves query
planning, transactions, and entity-counting semantics with the application.

## Low-level adapter usage

Most applications should import `paginate` from `@evensurface/paginate-drizzle`. For custom
composition, use `createDrizzleAdapter<TItem>()` with the core package:

```ts
import { paginate } from "@evensurface/paginate"
import { createDrizzleAdapter } from "@evensurface/paginate-drizzle"

type UserRow = typeof users.$inferSelect

const createUserQuery = () => db.select().from(users).orderBy(users.id)
const countQuery = db.$count(users)

const result = await paginate({
  adapter: createDrizzleAdapter<UserRow>(),
  query: createUserQuery,
  countQuery,
  page,
  limit,
})
```

## Frequently asked questions

### Does Drizzle pagination preserve selected row types?

Yes. The `paginate` function infers its item type from the select query, including partial selects
and joined result shapes.

### Can I pass URL query parameters directly?

Yes. `page` and `limit` accept unknown input. Numeric strings are parsed, invalid pages fall back
to `1`, and invalid limits use the configured default.

### Why does pagination need a separate count query?

The total is required to calculate `totalPages`, next/previous flags, item positions, and the
resolved last page. Keeping the count query explicit also lets you choose the correct counting
strategy for filters and joins.

### Does it support PostgreSQL, MySQL, and SQLite?

The adapter operates on Drizzle select and count query builders rather than a specific database
driver. It can be used wherever the queries satisfy those Drizzle interfaces.

### Does it support cursor pagination?

No. It implements offset pagination for numbered-page navigation. Cursor pagination can be a
better fit for large or frequently changing feeds.

## Related package

See [`@evensurface/paginate`](../../paginate/README.md) for standalone parsing, metadata,
page-window utilities, and custom ORM adapters.

## License

MIT
