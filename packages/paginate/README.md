# @evensurface/paginate

Framework-independent, ORM-agnostic offset pagination for TypeScript.

It parses page parameters, enforces page-size boundaries, calculates offsets and pagination
metadata, generates compact page-navigation windows, and provides an adapter interface for
database integrations.

## Requirements

- Node.js 18.18 or newer

## Installation

```sh
pnpm add @evensurface/paginate
```

## Basic usage

Provide an adapter that knows how to count and fetch records for your data source:

```ts
import { paginate, type PaginationAdapter } from "@evensurface/paginate"

type UserQuery = { active: boolean }
type User = { id: number; name: string }

const adapter: PaginationAdapter<UserQuery, UserQuery, User> = {
  async count(query) {
    return database.users.count(query)
  },
  async fetch(query, { limit, offset }) {
    return database.users.findMany({ ...query, limit, offset })
  },
}

const result = await paginate({
  adapter,
  query: { active: true },
  countQuery: { active: true },
  page: "2",
  limit: "20",
})
```

The result matches the following shape:

```ts
type PaginatedUsers = {
  items: User[]
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
  }
}
```

Invalid page values fall back to page 1. Invalid limits fall back to 20, and valid limits are
clamped between 1 and 100 by default. Pages beyond the available range resolve to the last page.

## Page-size configuration

Override the default page-size boundaries per request:

```ts
const result = await paginate({
  adapter,
  query,
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

## Parsing and metadata utilities

The core utilities can also be used independently:

```ts
import {
  calculateOffset,
  createPageWindow,
  createPaginationMetadata,
  parseLimit,
  parsePage,
} from "@evensurface/paginate"

const page = parsePage(request.query.page)
const limit = parseLimit(request.query.limit)
const offset = calculateOffset(page, limit)

const pagination = createPaginationMetadata({ page, limit, total: 95 })
const navigation = createPageWindow({ page: pagination.page, totalPages: pagination.totalPages })
```

`createPageWindow` returns page numbers and the literal `"ellipsis"` for omitted ranges.

## ORM adapters

Use `@evensurface/paginate-drizzle` for Drizzle ORM queries. Custom integrations can implement
`PaginationAdapter<TQuery, TCountQuery, TItem>` directly.

## API

The package exports:

- `paginate`
- `parsePage` and `parseLimit`
- `calculateOffset` and `resolvePage`
- `createPaginationMetadata` and `createPageWindow`
- `DEFAULT_PAGE_SIZE`, `MIN_PAGE_SIZE`, and `MAX_PAGE_SIZE`
- the TypeScript types needed to implement pagination adapters

## License

MIT
