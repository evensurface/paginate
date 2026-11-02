import { createPaginationMetadata } from "./metadata"
import { parseLimit, parsePage } from "./page"
import type { PaginatedResult, PaginationOptions } from "./types"

/**
 * Executes offset-based pagination using a provided adapter.
 *
 * The core handles pagination logic while the adapter handles
 * database-specific query execution.
 *
 * @example
 * const result = await paginate({
 *   adapter,
 *   query,
 *   countQuery,
 *   page: 2,
 *   limit: 20,
 * });
 */
export async function paginate<TQuery, TCountQuery, TItem>({
  adapter,
  query,
  countQuery,
  page: requestedPage,
  limit: requestedLimit,
  pageSizeOptions,
}: PaginationOptions<TQuery, TCountQuery, TItem>): Promise<PaginatedResult<TItem>> {
  const page = parsePage(requestedPage)
  const limit = parseLimit(requestedLimit, pageSizeOptions)
  const total = await adapter.count(countQuery)
  const pagination = createPaginationMetadata({
    page,
    limit,
    total,
  })

  // There is nothing to fetch for an empty dataset.
  if (total === 0) {
    return { items: [], pagination }
  }

  const items = await adapter.fetch(query, {
    limit,
    offset: pagination.offset,
  })

  return { items, pagination }
}
