import { isPaginationError } from "@evensurface/paginate"
import type { AuthContext } from "better-auth"
import { describe, expect, expectTypeOf, it, vi } from "vitest"
import {
  type BetterAuthDatabaseAdapter,
  type BetterAuthSortBy,
  type BetterAuthWhere,
  paginate,
  paginateOffset,
} from "../src/index"

interface Follow {
  id: string
  followerId: string
}

function createAdapter(items: Follow[]) {
  const count = vi.fn(async () => items.length)
  const findMany = vi.fn(async ({ limit = 100, offset = 0 }: { limit?: number; offset?: number }) =>
    items.slice(offset, offset + limit),
  )

  // Better Auth deliberately lets each caller choose findMany<T>(). This assertion is confined
  // to the test double; production code calls the real generic adapter without a cast.
  const adapter = { count, findMany } as unknown as BetterAuthDatabaseAdapter

  return { adapter, count, findMany }
}

const sortBy = { field: "id", direction: "asc" } as const
const where = [{ field: "followerId", value: "user-1" }] satisfies BetterAuthWhere[]

describe("Better Auth pagination", () => {
  it("exposes only the wrapper runtime API", async () => {
    const api = await import("../src/index")
    expect(Object.keys(api).sort()).toEqual(["paginate", "paginateOffset"])
  })

  it("counts before fetching and forwards one query descriptor", async () => {
    const { adapter, count, findMany } = createAdapter(
      Array.from({ length: 25 }, (_, index) => ({
        id: String(index + 1).padStart(2, "0"),
        followerId: "user-1",
      })),
    )
    const calls: string[] = []
    count.mockImplementation(async () => {
      calls.push("count")
      return 25
    })
    findMany.mockImplementation(async ({ offset }) => {
      calls.push("findMany")
      return Array.from({ length: 5 }, (_, index) => ({
        id: String((offset ?? 0) + index + 1),
        followerId: "user-1",
      }))
    })

    const result = await paginate<Follow>({
      adapter,
      model: "follow",
      where,
      sortBy,
      page: "3",
      limit: "10",
    })

    expect(calls).toEqual(["count", "findMany"])
    expect(count).toHaveBeenCalledWith({ model: "follow", where })
    expect(findMany).toHaveBeenCalledWith({
      model: "follow",
      where,
      sortBy,
      limit: 10,
      offset: 20,
    })
    expect(result.pagination).toMatchObject({ page: 3, total: 25, offset: 20 })
    expectTypeOf(result.items).toEqualTypeOf<Follow[]>()
  })

  it("supports arbitrary offsets and custom page-size options", async () => {
    const items = Array.from({ length: 50 }, (_, index) => ({
      id: String(index + 1).padStart(2, "0"),
      followerId: "user-1",
    }))
    const { adapter } = createAdapter(items)
    const result = await paginateOffset<Follow>({
      adapter,
      model: "follow",
      where,
      sortBy,
      offset: "7",
      limit: 100,
      pageSizeOptions: { defaultLimit: 15, minLimit: 5, maxLimit: 30 },
    })

    expect(result.items).toEqual(items.slice(7, 37))
    expect(result.pagination).toEqual({
      total: 50,
      limit: 30,
      offset: 7,
      hasNextPage: true,
      hasPreviousPage: true,
    })
  })

  it("uses core fallbacks for missing and invalid request inputs", async () => {
    const items = Array.from({ length: 25 }, (_, index) => ({
      id: String(index + 1),
      followerId: "user-1",
    }))
    const { adapter } = createAdapter(items)

    const page = await paginate<Follow>({
      adapter,
      model: "follow",
      sortBy,
      page: "invalid",
      limit: -1,
    })
    expect(page.pagination).toMatchObject({ page: 1, limit: 20, offset: 0 })

    const offset = await paginateOffset<Follow>({
      adapter,
      model: "follow",
      sortBy,
      offset: -1,
    })
    expect(offset.pagination).toMatchObject({ offset: 0, limit: 20 })
  })

  it("skips fetching empty and out-of-range results", async () => {
    const { adapter: emptyAdapter, findMany: emptyFindMany } = createAdapter([])
    const empty = await paginate({
      adapter: emptyAdapter,
      model: "follow",
      sortBy,
      page: 4,
    })
    expect(empty.items).toEqual([])
    expect(empty.pagination).toMatchObject({ page: 1, total: 0, totalPages: 0 })
    expect(emptyFindMany).not.toHaveBeenCalled()

    const { adapter: offsetAdapter, findMany: offsetFindMany } = createAdapter([
      { id: "1", followerId: "user-1" },
    ])
    const beyond = await paginateOffset({
      adapter: offsetAdapter,
      model: "follow",
      sortBy,
      offset: 1,
    })
    expect(beyond.items).toEqual([])
    expect(offsetFindMany).not.toHaveBeenCalled()
  })

  it("clamps an out-of-range page before fetching", async () => {
    const items = Array.from({ length: 5 }, (_, index) => ({
      id: String(index + 1),
      followerId: "user-1",
    }))
    const { adapter } = createAdapter(items)
    const result = await paginate<Follow>({
      adapter,
      model: "follow",
      sortBy,
      page: 99,
      limit: 2,
    })

    expect(result.items).toEqual(items.slice(4))
    expect(result.pagination).toMatchObject({ page: 3, offset: 4 })
  })

  it("propagates Better Auth errors by identity", async () => {
    const countError = new Error("count failed")
    const { adapter: countAdapter, count } = createAdapter([])
    count.mockRejectedValue(countError)

    await expect(paginate({ adapter: countAdapter, model: "follow", sortBy })).rejects.toBe(
      countError,
    )

    const fetchError = new Error("fetch failed")
    const { adapter: fetchAdapter, findMany } = createAdapter([{ id: "1", followerId: "user-1" }])
    findMany.mockRejectedValue(fetchError)

    await expect(paginate({ adapter: fetchAdapter, model: "follow", sortBy })).rejects.toBe(
      fetchError,
    )
  })

  it("retains core validation and error classification", async () => {
    const { adapter: invalidCount, count: countInvalid } = createAdapter([])
    countInvalid.mockResolvedValue(-1)
    const result = paginate({ adapter: invalidCount, model: "follow", sortBy })
    await expect(result).rejects.toMatchObject({ code: "INVALID_TOTAL" })
    await expect(result.catch((error: unknown) => isPaginationError(error))).resolves.toBe(true)

    const { adapter: invalidOptions, count: countInvalidOptions } = createAdapter([])
    await expect(
      paginate({
        adapter: invalidOptions,
        model: "follow",
        sortBy,
        pageSizeOptions: { minLimit: 20, maxLimit: 10 },
      }),
    ).rejects.toMatchObject({ code: "INVALID_PAGE_SIZE_BOUNDS" })
    expect(countInvalidOptions).not.toHaveBeenCalled()
  })

  it("isolates concurrent pagination calls", async () => {
    const items = Array.from({ length: 4 }, (_, index) => ({
      id: String(index + 1),
      followerId: "user-1",
    }))
    const { adapter } = createAdapter(items)
    const [first, second] = await Promise.all([
      paginate<Follow>({ adapter, model: "follow", sortBy, page: 1, limit: 2 }),
      paginate<Follow>({ adapter, model: "follow", sortBy, page: 2, limit: 2 }),
    ])

    expect(first.items).toEqual(items.slice(0, 2))
    expect(second.items).toEqual(items.slice(2, 4))
  })

  it("derives public query types from Better Auth", () => {
    expectTypeOf<BetterAuthDatabaseAdapter>().toMatchTypeOf<
      Pick<AuthContext["adapter"], "count" | "findMany">
    >()
    expectTypeOf<BetterAuthSortBy>().toEqualTypeOf<
      NonNullable<Parameters<AuthContext["adapter"]["findMany"]>[0]["sortBy"]>
    >()
    expectTypeOf<BetterAuthWhere>().toMatchTypeOf<{ field: string }>()

    const defaultResult = paginate({ adapter: createAdapter([]).adapter, model: "follow", sortBy })
    expectTypeOf<Awaited<typeof defaultResult>["items"]>().toEqualTypeOf<
      Record<string, unknown>[]
    >()

    // @ts-expect-error Better Auth only supports ascending or descending directions.
    const invalidSort: BetterAuthSortBy = { field: "id", direction: "sideways" }
    expect(invalidSort).toBeDefined()
  })
})
