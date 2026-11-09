import { describe, expect, it } from "vitest"
import {
  createOffsetPaginationMetadata,
  createPageWindow,
  createPaginationMetadata,
} from "../src/core/metadata"

describe("createOffsetPaginationMetadata", () => {
  it.each([
    [0, 20, 45, true, false],
    [7, 20, 45, true, true],
    [25, 20, 45, false, true],
    [45, 20, 45, false, true],
    [46, 20, 45, false, true],
    [0, 20, 0, false, false],
    [7, 20, 0, false, true],
  ])(
    "describes offset %d with limit %d and total %d",
    (offset, limit, total, hasNextPage, hasPreviousPage) => {
      expect(createOffsetPaginationMetadata({ offset, limit, total })).toEqual({
        total,
        limit,
        offset,
        hasNextPage,
        hasPreviousPage,
      })
    },
  )

  it("calculates the next flag without overflowing safe integers", () => {
    expect(
      createOffsetPaginationMetadata({
        offset: Number.MAX_SAFE_INTEGER - 1,
        limit: 100,
        total: Number.MAX_SAFE_INTEGER,
      }),
    ).toMatchObject({ hasNextPage: false, hasPreviousPage: true })
  })

  it("uses total, limit, then offset validation precedence", () => {
    const invalidEverything = () =>
      createOffsetPaginationMetadata({ offset: -1, limit: 0, total: -1 })
    expect(invalidEverything).toThrow("Total must be a non-negative safe integer.")

    const invalidLimitAndOffset = () =>
      createOffsetPaginationMetadata({ offset: -1, limit: 0, total: 10 })
    expect(invalidLimitAndOffset).toThrow("Limit must be a positive safe integer.")

    const invalidOffset = () => createOffsetPaginationMetadata({ offset: -1, limit: 20, total: 10 })
    expect(invalidOffset).toThrow("Offset must be a non-negative safe integer.")
  })
})

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

  it("preserves metadata validation messages and precedence", () => {
    const invalidEverything = () => createPaginationMetadata({ page: 0, limit: 0, total: -1 })
    expect(invalidEverything).toThrow(RangeError)
    expect(invalidEverything).toThrow("Total must be a non-negative safe integer.")

    const invalidLimitAndPage = () => createPaginationMetadata({ page: 0, limit: 0, total: 10 })
    expect(invalidLimitAndPage).toThrow(RangeError)
    expect(invalidLimitAndPage).toThrow("Limit must be a positive safe integer.")

    const invalidPage = () => createPaginationMetadata({ page: 0, limit: 20, total: 10 })
    expect(invalidPage).toThrow(RangeError)
    expect(invalidPage).toThrow("Page must be a positive safe integer.")
  })

  it("describes first and middle pages without using the item count", () => {
    expect(createPaginationMetadata({ page: 1, limit: 20, total: 45 })).toEqual({
      page: 1,
      limit: 20,
      offset: 0,
      total: 45,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: false,
      firstItem: 1,
      lastItem: 20,
    })
    expect(createPaginationMetadata({ page: 2, limit: 20, total: 45 })).toEqual({
      page: 2,
      limit: 20,
      offset: 20,
      total: 45,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
      firstItem: 21,
      lastItem: 40,
    })
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

  it("supports zero siblings, overlapping boundaries, and single-page gaps", () => {
    expect(createPageWindow({ page: 5, totalPages: 10, siblings: 0 })).toEqual([
      1,
      "ellipsis",
      5,
      "ellipsis",
      10,
    ])
    expect(createPageWindow({ page: 3, totalPages: 5, boundaries: 3 })).toEqual([1, 2, 3, 4, 5])
    expect(createPageWindow({ page: 4, totalPages: 7, siblings: 1, boundaries: 1 })).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ])
  })

  it("validates options and page in the existing order", () => {
    const invalidOptions = () =>
      createPageWindow({ page: 0, totalPages: -1, siblings: -1, boundaries: 0 })
    expect(invalidOptions).toThrow(RangeError)
    expect(invalidOptions).toThrow("Total pages must be a non-negative safe integer.")

    const invalidSiblings = () =>
      createPageWindow({ page: 0, totalPages: 10, siblings: -1, boundaries: 0 })
    expect(invalidSiblings).toThrow(RangeError)
    expect(invalidSiblings).toThrow("Siblings must be a non-negative safe integer.")

    const invalidBoundaries = () =>
      createPageWindow({ page: 0, totalPages: 10, siblings: 1, boundaries: 0 })
    expect(invalidBoundaries).toThrow(RangeError)
    expect(invalidBoundaries).toThrow("Boundaries must be a positive safe integer.")

    const invalidEmptyPage = () => createPageWindow({ page: 0, totalPages: 0 })
    expect(invalidEmptyPage).toThrow(RangeError)
    expect(invalidEmptyPage).toThrow("Page must be a positive safe integer.")
  })
})
