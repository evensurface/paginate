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
  const integer = toSafeInteger(value)

  return integer !== undefined && integer > 0 ? integer : undefined
}

/** Converts a number or decimal digit string into a non-negative, safe integer. */
export function toNonNegativeSafeInteger(value: unknown): number | undefined {
  const integer = toSafeInteger(value)

  return integer !== undefined && integer >= 0 ? integer : undefined
}

function toSafeInteger(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) ? value : undefined
  }

  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim()

  if (!/^\d+$/.test(normalized)) {
    return undefined
  }

  const parsed = Number(normalized)

  return Number.isSafeInteger(parsed) ? parsed : undefined
}
