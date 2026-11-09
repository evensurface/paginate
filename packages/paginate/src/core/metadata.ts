import { isNonNegativeSafeInteger } from "./integer"
import { calculateOffset, resolvePage } from "./page"
import type { PaginationMetadata, PaginationPageItem } from "./types"

export interface PaginationMetadataOptions {
  page: number
  limit: number
  total: number
}

export interface PageWindowOptions {
  page: number
  totalPages: number
  siblings?: number
  boundaries?: number
}

/**
 * Creates metadata for offset-based pagination.
 *
 * The requested page is clamped to the available range.
 * An empty dataset resolves to page 1 with zero total pages.
 *
 * @example
 * createPaginationMetadata({
 *   page: 2,
 *   limit: 20,
 *   total: 95,
 * });
 */
export function createPaginationMetadata({
  page,
  limit,
  total,
}: PaginationMetadataOptions): PaginationMetadata {
  if (!isNonNegativeSafeInteger(total)) {
    throw new RangeError("Total must be a non-negative safe integer.")
  }

  // Validate the limit independently so an out-of-range page can be
  // resolved before its offset is calculated.
  calculateOffset(1, limit)
  const totalPages = Math.ceil(total / limit)
  const resolvedPage = resolvePage(page, totalPages)
  const offset = calculateOffset(resolvedPage, limit)

  const firstItem = total === 0 ? 0 : offset + 1
  const lastItem = total === 0 ? 0 : offset + Math.min(limit, total - offset)

  return {
    page: resolvedPage,
    limit,
    offset,
    total,
    totalPages,
    hasNextPage: resolvedPage < totalPages,
    hasPreviousPage: resolvedPage > 1,
    firstItem,
    lastItem,
  }
}

/**
 * Generates a compact page-number window for navigation.
 *
 * `siblings` controls how many pages appear on each side
 * of the current page.
 *
 * `boundaries` controls how many pages remain visible
 * at the beginning and end.
 *
 * Gaps of one page are filled rather than replaced
 * with an ellipsis.
 *
 * @example
 * createPageWindow({
 *   page: 5,
 *   totalPages: 20,
 * });
 *
 * // [1, "ellipsis", 4, 5, 6, "ellipsis", 20]
 */
export function createPageWindow({
  page,
  totalPages,
  siblings = 1,
  boundaries = 1,
}: PageWindowOptions): PaginationPageItem[] {
  if (!isNonNegativeSafeInteger(totalPages)) {
    throw new RangeError("Total pages must be a non-negative safe integer.")
  }

  if (!Number.isSafeInteger(siblings) || siblings < 0) {
    throw new RangeError("Siblings must be a non-negative safe integer.")
  }

  if (!Number.isSafeInteger(boundaries) || boundaries < 1) {
    throw new RangeError("Boundaries must be a positive safe integer.")
  }

  const currentPage = resolvePage(page, totalPages)

  if (totalPages === 0) {
    return []
  }

  type PageRange = {
    start: number
    end: number
  }

  const ranges: PageRange[] = [
    {
      start: 1,
      end: Math.min(boundaries, totalPages),
    },
    {
      start: Math.max(1, currentPage - siblings),
      end: currentPage + Math.min(siblings, totalPages - currentPage),
    },
    {
      start: Math.max(1, totalPages - boundaries + 1),
      end: totalPages,
    },
  ]

  // Merge overlapping or adjacent ranges.
  const merged: PageRange[] = []

  for (const range of ranges.sort((a, b) => a.start - b.start)) {
    const previous = merged[merged.length - 1]

    if (!previous || range.start > previous.end + 1) {
      merged.push({ ...range })
    } else {
      previous.end = Math.max(previous.end, range.end)
    }
  }

  const pages: PaginationPageItem[] = []
  let previousEnd = 0

  for (const range of merged) {
    if (previousEnd > 0) {
      const gap = range.start - previousEnd - 1

      if (gap === 1) {
        pages.push(previousEnd + 1)
      } else if (gap > 1) {
        pages.push("ellipsis")
      }
    }

    for (let value = range.start; value <= range.end; value++) {
      pages.push(value)
    }

    previousEnd = range.end
  }

  return pages
}
