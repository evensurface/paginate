import { describe, expect, expectTypeOf, it, vi } from "vitest"
import { paginate } from "../src/core/paginate"
import { paginateOffset } from "../src/core/paginate-offset"
import type { PaginationAdapter } from "../src/core/types"

interface Query {
  category: string
}

function createAdapter(total: number) {
  const values = Array.from({ length: total }, (_, index) => index + 1)
  const calls: string[] = []
  const adapter: PaginationAdapter<Query, string, number> = {
    count: vi.fn(async () => {
      calls.push("count")
      return total
    }),
    fetch: vi.fn(async (_query, { limit, offset }) => {
      calls.push("fetch")
      return values.slice(offset, offset + limit)
    }),
  }

  return { adapter, calls, values }
}

describe("paginateOffset", () => {
  it("fetches an arbitrary offset with inferred item types", async () => {
    const { adapter, calls } = createAdapter(45)
    const result = await paginateOffset({
      adapter,
      query: { category: "books" },
      countQuery: "books",
      offset: "7",
      limit: "20",
    })

    expectTypeOf(result.items).toEqualTypeOf<number[]>()
    expect(result.items).toEqual(Array.from({ length: 20 }, (_, index) => index + 8))
    expect(result.pagination).toEqual({
      total: 45,
      limit: 20,
      offset: 7,
      hasNextPage: true,
      hasPreviousPage: true,
    })
    expect(calls).toEqual(["count", "fetch"])
    expect(adapter.fetch).toHaveBeenCalledWith({ category: "books" }, { limit: 20, offset: 7 })
  })

  it("uses offset and limit defaults and custom page-size options", async () => {
    const { adapter } = createAdapter(50)
    const defaults = await paginateOffset({
      adapter,
      query: { category: "books" },
      countQuery: "books",
    })
    expect(defaults.pagination).toMatchObject({ offset: 0, limit: 20 })

    const custom = await paginateOffset({
      adapter,
      query: { category: "books" },
      countQuery: "books",
      offset: -1,
      limit: 500,
      pageSizeOptions: { defaultLimit: 25, minLimit: 5, maxLimit: 30 },
    })
    expect(custom.pagination).toMatchObject({ offset: 0, limit: 30 })
  })

  it.each([
    [0, 0, false],
    [7, 0, true],
    [4, 4, true],
    [5, 4, true],
  ])("skips fetch for offset %d with total %d", async (offset, total, hasPreviousPage) => {
    const { adapter } = createAdapter(total)
    const result = await paginateOffset({
      adapter,
      query: { category: "books" },
      countQuery: "books",
      offset,
      limit: 2,
    })

    expect(result.items).toEqual([])
    expect(result.pagination).toMatchObject({ offset, total, hasNextPage: false, hasPreviousPage })
    expect(adapter.count).toHaveBeenCalledOnce()
    expect(adapter.fetch).not.toHaveBeenCalled()
  })

  it("returns a partially filled final batch", async () => {
    const { adapter } = createAdapter(25)
    const result = await paginateOffset({
      adapter,
      query: { category: "books" },
      countQuery: "books",
      offset: 22,
      limit: 10,
    })

    expect(result.items).toEqual([23, 24, 25])
    expect(result.pagination).toMatchObject({ hasNextPage: false, hasPreviousPage: true })
  })

  it("matches page mode items for an equivalent aligned request", async () => {
    const pageAdapter = createAdapter(45).adapter
    const offsetAdapter = createAdapter(45).adapter

    const pageResult = await paginate({
      adapter: pageAdapter,
      query: { category: "books" },
      countQuery: "books",
      page: 3,
      limit: 20,
    })
    const offsetResult = await paginateOffset({
      adapter: offsetAdapter,
      query: { category: "books" },
      countQuery: "books",
      offset: 40,
      limit: 20,
    })

    expect(offsetResult.items).toEqual(pageResult.items)
    expect(offsetResult.pagination).toMatchObject({
      total: pageResult.pagination.total,
      limit: pageResult.pagination.limit,
      offset: pageResult.pagination.offset,
      hasNextPage: pageResult.pagination.hasNextPage,
      hasPreviousPage: pageResult.pagination.hasPreviousPage,
    })
  })

  it("validates page-size configuration before counting", async () => {
    const { adapter } = createAdapter(1)

    await expect(
      paginateOffset({
        adapter,
        query: { category: "books" },
        countQuery: "books",
        pageSizeOptions: { minLimit: 20, maxLimit: 10 },
      }),
    ).rejects.toThrow("Invalid page size boundaries.")
    expect(adapter.count).not.toHaveBeenCalled()
    expect(adapter.fetch).not.toHaveBeenCalled()
  })

  it("propagates count and fetch errors by identity", async () => {
    const countError = new Error("count failed")
    const countAdapter: PaginationAdapter<Query, string, number> = {
      count: vi.fn(async () => {
        throw countError
      }),
      fetch: vi.fn(async () => []),
    }
    await expect(
      paginateOffset({
        adapter: countAdapter,
        query: { category: "books" },
        countQuery: "books",
      }),
    ).rejects.toBe(countError)
    expect(countAdapter.fetch).not.toHaveBeenCalled()

    const fetchError = new Error("fetch failed")
    const fetchAdapter: PaginationAdapter<Query, string, number> = {
      count: vi.fn(async () => 1),
      fetch: vi.fn(async () => {
        throw fetchError
      }),
    }
    await expect(
      paginateOffset({
        adapter: fetchAdapter,
        query: { category: "books" },
        countQuery: "books",
      }),
    ).rejects.toBe(fetchError)
  })

  it("returns the adapter item array unchanged", async () => {
    const items = [{ id: 1 }]
    const adapter: PaginationAdapter<Query, string, { id: number }> = {
      count: vi.fn(async () => 1),
      fetch: vi.fn(async () => items),
    }
    const result = await paginateOffset({
      adapter,
      query: { category: "books" },
      countQuery: "books",
    })
    expect(result.items).toBe(items)
  })

  it.each([NaN, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects an invalid adapter count of %s before fetching",
    async (total) => {
      const adapter: PaginationAdapter<Query, string, number> = {
        count: vi.fn(async () => total),
        fetch: vi.fn(async () => []),
      }
      const result = paginateOffset({
        adapter,
        query: { category: "books" },
        countQuery: "books",
      })
      await expect(result).rejects.toThrow("Total must be a non-negative safe integer.")
      expect(adapter.fetch).not.toHaveBeenCalled()
    },
  )
})
