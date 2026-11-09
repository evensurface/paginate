import { describe, expect, it } from "vitest"
import { createPageWindow, createPaginationMetadata } from "../src/core/metadata"
import { calculateOffset, parseLimit, resolvePage } from "../src/core/page"

function expectRangeError(run: () => unknown, message: string): void {
  try {
    run()
    throw new Error("Expected the operation to throw.")
  } catch (error) {
    expect(error).toBeInstanceOf(RangeError)
    expect((error as Error).constructor).toBe(RangeError)
    expect(error).toHaveProperty("name", "RangeError")
    expect(error).toHaveProperty("message", message)
  }
}

describe("core error characterization", () => {
  it("preserves page-size configuration errors and precedence", () => {
    expectRangeError(
      () => parseLimit(undefined, { minLimit: 20, maxLimit: 10, defaultLimit: 5 }),
      "Invalid page size boundaries.",
    )
    expectRangeError(
      () => parseLimit(undefined, { minLimit: 10, defaultLimit: 5 }),
      "Default page size must be within the allowed range.",
    )
  })

  it("preserves offset validation errors and precedence", () => {
    expectRangeError(() => calculateOffset(0, 0), "Page must be a positive safe integer.")
    expectRangeError(() => calculateOffset(1, 0), "Limit must be a positive safe integer.")
    expectRangeError(
      () => calculateOffset(Number.MAX_SAFE_INTEGER, 2),
      "Calculated offset exceeds the maximum safe integer.",
    )
  })

  it("preserves page-resolution errors and precedence", () => {
    expectRangeError(() => resolvePage(0, -1), "Page must be a positive safe integer.")
    expectRangeError(() => resolvePage(1, -1), "Total pages must be a non-negative safe integer.")
  })

  it("preserves metadata errors and precedence", () => {
    expectRangeError(
      () => createPaginationMetadata({ page: 0, limit: 0, total: -1 }),
      "Total must be a non-negative safe integer.",
    )
    expectRangeError(
      () => createPaginationMetadata({ page: 0, limit: 0, total: 10 }),
      "Limit must be a positive safe integer.",
    )
    expectRangeError(
      () => createPaginationMetadata({ page: 0, limit: 20, total: 10 }),
      "Page must be a positive safe integer.",
    )
  })

  it("preserves page-window errors and precedence", () => {
    expectRangeError(
      () => createPageWindow({ page: 0, totalPages: -1, siblings: -1, boundaries: 0 }),
      "Total pages must be a non-negative safe integer.",
    )
    expectRangeError(
      () => createPageWindow({ page: 0, totalPages: 10, siblings: -1, boundaries: 0 }),
      "Siblings must be a non-negative safe integer.",
    )
    expectRangeError(
      () => createPageWindow({ page: 0, totalPages: 10, siblings: 1, boundaries: 0 }),
      "Boundaries must be a positive safe integer.",
    )
    expectRangeError(
      () => createPageWindow({ page: 0, totalPages: 0 }),
      "Page must be a positive safe integer.",
    )
  })
})
