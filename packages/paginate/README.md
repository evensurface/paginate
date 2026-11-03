# @evensurface/paginate

Framework-independent, ORM-agnostic offset pagination for Node.js and TypeScript.

`@evensurface/paginate` safely parses URL pagination parameters, calculates database offsets,
returns complete pagination metadata, and builds compact page-number navigation. Connect it to any
database, ORM, API, or in-memory data source with a small typed adapter.

## Why use it?

- Accepts untrusted `page` and `limit` values directly from request inputs
- Provides configurable page-size limits to protect APIs and databases
- Returns one consistent, typed result shape across different data sources
- Handles empty datasets and page numbers beyond the available range
- Includes standalone helpers for metadata and pagination UI
- Has no required ORM or web-framework integration

This package implements **offset pagination**. It does not generate routes or UI components.

## Requirements

- Node.js 18.18 or newer
- TypeScript is recommended for type inference but is not required at runtime

## Installation

```sh
pnpm add @evensurface/paginate
```

```sh
npm install @evensurface/paginate
```

```sh
yarn add @evensurface/paginate
```

## Quick start

An adapter tells the package how to count matching records and fetch one page. Keep the filters in
`query` and `countQuery` equivalent so the returned total describes the fetched items.

```ts
import { paginate, type PaginationAdapter } from "@evensurface/paginate"

type User = {
  id: number
  name: string
}

type UserFilter = {
  active: boolean
}

const userAdapter: PaginationAdapter<UserFilter, UserFilter, User> = {
  async count(filter) {
    return database.users.count(filter)
  },
  async fetch(filter, { limit, offset }) {
    return database.users.findMany({
      ...filter,
      limit,
      offset,
      orderBy: { id: "asc" },
    })
  },
}

const result = await paginate({
  adapter: userAdapter,
  query: { active: true },
  countQuery: { active: true },
  page: request.query.page,
  limit: request.query.limit,
})
```

Request values may be numbers, numeric strings, missing values, or any other unknown input. You do
not need to parse query-string values before passing them to `paginate`.

## Result shape

For page `2`, limit `20`, and `95` matching records, the result has this shape:

```ts
{
  items: [/* User[] */],
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

Use the fields directly in an API response or pagination interface:

```ts
return Response.json(result)
```

```ts
const summary = `Showing ${result.pagination.firstItem}–${result.pagination.lastItem} of ${result.pagination.total}`
```

### Pagination metadata

| Field | Meaning |
| --- | --- |
| `page` | Resolved current page, starting at `1` |
| `limit` | Items requested per page after defaults and boundaries are applied |
| `offset` | Zero-based offset to use when fetching records |
| `total` | Total number of matching records |
| `totalPages` | Number of available pages; `0` for an empty dataset |
| `hasNextPage` | Whether a page exists after the current page |
| `hasPreviousPage` | Whether a page exists before the current page |
| `firstItem` | One-based position of the first returned item; `0` when empty |
| `lastItem` | One-based position of the last possible item on the page; `0` when empty |

## Input behavior and defaults

| Input | Result |
| --- | --- |
| `page: undefined`, `0`, `-1`, `"abc"`, or a fraction | Page `1` |
| `page: "3"` | Page `3` |
| `limit: undefined`, `0`, `-1`, `"abc"`, or a fraction | Default limit `20` |
| `limit: "25"` | Limit `25` |
| `limit: 500` | Maximum default limit `100` |
| A page beyond `totalPages` | The last available page |
| No matching records | Page `1`, zero total pages, zero item positions, and no fetch call |

Only positive safe integers or strings containing positive integers are accepted as valid page and
limit inputs.

## Configure page sizes

The defaults are `20` items per page, with an allowed range of `1` through `100`. Override them for
an individual pagination call:

```ts
const result = await paginate({
  adapter: userAdapter,
  query: { active: true },
  countQuery: { active: true },
  page,
  limit,
  pageSizeOptions: {
    defaultLimit: 25,
    minLimit: 5,
    maxLimit: 200,
  },
})
```

`defaultLimit` must fall between `minLimit` and `maxLimit`. Invalid configuration throws a
`RangeError` so configuration mistakes are caught instead of silently accepted.

## Create a pagination adapter

Use separate query types when your data source needs different inputs for counting and fetching:

```ts
import { type PaginationAdapter, paginate } from "@evensurface/paginate"

type ItemQuery = { category: string; sort: "newest" | "oldest" }
type CountQuery = { category: string }
type Item = { id: string; title: string }

const adapter: PaginationAdapter<ItemQuery, CountQuery, Item> = {
  count: (query) => countItems(query.category),
  fetch: (query, pagination) => fetchItems({ ...query, ...pagination }),
}

