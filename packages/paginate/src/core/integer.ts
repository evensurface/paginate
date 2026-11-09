/** Checks whether a value is a positive, safe integer. */
export function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
}

/** Checks whether a value is a non-negative, safe integer. */
export function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
}

/** Converts a number or decimal digit string into a positive, safe integer. */
export function toPositiveSafeInteger(value: unknown): number | undefined {
  if (isPositiveSafeInteger(value)) {
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

  return isPositiveSafeInteger(parsed) ? parsed : undefined
}
