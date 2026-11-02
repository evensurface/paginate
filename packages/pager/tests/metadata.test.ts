import { describe, expect, it } from "vitest"
import { createPageWindow, createPaginationMetadata } from "../src/core/metadata"

describe("createPaginationMetadata", () => {
  it("describes a partially filled last page", () => {
    expect(createPaginationMetadata({ page: 5, limit: 20, total: 95 })).toEqual({
      page: 5,
      limit: 20,
      offset: 80,
      total: 95,
      totalPages: 5,
      hasNextPage: false,
      hasPreviousPage: true,
      firstItem: 81,
      lastItem: 95,
    })
  })

  it("uses canonical metadata for an empty dataset", () => {
    expect(createPaginationMetadata({ page: 10, limit: 20, total: 0 })).toEqual({
      page: 1,
      limit: 20,
      offset: 0,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
      firstItem: 0,
      lastItem: 0,
    })
  })

  it("clamps before calculating an otherwise unsafe requested offset", () => {
    expect(
      createPaginationMetadata({
        page: Number.MAX_SAFE_INTEGER,
        limit: 100,
        total: 25,
      }),
    ).toMatchObject({ page: 1, offset: 0, firstItem: 1, lastItem: 25 })
  })

  it("rejects invalid totals, pages, and limits", () => {
    expect(() => createPaginationMetadata({ page: 1, limit: 20, total: -1 })).toThrow(RangeError)
    expect(() => createPaginationMetadata({ page: 0, limit: 20, total: 10 })).toThrow(RangeError)
    expect(() => createPaginationMetadata({ page: 1, limit: 0, total: 10 })).toThrow(RangeError)
  })
})

describe("createPageWindow", () => {
  it("creates compact windows and fills single-page gaps", () => {
    expect(createPageWindow({ page: 5, totalPages: 20 })).toEqual([
      1,
      "ellipsis",
      4,
      5,
      6,
      "ellipsis",
      20,
    ])
    expect(createPageWindow({ page: 3, totalPages: 5 })).toEqual([1, 2, 3, 4, 5])
  })

  it("handles empty datasets and out-of-range pages", () => {
    expect(createPageWindow({ page: 4, totalPages: 0 })).toEqual([])
    expect(createPageWindow({ page: 99, totalPages: 5 })).toEqual([1, "ellipsis", 4, 5])
  })

  it("rejects invalid window options", () => {
    expect(() => createPageWindow({ page: 1, totalPages: -1 })).toThrow(RangeError)
    expect(() => createPageWindow({ page: 1, totalPages: 10, siblings: -1 })).toThrow(RangeError)
    expect(() => createPageWindow({ page: 1, totalPages: 10, boundaries: 0 })).toThrow(RangeError)
  })
})
