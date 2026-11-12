import { describe, expect, expectTypeOf, it } from "vitest"
import type {
  CursorPaginatedResult,
  CursorPaginationAdapter,
  CursorPaginationInput,
  CursorPaginationMetadata,
  CursorPaginationOptions,
  CursorPosition,
  OffsetPaginatedResult,
  OffsetPaginationInput,
  OffsetPaginationMetadata,
  OffsetPaginationMetadataOptions,
  OffsetPaginationOptions,
  PagePaginationInput,
  PaginatedResult,
  PaginationAdapter,
  PaginationError,
  PaginationErrorCode,
  PaginationInput,
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
      "paginateCursor",
      "paginateOffset",
      "parseLimit",
      "parseOffset",
      "parsePage",
      "resolvePage",
    ])
  })

  it("preserves the public type contracts", () => {
    expectTypeOf<PaginationMetadata["page"]>().toEqualTypeOf<number>()
    expectTypeOf<PaginationInput>().toEqualTypeOf<string | number>()
    expectTypeOf<PagePaginationInput>().toEqualTypeOf<{
      page?: string | number | undefined
      limit?: string | number | undefined
    }>()
    expectTypeOf<OffsetPaginationInput>().toEqualTypeOf<{
      offset?: string | number | undefined
      limit?: string | number | undefined
    }>()
    expectTypeOf<CursorPaginationInput>().toEqualTypeOf<{
      cursor?: string | undefined
      limit?: string | number | undefined
    }>()
    expectTypeOf<PaginationOptions<string, number, boolean>["page"]>().toEqualTypeOf<
      string | number | undefined
    >()
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
    expectTypeOf<CursorPosition[number]["direction"]>().toEqualTypeOf<"asc" | "desc">()
    expectTypeOf<CursorPaginationMetadata["nextCursor"]>().toEqualTypeOf<string | null>()
    expectTypeOf<CursorPaginatedResult<string>["items"]>().toEqualTypeOf<string[]>()
    expectTypeOf<CursorPaginationOptions<string, boolean>["adapter"]>().toEqualTypeOf<
      CursorPaginationAdapter<string, boolean>
    >()
  })

  it("accepts explicit undefined in public pagination options", () => {
    const adapter: PaginationAdapter<string, number, boolean> = {
      fetch: async () => [],
      count: async () => 0,
    }
    const pageInput: PagePaginationInput = { page: undefined, limit: undefined }
    const offsetInput: OffsetPaginationInput = { offset: undefined, limit: undefined }
    const cursorInput: CursorPaginationInput = { cursor: undefined, limit: undefined }

    const pageOptions: PaginationOptions<string, number, boolean> = {
      adapter,
      query: "query",
      countQuery: 0,
      ...pageInput,
      pageSizeOptions: { defaultLimit: undefined, minLimit: undefined, maxLimit: undefined },
    }
    const offsetOptions: OffsetPaginationOptions<string, number, boolean> = {
      adapter,
      query: "query",
      countQuery: 0,
      ...offsetInput,
      pageSizeOptions: undefined,
    }
    const cursorOptions: CursorPaginationOptions<string, boolean> = {
      adapter: {
        fetch: async () => [],
        getPosition: () => [{ key: "id", direction: "asc", value: 1 }],
      },
      query: "query",
      ...cursorInput,
      pageSizeOptions: undefined,
    }

    expectTypeOf(pageOptions).toEqualTypeOf<PaginationOptions<string, number, boolean>>()
    expectTypeOf(offsetOptions).toEqualTypeOf<OffsetPaginationOptions<string, number, boolean>>()
    expectTypeOf(cursorOptions).toEqualTypeOf<CursorPaginationOptions<string, boolean>>()
  })
})
