# @evensurface/paginate-drizzle

Database-only offset pagination for Drizzle ORM, powered by `@evensurface/paginate`.

Requires Node.js 18.18 or newer.

It applies `limit` and `offset` to a Drizzle select query, executes a matching count query,
and returns inferred rows with pagination metadata. It does not provide routing, service, or UI
abstractions.

## Installation

```sh
pnpm add @evensurface/paginate @evensurface/paginate-drizzle drizzle-orm
```

## Basic usage

```ts
import { asc, desc, eq } from "drizzle-orm"
import { paginate } from "@evensurface/paginate-drizzle"
import { db } from "./db"
import { users } from "./schema"

const where = eq(users.active, true)

const result = await paginate({
  query: db
    .select({
      id: users.id,
      name: users.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt), asc(users.id)),
  countQuery: db.$count(users, where),
  page,
  limit,
})
```

The selected row type is inferred:

```ts
{
  items: Array<{
    id: number
    name: string
    createdAt: Date
  }>,
  pagination: {
    page: number
    limit: number
    offset: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
    firstItem: number
    lastItem: number
  },
}
```

## Count queries

The adapter accepts Drizzle's `$count()` result directly:

```ts
countQuery: db.$count(users, where)
```

It also accepts a select query whose result has a numeric `total` field:

```ts
import { count } from "drizzle-orm"

countQuery: db
  .select({ total: count() })
  .from(users)
  .where(where)
```

A select count query must return exactly one row. Empty and multi-row results are rejected because
they usually mean the query groups or filters the aggregate incorrectly.

## Conditional filters

Build the page query and count query from the same condition. Drizzle's dynamic mode works for
lists assembled conditionally:

```ts
import { and, asc, count, desc, eq, ilike } from "drizzle-orm"

const filters = [eq(users.active, true)]

if (search) {
  filters.push(ilike(users.name, `%${search}%`))
}

const where = and(...filters)
let query = db
  .select({ id: users.id, name: users.name, createdAt: users.createdAt })
  .from(users)
  .$dynamic()
let countQuery = db.select({ total: count() }).from(users).$dynamic()

query = query.where(where).orderBy(desc(users.createdAt), asc(users.id))
countQuery = countQuery.where(where)

const result = await paginate({ query, countQuery, page, limit })
```

The adapter cannot detect mismatched filters. If the page and count queries use different
conditions, the metadata will not describe the returned rows.

## Joins

Joins and partial selects retain Drizzle's inferred result type:

```ts
const where = eq(users.active, true)

const result = await paginate({
  query: db
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

Count the entity being paginated, not the raw joined rows. A one-to-many join can duplicate page
rows and counts; handle that in the query with an appropriate distinct or grouped strategy.

## Ordering and execution

Always use deterministic ordering. If the primary sort is not unique, append a unique column such
as the primary key:

```ts
.orderBy(desc(users.createdAt), asc(users.id))
```

The adapter executes the count query first. It uses the total to clamp an out-of-range page and
then executes the select query once with the resolved `limit` and `offset`. It skips the select
query entirely when the count is zero.

## Low-level adapter

Use `createDrizzleAdapter<TItem>()` to compose directly with the core `paginate` function. Most
callers should use `paginate`, which infers `TItem` from the select query.
