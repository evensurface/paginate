const paginationErrorMarker = Symbol.for("@evensurface/paginate/error/core")

const paginationErrorDefinitions = {
  INVALID_PAGE_SIZE_BOUNDS: {
    message: "Invalid page size boundaries.",
    ErrorConstructor: RangeError,
  },
  INVALID_DEFAULT_LIMIT: {
    message: "Default page size must be within the allowed range.",
    ErrorConstructor: RangeError,
  },
  INVALID_PAGE: {
    message: "Page must be a positive safe integer.",
    ErrorConstructor: RangeError,
  },
  INVALID_LIMIT: {
    message: "Limit must be a positive safe integer.",
    ErrorConstructor: RangeError,
  },
  INVALID_OFFSET: {
    message: "Offset must be a non-negative safe integer.",
    ErrorConstructor: RangeError,
  },
  OFFSET_OVERFLOW: {
    message: "Calculated offset exceeds the maximum safe integer.",
    ErrorConstructor: RangeError,
  },
  INVALID_TOTAL: {
    message: "Total must be a non-negative safe integer.",
    ErrorConstructor: RangeError,
  },
  INVALID_TOTAL_PAGES: {
    message: "Total pages must be a non-negative safe integer.",
    ErrorConstructor: RangeError,
  },
  INVALID_SIBLINGS: {
    message: "Siblings must be a non-negative safe integer.",
    ErrorConstructor: RangeError,
  },
  INVALID_BOUNDARIES: {
    message: "Boundaries must be a positive safe integer.",
    ErrorConstructor: RangeError,
  },
} as const

export type PaginationErrorCode = keyof typeof paginationErrorDefinitions

export type PaginationError = RangeError & {
  readonly code: PaginationErrorCode
}

export function getPaginationErrorMessage(code: PaginationErrorCode): string {
  return paginationErrorDefinitions[code].message
}

export function annotatePaginationError(
  error: RangeError,
  code: PaginationErrorCode,
): PaginationError {
  const definition = paginationErrorDefinitions[code]

  if (!(error instanceof definition.ErrorConstructor) || error.message !== definition.message) {
    throw new TypeError("Pagination error annotation does not match its definition.")
  }

  Object.defineProperties(error, {
    code: { value: code },
    [paginationErrorMarker]: { value: true },
  })

  return error as PaginationError
}

/** Checks whether a caught value is an error authored by the core pagination package. */
export function isPaginationError(error: unknown): error is PaginationError {
  if (typeof error !== "object" || error === null) {
    return false
  }

  try {
    const codeDescriptor = Object.getOwnPropertyDescriptor(error, "code")
    const markerDescriptor = Object.getOwnPropertyDescriptor(error, paginationErrorMarker)

    if (
      !isLockedDataProperty(markerDescriptor) ||
      markerDescriptor.value !== true ||
      !isLockedDataProperty(codeDescriptor)
    ) {
      return false
    }

    const code = codeDescriptor.value

    if (typeof code !== "string" || !hasOwn(paginationErrorDefinitions, code)) {
      return false
    }

    return error instanceof paginationErrorDefinitions[code].ErrorConstructor
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
