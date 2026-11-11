# @evensurface/paginate-better-auth

Add page-number or offset pagination to a Better Auth database adapter.

## Installation

```sh
pnpm add @evensurface/paginate-better-auth better-auth
```

## Quick start

Use the adapter available inside a Better Auth plugin endpoint:

```ts
import { paginate } from "@evensurface/paginate-better-auth"

interface Follow {
  id: string
  followerId: string
  followingId: string
  createdAt: Date
}

const result = await paginate<Follow>({
  adapter: ctx.context.adapter,
  model: "follow",
  where: [{ field: "followerId", value: session.user.id }],
  sortBy: { field: "id", direction: "asc" },
  page: 1,
  limit: 2,
})
```

For three matching rows, `result` looks like this:

```ts
{
  items: [follow1, follow2],
  pagination: {
    total: 3,
    page: 1,
    limit: 2,
    offset: 0,
    totalPages: 2,
    hasNextPage: true,
    hasPreviousPage: false,
  },
}
```

### Start from an offset

Use `paginateOffset()` when your API accepts a zero-based `offset` instead of a page number:

```ts
import { paginateOffset } from "@evensurface/paginate-better-auth"

const result = await paginateOffset<Follow>({
  adapter: ctx.context.adapter,
  model: "follow",
  sortBy: { field: "id", direction: "asc" },
  offset: 1,
  limit: 2,
})
```

For three rows, the result starts at the second row:

```ts
{
  items: [follow2, follow3],
  pagination: {
    total: 3,
    limit: 2,
    offset: 1,
    hasNextPage: false,
    hasPreviousPage: true,
  },
}
```

## Select fields

Pass `select` when each item should contain only specific fields:

```ts
const result = await paginate<{ id: string; name: string }>({
  adapter: ctx.context.adapter,
  model: "project",
  select: ["id", "name"],
  sortBy: { field: "id", direction: "asc" },
})
```

```ts
result.items
// [{ id: "project-01", name: "Website redesign" }]
```

## Load related records

Pass `join` to include a schema-defined relationship:

```ts
interface ProjectWithTasks {
  id: string
  name: string
  task: Array<{
    id: string
    projectId: string
    title: string
  }>
}

const result = await paginate<ProjectWithTasks>({
  adapter: ctx.context.adapter,
  model: "project",
  select: ["id", "name"],
  join: { task: { limit: 3 } },
  sortBy: { field: "id", direction: "asc" },
})
```

```ts
result.items
// [
//   {
//     id: "project-01",
//     name: "Website redesign",
//     task: [
//       { id: "task-01", projectId: "project-01", title: "Create wireframes" },
//       { id: "task-02", projectId: "project-01", title: "Build landing page" },
//     ],
//   },
// ]
```

The `limit` inside `join` applies to related records. The pagination `limit` still applies to
projects, and `pagination.total` counts projects rather than tasks.

## Advanced considerations

### Result types

Better Auth uses string model and field names, so it cannot infer the result type from `model`,
`select`, or `join`. Pass the item type explicitly, as in `paginate<Follow>()`. Without it, items
are typed as `Record<string, unknown>[]`. Make sure the type describes the fields and relationships
you request.

### Selection and relationship compatibility

This package validates three rules before querying to avoid known cross-adapter failures in Better
Auth 1.7.18:

- A non-empty `select` used with `join` must include `id`.
- A non-empty `select` used with `sortBy` must include the sort field.
- A related-record `join` limit must be a positive safe integer.

Better Auth may add a field needed to resolve a relationship. Depending on the database adapter and
join execution path, other unselected schema properties can be omitted or retained with the value
`undefined`. Treat both shapes as equivalent. This package copies `select` and `join` before
querying so Better Auth cannot mutate caller-owned input.

A join needs exactly one schema-defined foreign-key path between the primary and related models.
Plugin models work when their schema declares that reference. Missing or ambiguous relationships
produce Better Auth errors.

Joins do not filter primary records. Totals use the primary `model` and the same `where` conditions,
regardless of joined rows or related-record limits. One-to-one relationships return an object or
`null`; one-to-many relationships return an array. Better Auth cannot filter or sort a joined
collection, so a limited collection is an adapter-defined subset. Use a separate query when the
choice or order of related records must be deterministic.

### Ordering

`sortBy` is optional. Without it, the database decides the order, which is not safe for stable
pagination. A non-unique field also leaves ties ambiguous because Better Auth accepts only one sort
field. Sort by a unique field such as `id` whenever records must not move between pages.

### Queries and adapter behavior

Count and fetch use the same primary `model` and `where`. Tenant, user, authorization, and
soft-delete filters remain the caller's responsibility. They are separate database operations, so
concurrent writes can make them observe different snapshots.

Better Auth may execute joins natively or fall back to additional queries. Fallback joins can run
one related query per primary row and relationship. Multiple one-to-many native joins can create
large intermediate result sets.

Database adapter failures propagate unchanged. Input normalization, page-size validation,
metadata, empty results, and out-of-range behavior come from `@evensurface/paginate`.

Cursor pagination, custom counts, routes, and authorization policies are outside this package's
scope.
