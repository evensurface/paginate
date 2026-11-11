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

`sortBy` is required because pagination needs stable ordering. Better Auth supports one sort field,
so use a unique logical field such as `id`. Count and fetch use exactly the same `model` and `where`.
Tenant, user, authorization, and soft-delete filters remain the caller's responsibility.

Database adapter failures propagate unchanged. Input normalization, validation, metadata, empty
results, and out-of-range behavior come from `@evensurface/paginate`. Count and fetch are separate
operations, so concurrent database writes can make them observe different snapshots.

Cursor pagination, projections, joins, custom counts, routes, and authorization policies are outside
this package's scope.