const result = await paginate({
  adapter,
  query: { category: "books", sort: "newest" },
  countQuery: { category: "books" },
  page: "3",
  limit: "10",
})
```

The adapter contract is intentionally small:

```ts
interface PaginationAdapter<TQuery, TCountQuery, TItem> {
  count(query: TCountQuery): Promise<number>
  fetch(query: TQuery, options: { limit: number; offset: number }): Promise<TItem[]>
}
```

`paginate` executes `count` first. It resolves the requested page against the count, then calls
`fetch` once with the resolved offset. It does not call `fetch` when the count is zero.

## Tradeoffs and operational considerations

Offset pagination is deliberately simple, but that simplicity has costs. Consider these points
before using it on a high-volume or frequently changing dataset:

- **Every request needs a count.** `paginate` cannot calculate the last page or complete metadata
  without a total. Exact counts can be expensive on large or complex filtered datasets.
- **Large offsets can become slow.** Many databases still scan or discard the rows preceding the
  requested offset. Page `10,000` is usually more expensive than page `2`, even with the same
  limit.
- **Count and fetch are separate operations.** Rows can be inserted, removed, or updated between
  them. Metadata can therefore describe a slightly different snapshot from the returned items.
  Use a data-source transaction or snapshot when strict consistency is required.
- **Ordering is the adapter's responsibility.** The core package cannot add or validate ordering.
  Fetch with a deterministic order and a unique tie-breaker; otherwise items may move, repeat, or
  disappear between pages.
- **The count and fetch inputs must match.** The package cannot determine whether `query` and
  `countQuery` describe the same dataset. A mismatch produces internally valid but incorrect
  metadata.
- **Out-of-range pages are clamped.** Requesting page `999` returns the current last page rather
  than an empty result. This is convenient for user interfaces, but APIs that need strict page
  validation must compare the requested page with the returned resolved page.
- **Page-size limits only bound one fetch.** A maximum limit protects against oversized individual
  requests, but it does not provide rate limiting, query timeouts, authorization, or database
  resource controls.
- **Metadata follows the count.** `firstItem` and `lastItem` are calculated from the reported total
  and resolved offset, not by inspecting `items`. A custom adapter that returns fewer or more rows
  than requested can make those positions inaccurate.

Use offset pagination for admin tables, directories, reports, and search interfaces where numbered
pages and direct navigation matter. Prefer a cursor-based design outside this package for very
large, rapidly changing feeds where traversal stability and deep-page performance matter more than
jumping to an arbitrary page.

## Build numbered pagination navigation

`createPageWindow` returns page numbers and the string `"ellipsis"`, ready to map into links or
buttons:

```ts
import { createPageWindow } from "@evensurface/paginate"

const pages = createPageWindow({
  page: 5,
  totalPages: 20,
})

// [1, "ellipsis", 4, 5, 6, "ellipsis", 20]
```

Customize how many pages appear beside the current page and at both boundaries:

```ts
createPageWindow({
  page: 10,
  totalPages: 30,
  siblings: 2,
  boundaries: 2,
})

// [1, 2, "ellipsis", 8, 9, 10, 11, 12, "ellipsis", 29, 30]
```

An empty dataset returns an empty array. A requested page beyond the range is resolved before the
window is created.

## Use the utilities independently

You can parse request inputs and create metadata without the adapter-based `paginate` function:

```ts
import {
  calculateOffset,
  createPaginationMetadata,
  parseLimit,
  parsePage,
  resolvePage,
} from "@evensurface/paginate"

const requestedPage = parsePage(request.query.page)
const limit = parseLimit(request.query.limit, { maxLimit: 50 })

// If you already know the total:
const pagination = createPaginationMetadata({
  page: requestedPage,
  limit,
  total: 95,
})

// Or for lower-level pagination logic:
const page = resolvePage(requestedPage, 5)
const offset = calculateOffset(page, limit)
```

### Utility reference

| Export | Purpose |
| --- | --- |
| `parsePage(value)` | Converts unknown input to a positive page number, defaulting to `1` |
| `parseLimit(value, options?)` | Converts unknown input to a bounded page size |
| `calculateOffset(page, limit)` | Calculates `(page - 1) * limit` with safe-integer validation |
| `resolvePage(page, totalPages)` | Clamps a page to the available range |
| `createPaginationMetadata(options)` | Creates all metadata fields from page, limit, and total |
| `createPageWindow(options)` | Creates compact page-number navigation |

The package also exports `DEFAULT_PAGE_SIZE`, `MIN_PAGE_SIZE`, and `MAX_PAGE_SIZE`, plus all public
TypeScript types.

## ORM integrations

Using Drizzle ORM? Install [`@evensurface/paginate-drizzle`](../adapter/drizzle/README.md) for
automatic query execution and inferred select types.

Other ORMs and databases can integrate through `PaginationAdapter`; no ORM-specific dependency is
required by this package.

## Frequently asked questions

### Does it work with Express, Fastify, Hono, Next.js, or another framework?

Yes. The library has no routing or framework dependency. Pass the framework's query-parameter
values as `page` and `limit`, then return or render the result.

### Does it sanitize query-string pagination values?

It validates them for pagination use. Invalid page values become `1`; invalid limit values use the
configured default; valid limits are clamped to the configured range.

### What happens when a requested page is too high?

The page resolves to the last available page. The package counts first, calculates the resolved
offset, and performs one fetch for that page. Compare the requested value with
`result.pagination.page` if your API needs to report that clamping occurred.

### Does it support cursor pagination?

No. This package is specifically for offset pagination with numbered pages. Cursor pagination is
usually a better fit for large, frequently changing feeds where stable traversal matters more than
direct page navigation.

### Must the count and fetch queries have the same filters?

Yes. They may use different query types, but they must describe the same result set. Otherwise the
total and page metadata will not match the fetched items.

## License

MIT
