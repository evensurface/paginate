import { executeCountedOffsetPagination } from "./execute"
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
  return executeCountedOffsetPagination({
    adapter,
    query,
    countQuery,
    limit,
    createMetadata: (total) => createPaginationMetadata({ page, limit, total }),
  })
}
