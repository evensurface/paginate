import { executeCountedOffsetPagination } from "./execute"
import { createOffsetPaginationMetadata } from "./metadata"
import { parseOffset } from "./offset"
import { parseLimit } from "./page"
import type { OffsetPaginatedResult, OffsetPaginationOptions } from "./types"

/**
 * Executes native offset pagination using a provided adapter.
 *
 * The requested offset is preserved rather than converted to or clamped
 * against a page number.
 */
export async function paginateOffset<TQuery, TCountQuery, TItem>({
  adapter,
  query,
  countQuery,
  offset: requestedOffset,
  limit: requestedLimit,
  pageSizeOptions,
}: OffsetPaginationOptions<TQuery, TCountQuery, TItem>): Promise<OffsetPaginatedResult<TItem>> {
  const offset = parseOffset(requestedOffset)
  const limit = parseLimit(requestedLimit, pageSizeOptions)

  return executeCountedOffsetPagination({
    adapter,
    query,
    countQuery,
    limit,
    createMetadata: (total) => createOffsetPaginationMetadata({ offset, limit, total }),
  })
}
