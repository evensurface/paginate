import { describe, expect, expectTypeOf, it, vi } from "vitest"
import { paginate } from "../src/core/paginate"
import type { PaginationAdapter } from "../src/core/types"

interface Query {
  category: string
}

function createAdapter(total: number) {
  const values = Array.from({ length: total }, (_, index) => index + 1)
  const adapter: PaginationAdapter<Query, string, number> = {
    count: vi.fn(async () => total),
    fetch: vi.fn(async (_query, { limit, offset }) => values.slice(offset, offset + limit)),
  }

  return { adapter, values }
}

describe("paginate", () => {
  it("fetches the requested page with inferred item types", async () => {
    const { adapter } = createAdapter(45)
    const result = await paginate({
      adapter,
      query: { category: "books" },
      countQuery: "books",
      page: "2",
      limit: "20",
    })

    expectTypeOf(result.items).toEqualTypeOf<number[]>()
    expect(result.items).toEqual(Array.from({ length: 20 }, (_, index) => index + 21))
    expect(result.pagination).toMatchObject({
      page: 2,
      offset: 20,
      total: 45,
      totalPages: 3,
      firstItem: 21,
      lastItem: 40,
    })
    expect(adapter.fetch).toHaveBeenCalledOnce()
    expect(adapter.fetch).toHaveBeenCalledWith({ category: "books" }, { limit: 20, offset: 20 })
  })

  it("resolves an out-of-range page before making one fetch", async () => {
    const { adapter } = createAdapter(25)
    const result = await paginate({
      adapter,
      query: { category: "books" },
      countQuery: "books",
      page: Number.MAX_SAFE_INTEGER,
      limit: 10,
    })

    expect(result.items).toEqual([21, 22, 23, 24, 25])
    expect(result.pagination).toMatchObject({ page: 3, offset: 20 })
    expect(adapter.fetch).toHaveBeenCalledOnce()
    expect(adapter.fetch).toHaveBeenCalledWith({ category: "books" }, { limit: 10, offset: 20 })
  })

  it("does not fetch when the dataset is empty", async () => {
    const { adapter } = createAdapter(0)
    const result = await paginate({
      adapter,
      query: { category: "books" },
      countQuery: "books",
      page: 4,
    })

    expect(result.items).toEqual([])
    expect(result.pagination).toMatchObject({
      page: 1,
      offset: 0,
      total: 0,
      totalPages: 0,
    })
    expect(adapter.fetch).not.toHaveBeenCalled()
  })

  it("propagates count errors without fetching", async () => {
    const error = new Error("count failed")
    const adapter: PaginationAdapter<Query, string, number> = {
      count: vi.fn(async () => {
        throw error
      }),
      fetch: vi.fn(async () => []),
    }

    await expect(
      paginate({
        adapter,
        query: { category: "books" },
        countQuery: "books",
      }),
    ).rejects.toBe(error)
    expect(adapter.fetch).not.toHaveBeenCalled()
  })

  it("propagates fetch errors", async () => {
    const error = new Error("fetch failed")
    const adapter: PaginationAdapter<Query, string, number> = {
      count: vi.fn(async () => 1),
      fetch: vi.fn(async () => {
        throw error
      }),
    }

    await expect(
      paginate({
        adapter,
        query: { category: "books" },
        countQuery: "books",
      }),
    ).rejects.toBe(error)
  })

  it("rejects invalid adapter counts before fetching", async () => {
    const { adapter } = createAdapter(-1)

    await expect(
      paginate({
        adapter,
        query: { category: "books" },
        countQuery: "books",
      }),
    ).rejects.toThrow("Total must be a non-negative safe integer.")
    expect(adapter.fetch).not.toHaveBeenCalled()
  })
})
