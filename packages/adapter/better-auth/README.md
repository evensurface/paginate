# @evensurface/paginate-better-auth

Page-number and native-offset pagination for Better Auth database adapters.

## Installation

```sh
pnpm add @evensurface/paginate-better-auth better-auth
```

## Usage

Use the database adapter available in a Better Auth plugin endpoint:

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
  page: ctx.query.page,
  limit: ctx.query.limit,
})
```

For a zero-based offset, import `paginateOffset` and pass `offset` instead of `page`.

Better Auth's public database adapter accepts a caller-supplied result type; it does not infer a
row type from `model`. Pass the item type explicitly, as in `paginate<Follow>()`. Without it, items
are safely typed as `Record<string, unknown>[]`.

## Selection and relationships

`select` and `join` use Better Auth's existing `findMany()` options:

```ts
interface SelectedProject {
  id: string
  name: string
  task: Array<{
    id: string
    projectId: string
    title: string
  }>
}

const result = await paginate<SelectedProject>({
  adapter: ctx.context.adapter,
  model: "project",
  select: ["id", "name"],
  join: { task: { limit: 3 } },
  sortBy: { field: "id", direction: "asc" },
})
```

The explicit item type must describe the selected and joined result. Better Auth's adapter API uses
string model and field names, so TypeScript cannot infer a projection or relationship shape, or
verify that the caller-provided type matches `select`.

To avoid known cross-adapter failures in Better Auth 1.7.18, this package validates three rules
before querying:

- A non-empty `select` used with `join` must include `id`.
- A non-empty `select` used with `sortBy` must include the sort field.
- An explicit related-record `join` limit must be a positive safe integer.

Better Auth may add a field needed to resolve a relationship, and its join output can contain other
unselected schema properties with the value `undefined`. Therefore, `select` plus `join` is not an
exact property-level projection even though `undefined` values disappear during JSON serialization.
This package copies the selection before querying so Better Auth cannot append relationship fields
to the caller's array. A join must have exactly one schema-defined foreign-key path between the
primary and related models. Plugin models are supported when their schema declares that reference.
Missing or ambiguous relationships produce Better Auth errors.

Joins do not filter primary records. The returned total always counts the primary `model` using the
same `where`, regardless of joined rows or related-record limits. One-to-one relationships return an
object or `null`; one-to-many relationships return an array. Better Auth cannot filter or sort a
joined collection, so a limited collection is an adapter-defined subset. Use a separate query when
the choice or order of related records must be deterministic.

## Ordering

`sortBy` is optional, matching Better Auth's `findMany()` contract. When omitted, the package does
not apply a default order. Database-defined ordering is not stable pagination: records can be
duplicated or missed across pages, especially during concurrent writes. Even a non-unique sort
field has ambiguous ties. Better Auth supports one sort field, so explicitly sort by a unique field
such as `id` whenever stable pagination matters.

Count and fetch use exactly the same primary `model` and `where`. Tenant, user, authorization, and
soft-delete filters remain the caller's responsibility.

Database adapter failures propagate unchanged. Input normalization, validation, metadata, empty
results, and out-of-range behavior come from `@evensurface/paginate`. Count and fetch are separate
operations, so concurrent database writes can make them observe different snapshots.

Better Auth may execute joins natively or fall back to additional queries. Fallback joins preserve
primary pagination but can perform one related query per primary row and relationship. Multiple
one-to-many native joins can also create large intermediate result sets.

Positive safe-integer relationship limits avoid the known inconsistent handling of zero, negative,
fractional, and non-finite values. Extremely large limits can still exceed an adapter or database
limit and surface its original error.

Cursor pagination, custom counts, routes, and authorization policies are outside this package's
scope.
