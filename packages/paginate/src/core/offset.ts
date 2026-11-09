import { toNonNegativeSafeInteger } from "./integer"

/**
 * Parses a zero-based offset from an unknown value.
 *
 * Invalid, missing, negative, fractional, or unsafe values
 * fall back to offset 0.
 *
 * @example
 * parseOffset("15")    // 15
 * parseOffset(0)       // 0
 * parseOffset("-1")   // 0
 * parseOffset("abc")  // 0
 */
export function parseOffset(value: unknown): number {
  return toNonNegativeSafeInteger(value) ?? 0
}
