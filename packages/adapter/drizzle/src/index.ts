import {
  type OffsetPaginatedResult,
  type PageSizeOptions,
  type PaginatedResult,
  type PaginationAdapter,
  paginate as paginateCore,
  paginateOffset as paginateOffsetCore,
} from "@evensurface/paginate"
import { annotateDrizzlePaginationError, getDrizzlePaginationErrorMessage } from "./errors"

export type { DrizzlePaginationError, DrizzlePaginationErrorCode } from "./errors"
export { isDrizzlePaginationError } from "./errors"

/** A Drizzle select query before pagination has been applied. */
export interface DrizzleSelectQuery<TItem> {
  limit(limit: number): DrizzleLimitedQuery<TItem>
}

/** A Drizzle select query with a limit applied. */
export interface DrizzleLimitedQuery<TItem> {
  offset(offset: number): PromiseLike<TItem[]>
}

/** Creates a fresh Drizzle select query for one pagination execution. */
export type DrizzleSelectQueryFactory<TItem> = () => DrizzleSelectQuery<TItem>

/** The conventional result row for a Drizzle `select({ total: count() })` query. */
export interface DrizzleCountRow {
  total: number
}

/** Results supported from Drizzle's `$count()` and select count queries. */
export type DrizzleCountResult = number | readonly DrizzleCountRow[]

/** An executable Drizzle count query. */
export type DrizzleCountQuery = PromiseLike<DrizzleCountResult>

export interface DrizzlePaginationOptions<TItem> {
  /** Creates a deterministic select query. Include an `orderBy` with a unique tie-breaker. */
  query: DrizzleSelectQueryFactory<TItem>
  /** A `$count()` or `select({ total: count() })` query matching `query` filters. */
  countQuery: DrizzleCountQuery
  page?: unknown
  limit?: unknown
  pageSizeOptions?: PageSizeOptions
}

export interface DrizzleOffsetPaginationOptions<TItem> {
  /** Creates a deterministic select query. Include an `orderBy` with a unique tie-breaker. */
  query: DrizzleSelectQueryFactory<TItem>
  /** A `$count()` or `select({ total: count() })` query matching `query` filters. */
  countQuery: DrizzleCountQuery
  offset?: unknown
  limit?: unknown
  pageSizeOptions?: PageSizeOptions
}

const paginatedQueries = new WeakSet<object>()

/**
 * Creates an adapter for Drizzle select and count query builders.
 *
 * Most callers should prefer {@link paginate}. The factory is useful
 * when composing directly with the core `paginate` function.
 */
export function createDrizzleAdapter<TItem>(): PaginationAdapter<
  DrizzleSelectQueryFactory<TItem>,
  DrizzleCountQuery,
  TItem
> {
  return {
    async count(query) {
      const result = await query

      const total = typeof result === "number" ? result : getCountTotal(result)

      if (!Number.isSafeInteger(total) || total < 0) {
        throw annotateDrizzlePaginationError(
          new RangeError(getDrizzlePaginationErrorMessage("DRIZZLE_INVALID_COUNT")),
          "DRIZZLE_INVALID_COUNT",
        )
      }

      return total
    },
    async fetch(createQuery, { limit, offset }) {
      const query = createQuery()

      if (paginatedQueries.has(query)) {
        throw annotateDrizzlePaginationError(
          new TypeError(getDrizzlePaginationErrorMessage("DRIZZLE_QUERY_REUSED")),
          "DRIZZLE_QUERY_REUSED",
        )
      }

      paginatedQueries.add(query)

      return query.limit(limit).offset(offset)
    },
  }
}

function getCountTotal(result: readonly DrizzleCountRow[]): number {
  const row = result[0]

  if (result.length !== 1 || !row) {
    throw annotateDrizzlePaginationError(
      new RangeError(getDrizzlePaginationErrorMessage("DRIZZLE_INVALID_COUNT_ROWS")),
      "DRIZZLE_INVALID_COUNT_ROWS",
    )
  }

  return row.total
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

/**
 * Paginates a Drizzle select query using a zero-based offset and matching count query.
 *
 * The item type is inferred from the select query.
 */
export function paginateOffset<TItem>({
  query,
  countQuery,
  offset,
  limit,
  pageSizeOptions,
}: DrizzleOffsetPaginationOptions<TItem>): Promise<OffsetPaginatedResult<TItem>> {
  return paginateOffsetCore({
    adapter: createDrizzleAdapter<TItem>(),
    query,
    countQuery,
    offset,
    limit,
    pageSizeOptions,
  })
}
