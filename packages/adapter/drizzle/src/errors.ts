const drizzlePaginationErrorMarker = Symbol.for("@evensurface/paginate/error/drizzle")

const drizzlePaginationErrorDefinitions = {
  DRIZZLE_INVALID_COUNT_ROWS: {
    message: "Drizzle count query must return exactly one row.",
    ErrorConstructor: RangeError,
  },
  DRIZZLE_INVALID_COUNT: {
    message: "Drizzle count query must return a non-negative safe integer.",
    ErrorConstructor: RangeError,
  },
  DRIZZLE_QUERY_REUSED: {
    message: "Drizzle query factory must return a fresh select query.",
    ErrorConstructor: TypeError,
  },
  DRIZZLE_INVALID_CURSOR_ORDER: {
    message: "Drizzle cursor order must contain unique, non-null comparable columns.",
    ErrorConstructor: TypeError,
  },
  DRIZZLE_CURSOR_ORDER_MISMATCH: {
    message: "Cursor order does not match the configured Drizzle order.",
    ErrorConstructor: TypeError,
  },
} as const

export type DrizzlePaginationErrorCode = keyof typeof drizzlePaginationErrorDefinitions

type DrizzleRangeErrorCode = Extract<
  DrizzlePaginationErrorCode,
  "DRIZZLE_INVALID_COUNT_ROWS" | "DRIZZLE_INVALID_COUNT"
>

type DrizzleTypeErrorCode = Exclude<DrizzlePaginationErrorCode, DrizzleRangeErrorCode>

export type DrizzlePaginationError =
  | (RangeError & { readonly code: DrizzleRangeErrorCode })
  | (TypeError & { readonly code: DrizzleTypeErrorCode })

export function getDrizzlePaginationErrorMessage(code: DrizzlePaginationErrorCode): string {
  return drizzlePaginationErrorDefinitions[code].message
}

export function annotateDrizzlePaginationError(
  error: RangeError | TypeError,
  code: DrizzlePaginationErrorCode,
): DrizzlePaginationError {
  const definition = drizzlePaginationErrorDefinitions[code]

  if (!(error instanceof definition.ErrorConstructor) || error.message !== definition.message) {
    throw new TypeError("Drizzle pagination error annotation does not match its definition.")
  }

  Object.defineProperties(error, {
    code: { value: code },
    [drizzlePaginationErrorMarker]: { value: true },
  })

  return error as DrizzlePaginationError
}

/** Checks whether a caught value is an error authored by the Drizzle adapter package. */
export function isDrizzlePaginationError(error: unknown): error is DrizzlePaginationError {
  if (typeof error !== "object" || error === null) {
    return false
  }

  try {
    const codeDescriptor = Object.getOwnPropertyDescriptor(error, "code")
    const markerDescriptor = Object.getOwnPropertyDescriptor(error, drizzlePaginationErrorMarker)

    if (
      !isLockedDataProperty(markerDescriptor) ||
      markerDescriptor.value !== true ||
      !isLockedDataProperty(codeDescriptor)
    ) {
      return false
    }

    const code = codeDescriptor.value

    if (typeof code !== "string" || !hasOwn(drizzlePaginationErrorDefinitions, code)) {
      return false
    }

    return error instanceof drizzlePaginationErrorDefinitions[code].ErrorConstructor
  } catch {
    return false
  }
}

function isLockedDataProperty(
  descriptor: PropertyDescriptor | undefined,
): descriptor is PropertyDescriptor & { value: unknown } {
  return (
    descriptor !== undefined &&
    "value" in descriptor &&
    descriptor.enumerable === false &&
    descriptor.writable === false &&
    descriptor.configurable === false
  )
}

function hasOwn<T extends object>(value: T, key: PropertyKey): key is keyof T {
  return Object.hasOwn(value, key)
}
