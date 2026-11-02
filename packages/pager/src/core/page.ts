/**
 * Default pagination configuration.
 */
export const DEFAULT_PAGE_SIZE = 20
export const MIN_PAGE_SIZE = 1
export const MAX_PAGE_SIZE = 100

/**
 * Configuration for parsing and restricting page sizes.
 */
export interface PageSizeOptions {
  defaultLimit?: number
  minLimit?: number
  maxLimit?: number
}

/**
 * Checks whether a value is a positive, safe integer.
 */
function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
}

/**
 * Converts a number or numeric string into a positive integer.
 *
 * Returns undefined for invalid values.
 */
function toPositiveInteger(value: unknown): number | undefined {
  if (isPositiveInteger(value)) {
    return value
  }

  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim()

  if (!/^\d+$/.test(normalized)) {
    return undefined
  }

  const parsed = Number(normalized)

  return isPositiveInteger(parsed) ? parsed : undefined
}

/**
 * Parses a page number from an unknown value.
 *
 * Invalid, missing, zero, negative, fractional, or unsafe
 * values fall back to page 1.
 *
 * @example
 * parsePage("3")     // 3
 * parsePage(5)       // 5
 * parsePage("-2")    // 1
 * parsePage("abc")   // 1
 * parsePage(null)    // 1
 */
export function parsePage(value: unknown): number {
  return toPositiveInteger(value) ?? 1
}

/**
 * Parses a page size and applies configured boundaries.
 *
 * Invalid values fall back to defaultLimit.
 * Valid values outside the allowed range are clamped.
 *
 * @example
 * parseLimit("25")                       // 25
 * parseLimit(500)                        // 100
 * parseLimit(0)                          // 20
 * parseLimit("abc")                      // 20
 * parseLimit(5, { minLimit: 10 })        // 10
 * parseLimit(50, { maxLimit: 30 })       // 30
 */
export function parseLimit(value: unknown, options: PageSizeOptions = {}): number {
  const {
    defaultLimit = DEFAULT_PAGE_SIZE,
    minLimit = MIN_PAGE_SIZE,
    maxLimit = MAX_PAGE_SIZE,
  } = options

  if (!isPositiveInteger(minLimit) || !isPositiveInteger(maxLimit) || minLimit > maxLimit) {
    throw new RangeError("Invalid page size boundaries.")
  }

  if (!isPositiveInteger(defaultLimit) || defaultLimit < minLimit || defaultLimit > maxLimit) {
    throw new RangeError("Default page size must be within the allowed range.")
  }

  const limit = toPositiveInteger(value) ?? defaultLimit

  return Math.min(Math.max(limit, minLimit), maxLimit)
}

/**
 * Calculates the offset for a page and page size.
 *
 * Both arguments must be positive, safe integers.
 * Throws when the resulting offset exceeds JavaScript's
 * maximum safe integer.
 *
 * @example
 * calculateOffset(1, 20) // 0
 * calculateOffset(2, 20) // 20
 * calculateOffset(5, 10) // 40
 */
export function calculateOffset(page: number, limit: number): number {
  if (!isPositiveInteger(page)) {
    throw new RangeError("Page must be a positive safe integer.")
  }

  if (!isPositiveInteger(limit)) {
    throw new RangeError("Limit must be a positive safe integer.")
  }

  const offset = (page - 1) * limit

  if (!Number.isSafeInteger(offset)) {
    throw new RangeError("Calculated offset exceeds the maximum safe integer.")
  }

  return offset
}

/**
 * Resolves a requested page against the available pages.
 *
 * An empty dataset always resolves to page 1.
 * Pages beyond the available range resolve to the last page.
 *
 * @example
 * resolvePage(3, 10)   // 3
 * resolvePage(15, 10)  // 10
 * resolvePage(1, 0)    // 1
 * resolvePage(5, 0)    // 1
 */
export function resolvePage(page: number, totalPages: number): number {
  if (!isPositiveInteger(page)) {
    throw new RangeError("Page must be a positive safe integer.")
  }

  if (!Number.isSafeInteger(totalPages) || totalPages < 0) {
    throw new RangeError("Total pages must be a non-negative safe integer.")
  }

  return totalPages === 0 ? 1 : Math.min(page, totalPages)
}
