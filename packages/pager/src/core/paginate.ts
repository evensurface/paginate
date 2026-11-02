
import { createPaginationMetadata } from "./metadata";
import { calculateOffset, parseLimit, parsePage } from "./page";
import type {
  PaginatedResult,
  PaginationOptions,
} from "./types";

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
}: PaginationOptions<TQuery, TCountQuery, TItem>): Promise<
  PaginatedResult<TItem>
> {
  const page = parsePage(requestedPage);
  const limit = parseLimit(requestedLimit, pageSizeOptions);
  const offset = calculateOffset(page, limit);

  // Execute both queries concurrently.
  const [items, total] = await Promise.all([
    adapter.fetch(query, { limit, offset }),
    adapter.count(countQuery),
  ]);

  // Validate the total and resolve the requested page.
  const pagination = createPaginationMetadata({
    page,
    limit,
    total,
  });

  // Return immediately when the requested page is valid.
  if (pagination.page === page) {
    return { items, pagination };
  }

  // Empty datasets do not require another query.
  if (total === 0) {
    return { items: [], pagination };
  }

  // Re-fetch when the requested page exceeds the last page.
  const resolvedItems = await adapter.fetch(query, {
    limit,
    offset: pagination.offset,
  });

  return {
    items: resolvedItems,
    pagination,
  };
}
