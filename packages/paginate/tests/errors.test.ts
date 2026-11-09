import { runInNewContext } from "node:vm"
import { describe, expect, expectTypeOf, it } from "vitest"
import { annotatePaginationError } from "../src/core/errors"
import {
  calculateOffset,
  createOffsetPaginationMetadata,
  createPageWindow,
  createPaginationMetadata,
  isPaginationError,
  type PaginationError,
  type PaginationErrorCode,
  parseLimit,
  resolvePage,
} from "../src/index"

const coreMarker = Symbol.for("@evensurface/paginate/error/core")

const errorCases: readonly [PaginationErrorCode, () => unknown, string][] = [
  [
    "INVALID_PAGE_SIZE_BOUNDS",
    () => parseLimit(undefined, { minLimit: 2, maxLimit: 1 }),
    "Invalid page size boundaries.",
  ],
  [
    "INVALID_DEFAULT_LIMIT",
    () => parseLimit(undefined, { minLimit: 2, defaultLimit: 1 }),
    "Default page size must be within the allowed range.",
  ],
  ["INVALID_PAGE", () => calculateOffset(0, 1), "Page must be a positive safe integer."],
  ["INVALID_LIMIT", () => calculateOffset(1, 0), "Limit must be a positive safe integer."],
  [
    "INVALID_OFFSET",
    () => createOffsetPaginationMetadata({ offset: -1, limit: 1, total: 1 }),
    "Offset must be a non-negative safe integer.",
  ],
  [
    "OFFSET_OVERFLOW",
    () => calculateOffset(Number.MAX_SAFE_INTEGER, 2),
    "Calculated offset exceeds the maximum safe integer.",
  ],
  [
    "INVALID_TOTAL",
    () => createPaginationMetadata({ page: 1, limit: 1, total: -1 }),
    "Total must be a non-negative safe integer.",
  ],
  [
    "INVALID_TOTAL_PAGES",
    () => resolvePage(1, -1),
    "Total pages must be a non-negative safe integer.",
  ],
  [
    "INVALID_SIBLINGS",
    () => createPageWindow({ page: 1, totalPages: 1, siblings: -1 }),
    "Siblings must be a non-negative safe integer.",
  ],
  [
    "INVALID_BOUNDARIES",
    () => createPageWindow({ page: 1, totalPages: 1, boundaries: 0 }),
    "Boundaries must be a positive safe integer.",
  ],
]

function catchError(run: () => unknown): unknown {
  try {
    run()
  } catch (error) {
    return error
  }

  throw new Error("Expected the operation to throw.")
}

function defineSpoof(
  error: Error,
  code: string,
  marker: symbol = coreMarker,
  descriptor: PropertyDescriptor = { value: code },
): Error {
  Object.defineProperties(error, {
    code: descriptor,
    [marker]: { value: true },
  })
  return error
}

