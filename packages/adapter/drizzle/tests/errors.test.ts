import { runInNewContext } from "node:vm"
import { describe, expect, expectTypeOf, it } from "vitest"
import { annotateDrizzlePaginationError, getDrizzlePaginationErrorMessage } from "../src/errors"
import {
  createDrizzleAdapter,
  type DrizzlePaginationError,
  type DrizzlePaginationErrorCode,
  isDrizzlePaginationError,
} from "../src/index"

const drizzleMarker = Symbol.for("@evensurface/paginate/error/drizzle")

async function catchError(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run()
  } catch (error) {
    return error
  }

  throw new Error("Expected the operation to reject.")
}

function defineSpoof(
  error: Error,
  code: string,
  marker: symbol = drizzleMarker,
  descriptor: PropertyDescriptor = { value: code },
): Error {
  Object.defineProperties(error, {
    code: descriptor,
    [marker]: { value: true },
  })
  return error
}

describe("Drizzle pagination errors", () => {
  it.each([
    [
      "DRIZZLE_INVALID_COUNT_ROWS" as const,
      () => createDrizzleAdapter().count(Promise.resolve([])),
      RangeError,
      "Drizzle count query must return exactly one row.",
    ],
    [
      "DRIZZLE_INVALID_COUNT" as const,
      () => createDrizzleAdapter().count(Promise.resolve(-1)),
      RangeError,
      "Drizzle count query must return a non-negative safe integer.",
    ],
    [
      "DRIZZLE_QUERY_REUSED" as const,
      async () => {
        const adapter = createDrizzleAdapter<never>()
        const query = { limit: () => ({ offset: async () => [] }) }
        await adapter.fetch(() => query, { limit: 1, offset: 0 })
        return adapter.fetch(() => query, { limit: 1, offset: 0 })
      },
      TypeError,
      "Drizzle query factory must return a fresh select query.",
    ],
  ])("classifies %s", async (code, run, ErrorConstructor, message) => {
    const error = await catchError(run)

    expect(isDrizzlePaginationError(error)).toBe(true)
    expect(error).toBeInstanceOf(ErrorConstructor)
    expect((error as Error).constructor).toBe(ErrorConstructor)
    expect(error).toMatchObject({ name: ErrorConstructor.name, message, code })
    expect(Object.keys(error as object)).toEqual([])
    expect({ ...(error as object) }).toEqual({})
    expect(JSON.stringify(error)).toBe("{}")

    expect(Object.getOwnPropertyDescriptor(error as object, "code")).toEqual({
      value: code,
      enumerable: false,
      writable: false,
      configurable: false,
    })
    expect(Object.getOwnPropertyDescriptor(error as object, drizzleMarker)).toEqual({
      value: true,
      enumerable: false,
      writable: false,
      configurable: false,
    })
    expect(Reflect.set(error as object, "code", "CHANGED")).toBe(false)
    expect((error as DrizzlePaginationError).code).toBe(code)
  })

  it("retains the adapter throw site in the stack", async () => {
    const error = await catchError(() => createDrizzleAdapter().count(Promise.resolve(-1)))

    expect(error).toBeInstanceOf(RangeError)
    expect((error as Error).stack?.split("\n")[1]).toContain("index.ts")
  })

  it("rejects an annotation whose constructor does not match its code", () => {
    expect(() =>
      annotateDrizzlePaginationError(
        new RangeError(getDrizzlePaginationErrorMessage("DRIZZLE_QUERY_REUSED")),
        "DRIZZLE_QUERY_REUSED",
      ),
    ).toThrow("Drizzle pagination error annotation does not match its definition.")
  })

  it("classifies an invalid selected count value", async () => {
    const error = await catchError(() =>
      createDrizzleAdapter().count(Promise.resolve([{ total: 1.5 }])),
    )

    expect(isDrizzlePaginationError(error)).toBe(true)
    expect((error as DrizzlePaginationError).code).toBe("DRIZZLE_INVALID_COUNT")
  })

  it.each([undefined, null, false, 1, "error", {}, new RangeError("ordinary")])(
    "rejects the unrelated value %s",
    (value) => {
      expect(isDrizzlePaginationError(value)).toBe(false)
    },
  )

  it("rejects malformed and spoofed values", () => {
    const coreMarker = Symbol.for("@evensurface/paginate/error/core")
    const throwingProxy = new Proxy(new RangeError("proxy"), {
      getOwnPropertyDescriptor() {
        throw new Error("descriptor failed")
      },
    })

    expect(
      isDrizzlePaginationError({
        code: "DRIZZLE_INVALID_COUNT",
        name: "RangeError",
        message: "fake",
      }),
    ).toBe(false)
    expect(isDrizzlePaginationError(defineSpoof(new RangeError("fake"), "UNKNOWN"))).toBe(false)
    expect(
      isDrizzlePaginationError(defineSpoof(new TypeError("fake"), "DRIZZLE_INVALID_COUNT")),
    ).toBe(false)
    expect(
      isDrizzlePaginationError(defineSpoof(new RangeError("fake"), "DRIZZLE_QUERY_REUSED")),
    ).toBe(false)
    expect(
      isDrizzlePaginationError(
        defineSpoof(new RangeError("fake"), "DRIZZLE_INVALID_COUNT", coreMarker),
      ),
    ).toBe(false)
    expect(
      isDrizzlePaginationError(
        defineSpoof(new RangeError("fake"), "DRIZZLE_INVALID_COUNT", drizzleMarker, {
          value: "DRIZZLE_INVALID_COUNT",
          writable: true,
        }),
      ),
    ).toBe(false)
    expect(
      isDrizzlePaginationError(
        Object.defineProperties(new RangeError("fake"), {
          code: { get: () => "DRIZZLE_INVALID_COUNT" },
          [drizzleMarker]: { value: true },
        }),
      ),
    ).toBe(false)
    expect(isDrizzlePaginationError(throwingProxy)).toBe(false)
  })

  it("keeps the core and Drizzle markers disjoint", async () => {
    const coreError = defineSpoof(
      new RangeError("Page must be a positive safe integer."),
      "INVALID_PAGE",
      Symbol.for("@evensurface/paginate/error/core"),
    )
    const drizzleError = await catchError(() => createDrizzleAdapter().count(Promise.resolve(-1)))

    expect(isDrizzlePaginationError(coreError)).toBe(false)
    expect(isDrizzlePaginationError(drizzleError)).toBe(true)
  })

  it("rejects a correctly shaped error from another realm", () => {
    const error = runInNewContext(`
      Object.defineProperties(
        new RangeError("Drizzle count query must return a non-negative safe integer."),
        {
          code: { value: "DRIZZLE_INVALID_COUNT" },
          [Symbol.for("@evensurface/paginate/error/drizzle")]: { value: true }
        }
      )
    `)

    expect(isDrizzlePaginationError(error)).toBe(false)
  })

  it("narrows to the public error type and exact code union", async () => {
    const error: unknown = await catchError(() => createDrizzleAdapter().count(Promise.resolve(-1)))

    if (!isDrizzlePaginationError(error)) {
      throw new Error("Expected a Drizzle pagination error.")
    }

    expectTypeOf(error).toEqualTypeOf<DrizzlePaginationError>()
    expectTypeOf(error.code).toEqualTypeOf<DrizzlePaginationErrorCode>()
    expect(handleCode(error.code)).toBe(error.code)
  })
})

function handleCode(code: DrizzlePaginationErrorCode): DrizzlePaginationErrorCode {
  switch (code) {
    case "DRIZZLE_INVALID_COUNT_ROWS":
    case "DRIZZLE_INVALID_COUNT":
    case "DRIZZLE_QUERY_REUSED":
      return code
    default:
      return assertNever(code)
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`)
}
