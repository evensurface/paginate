import { decodeCursor, encodeCursor } from "./cursor"
import { annotatePaginationError, getPaginationErrorMessage } from "./errors"
import { parseLimit } from "./page"
import type { CursorPaginatedResult, CursorPaginationOptions } from "./types"

/** Executes forward-only keyset pagination using a provided cursor adapter. */
export async function paginateCursor<TQuery, TItem>({
  adapter,
  query,
  cursor,
  limit: requestedLimit,
  pageSizeOptions,
}: CursorPaginationOptions<TQuery, TItem>): Promise<CursorPaginatedResult<TItem>> {
  const limit = parseLimit(requestedLimit, pageSizeOptions)

  if (limit === Number.MAX_SAFE_INTEGER) {
    throw annotatePaginationError(
      new RangeError(getPaginationErrorMessage("CURSOR_LIMIT_OVERFLOW")),
      "CURSOR_LIMIT_OVERFLOW",
    )
  }

  const position = cursor === undefined ? undefined : decodeCursor(cursor)
  const fetchedItems = await adapter.fetch(query, { position, limit: limit + 1 })
  const hasNextPage = fetchedItems.length > limit
  const items = hasNextPage ? fetchedItems.slice(0, limit) : fetchedItems
  const lastItem = hasNextPage ? items[items.length - 1] : undefined
  const nextCursor = lastItem === undefined ? null : encodeCursor(adapter.getPosition(lastItem))

  return {
    items,
    pagination: {
      limit,
      nextCursor,
      hasNextPage,
    },
  }
}