describe("core pagination errors", () => {
  it.each(errorCases)("classifies %s", (code, run, message) => {
    const error = catchError(run)

    expect(isPaginationError(error)).toBe(true)
    expect(error).toBeInstanceOf(RangeError)
    expect((error as Error).constructor).toBe(RangeError)
    expect(error).toMatchObject({ name: "RangeError", message, code })
    expect(Object.keys(error as object)).toEqual([])
    expect({ ...(error as object) }).toEqual({})
    expect(JSON.stringify(error)).toBe("{}")

    const codeDescriptor = Object.getOwnPropertyDescriptor(error as object, "code")
    const markerDescriptor = Object.getOwnPropertyDescriptor(error as object, coreMarker)
    expect(codeDescriptor).toEqual({
      value: code,
      enumerable: false,
      writable: false,
      configurable: false,
    })
    expect(markerDescriptor).toEqual({
      value: true,
      enumerable: false,
      writable: false,
      configurable: false,
    })
    expect(Reflect.set(error as object, "code", "CHANGED")).toBe(false)
    expect((error as PaginationError).code).toBe(code)
  })

  it("retains the domain throw site in the stack", () => {
    const error = catchError(() => calculateOffset(0, 1))

    expect(error).toBeInstanceOf(RangeError)
    expect((error as Error).stack?.split("\n")[1]).toContain("page.ts")
  })

  it("rejects an annotation that does not match its definition", () => {
    expect(() => annotatePaginationError(new RangeError("wrong message"), "INVALID_PAGE")).toThrow(
      "Pagination error annotation does not match its definition.",
    )
  })

  it.each([undefined, null, false, 1, "error", {}, new RangeError("ordinary")])(
    "rejects the unrelated value %s",
    (value) => {
      expect(isPaginationError(value)).toBe(false)
    },
  )

  it("rejects malformed and spoofed values", () => {
    const drizzleMarker = Symbol.for("@evensurface/paginate/error/drizzle")
    const throwingProxy = new Proxy(new RangeError("proxy"), {
      getOwnPropertyDescriptor() {
        throw new Error("descriptor failed")
      },
    })

    expect(isPaginationError({ code: "INVALID_PAGE", name: "RangeError", message: "fake" })).toBe(
      false,
    )
    expect(isPaginationError(defineSpoof(new RangeError("fake"), "UNKNOWN"))).toBe(false)
    expect(isPaginationError(defineSpoof(new TypeError("fake"), "INVALID_PAGE"))).toBe(false)
    expect(
      isPaginationError(defineSpoof(new RangeError("fake"), "INVALID_PAGE", drizzleMarker)),
    ).toBe(false)
    expect(
      isPaginationError(
        defineSpoof(new RangeError("fake"), "INVALID_PAGE", coreMarker, {
          value: "INVALID_PAGE",
          configurable: true,
        }),
      ),
    ).toBe(false)
    expect(
      isPaginationError(
        Object.defineProperties(new RangeError("fake"), {
          code: { get: () => "INVALID_PAGE" },
          [coreMarker]: { value: true },
        }),
      ),
    ).toBe(false)
    expect(
      isPaginationError({
        code: "INVALID_PAGE",
        name: "RangeError",
        message: "fake",
        [Symbol.toStringTag]: "Error",
      }),
    ).toBe(false)
    expect(isPaginationError(throwingProxy)).toBe(false)
  })

  it("rejects a correctly shaped error from another realm", () => {
    const error = runInNewContext(`
      Object.defineProperties(new RangeError("Page must be a positive safe integer."), {
        code: { value: "INVALID_PAGE" },
        [Symbol.for("@evensurface/paginate/error/core")]: { value: true }
      })
    `)

    expect(isPaginationError(error)).toBe(false)
  })

  it("narrows to the public error type and exact code union", () => {
    const error: unknown = catchError(() => calculateOffset(0, 1))

    if (!isPaginationError(error)) {
      throw new Error("Expected a pagination error.")
    }

    expectTypeOf(error).toEqualTypeOf<PaginationError>()
    expectTypeOf(error.code).toEqualTypeOf<PaginationErrorCode>()
    expect(handleCode(error.code)).toBe(error.code)
  })
})

function handleCode(code: PaginationErrorCode): PaginationErrorCode {
  switch (code) {
    case "INVALID_PAGE_SIZE_BOUNDS":
    case "INVALID_DEFAULT_LIMIT":
    case "INVALID_PAGE":
    case "INVALID_LIMIT":
    case "INVALID_OFFSET":
    case "OFFSET_OVERFLOW":
    case "INVALID_TOTAL":
    case "INVALID_TOTAL_PAGES":
    case "INVALID_SIBLINGS":
    case "INVALID_BOUNDARIES":
    case "INVALID_CURSOR":
    case "UNSUPPORTED_CURSOR_VERSION":
    case "INVALID_CURSOR_POSITION":
    case "CURSOR_LIMIT_OVERFLOW":
      return code
    default:
      return assertNever(code)
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`)
}
