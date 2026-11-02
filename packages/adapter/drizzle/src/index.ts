import {
  type PageSizeOptions,
  type PaginatedResult,
  type PaginationAdapter,
  paginate as paginateCore,
} from "@evensurface/paginate"

/** A Drizzle select query before pagination has been applied. */
export interface DrizzleSelectQuery<TItem> {
  limit(limit: number): DrizzleLimitedQuery<TItem>
}

/** A Drizzle select query with a limit applied. */
export interface DrizzleLimitedQuery<TItem> {
  offset(offset: number): PromiseLike<TItem[]>
}

/** The conventional result row for a Drizzle `select({ total: count() })` query. */
export interface DrizzleCountRow {
  total: number
}

/** Results supported from Drizzle's `$count()` and select count queries. */
export type DrizzleCountResult = number | readonly DrizzleCountRow[]

/** An executable Drizzle count query. */
export type DrizzleCountQuery = PromiseLike<DrizzleCountResult>

export interface DrizzlePaginationOptions<TItem> {
  /** A deterministic select query. Include an `orderBy` with a unique tie-breaker. */
  query: DrizzleSelectQuery<TItem>
  /** A `$count()` or `select({ total: count() })` query matching `query` filters. */
  countQuery: DrizzleCountQuery
  page?: unknown
  limit?: unknown
  pageSizeOptions?: PageSizeOptions
}

/**
 * Creates an adapter for Drizzle select and count query builders.
 *
 * Most callers should prefer {@link paginate}. The factory is useful
 * when composing directly with the core `paginate` function.
 */
export function createDrizzleAdapter<TItem>(): PaginationAdapter<
  DrizzleSelectQuery<TItem>,
  DrizzleCountQuery,
  TItem
> {
  return {
    async count(query) {
      const result = await query

      if (typeof result === "number") {
        return result
      }

      const row = result[0]

      if (result.length !== 1 || !row) {
        throw new RangeError("Drizzle count query must return exactly one row.")
      }

      return row.total
    },
    async fetch(query, { limit, offset }) {
      return query.limit(limit).offset(offset)
    },
  }
}

/**
 * Paginates a Drizzle select query using a matching Drizzle count query.
 *
 * The item type is inferred from the select query.
 */
export function paginate<TItem>({
  query,
  countQuery,
  page,
  limit,
  pageSizeOptions,
}: DrizzlePaginationOptions<TItem>): Promise<PaginatedResult<TItem>> {
  return paginateCore({
    adapter: createDrizzleAdapter<TItem>(),
    query,
    countQuery,
    page,
    limit,
    pageSizeOptions,
  })
}
