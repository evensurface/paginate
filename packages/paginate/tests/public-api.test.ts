import { describe, expect, expectTypeOf, it } from "vitest"
import type {
  OffsetPaginatedResult,
  OffsetPaginationMetadata,
  OffsetPaginationMetadataOptions,
  OffsetPaginationOptions,
  PaginatedResult,
  PaginationAdapter,
  PaginationError,
  PaginationErrorCode,
  PaginationMetadata,
  PaginationOptions,
  PaginationPageItem,
} from "../src/index"
import * as pagination from "../src/index"

describe("public API", () => {
  it("exposes the expected runtime surface only", () => {
    expect(Object.keys(pagination).sort()).toEqual([
      "DEFAULT_PAGE_SIZE",
      "MAX_PAGE_SIZE",
      "MIN_PAGE_SIZE",
      "calculateOffset",
      "createOffsetPaginationMetadata",
      "createPageWindow",
      "createPaginationMetadata",
      "isPaginationError",
      "paginate",
      "paginateOffset",
      "parseLimit",
      "parseOffset",
      "parsePage",
      "resolvePage",
    ])
  })

  it("preserves the public type contracts", () => {
    expectTypeOf<PaginationMetadata["page"]>().toEqualTypeOf<number>()
    expectTypeOf<PaginationPageItem>().toEqualTypeOf<number | "ellipsis">()
    expectTypeOf<PaginatedResult<string>["items"]>().toEqualTypeOf<string[]>()
    expectTypeOf<PaginationOptions<string, number, boolean>["adapter"]>().toEqualTypeOf<
      PaginationAdapter<string, number, boolean>
    >()
    expectTypeOf<PaginationError["code"]>().toEqualTypeOf<PaginationErrorCode>()
    expectTypeOf<OffsetPaginationMetadata["offset"]>().toEqualTypeOf<number>()
    expectTypeOf<OffsetPaginationMetadataOptions["total"]>().toEqualTypeOf<number>()
    expectTypeOf<OffsetPaginatedResult<string>["items"]>().toEqualTypeOf<string[]>()
    expectTypeOf<OffsetPaginationOptions<string, number, boolean>["adapter"]>().toEqualTypeOf<
      PaginationAdapter<string, number, boolean>
    >()
  })
})
