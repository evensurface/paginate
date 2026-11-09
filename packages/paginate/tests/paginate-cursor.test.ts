import { describe, expect, expectTypeOf, it, vi } from "vitest"
import { type CursorPaginationAdapter, type CursorPosition, paginateCursor } from "../src/index"

type Item = { id: number; createdAt: Date }
type Query = { items: Item[] }

function createAdapter(): CursorPaginationAdapter<Query, Item> {
  return {
    async fetch(query, { position, limit }) {
      const anchor = position?.[0]?.value
      const start =
        typeof anchor === "number" ? query.items.findIndex((item) => item.id > anchor) : 0
      return query.items.slice(start < 0 ? query.items.length : start, start + limit)
    },
    getPosition(item): CursorPosition {
      return [{ key: "id", direction: "asc", value: item.id }]
    },
  }
}

describe("paginateCursor", () => {
  it("traverses first, middle, and final pages with inferred items", async () => {
    const query = {
      items: Array.from({ length: 5 }, (_, index) => ({
        id: index + 1,
        createdAt: new Date(2026, 0, 1, 0, 0, index),
      })),
    }
    const adapter = createAdapter()

    const first = await paginateCursor({ adapter, query, limit: 2 })
    expectTypeOf(first.items).toEqualTypeOf<Item[]>()
    expect(first.items.map((item) => item.id)).toEqual([1, 2])
    expect(first.pagination).toMatchObject({ limit: 2, hasNextPage: true })

    const middle = await paginateCursor({
      adapter,
      query,
      cursor: first.pagination.nextCursor ?? undefined,
      limit: 2,
    })
    expect(middle.items.map((item) => item.id)).toEqual([3, 4])

    const final = await paginateCursor({
      adapter,
      query,
      cursor: middle.pagination.nextCursor ?? undefined,
      limit: 2,
    })
    expect(final.items.map((item) => item.id)).toEqual([5])
    expect(final.pagination).toEqual({ limit: 2, nextCursor: null, hasNextPage: false })
  })

  it.each([0, 1, 2])("handles a dataset containing %d records", async (total) => {
    const query = {
      items: Array.from({ length: total }, (_, index) => ({
        id: index + 1,
        createdAt: new Date(0),
      })),
    }
    const result = await paginateCursor({ adapter: createAdapter(), query, limit: 2 })

    expect(result.items).toHaveLength(total)
    expect(result.pagination).toEqual({ limit: 2, nextCursor: null, hasNextPage: false })
  })

  it("uses the existing limit normalization and requests one lookahead row", async () => {
    const adapter = createAdapter()
    const fetch = vi.spyOn(adapter, "fetch")
    const query = { items: [{ id: 1, createdAt: new Date(0) }] }

    const result = await paginateCursor({
      adapter,
      query,
      limit: 500,
      pageSizeOptions: { defaultLimit: 5, maxLimit: 30 },
    })

    expect(result.pagination.limit).toBe(30)
    expect(fetch).toHaveBeenCalledWith(query, { position: undefined, limit: 31 })
  })

  it("rejects unsafe lookahead before decoding or fetching", async () => {
    const adapter = createAdapter()
    const fetch = vi.spyOn(adapter, "fetch")

    await expect(
      paginateCursor({
        adapter,
        query: { items: [] },
        cursor: "invalid",
        limit: Number.MAX_SAFE_INTEGER,
        pageSizeOptions: { defaultLimit: 1, maxLimit: Number.MAX_SAFE_INTEGER },
      }),
    ).rejects.toMatchObject({ code: "CURSOR_LIMIT_OVERFLOW" })
    expect(fetch).not.toHaveBeenCalled()
  })

  it("rejects invalid cursors before fetching", async () => {
    const adapter = createAdapter()
    const fetch = vi.spyOn(adapter, "fetch")

    await expect(
      paginateCursor({ adapter, query: { items: [] }, cursor: "invalid" }),
    ).rejects.toMatchObject({ code: "INVALID_CURSOR" })
    expect(fetch).not.toHaveBeenCalled()
  })

  it("propagates adapter failures by identity", async () => {
    const error = new Error("fetch failed")
    const adapter: CursorPaginationAdapter<Query, Item> = {
      fetch: async () => {
        throw error
      },
      getPosition: () => [{ key: "id", direction: "asc", value: 1 }],
    }

    await expect(paginateCursor({ adapter, query: { items: [] } })).rejects.toBe(error)
  })

  it("never returns the lookahead row even if an adapter returns extra rows", async () => {
    const query = {
      items: Array.from({ length: 5 }, (_, index) => ({
        id: index + 1,
        createdAt: new Date(0),
      })),
    }
    const result = await paginateCursor({ adapter: createAdapter(), query, limit: 2 })

    expect(result.items.map((item) => item.id)).toEqual([1, 2])
  })

  it("traverses equal primary values with a compound unique tie-breaker", async () => {
    const timestamp = new Date("2026-11-09T10:00:00.000Z")
    const query = {
      items: [
        { id: 3, createdAt: timestamp },
        { id: 2, createdAt: timestamp },
        { id: 1, createdAt: new Date("2026-11-08T10:00:00.000Z") },
      ],
    }
    const adapter: CursorPaginationAdapter<Query, Item> = {
      async fetch({ items }, { position, limit }) {
        const date = position?.[0]?.value
        const id = position?.[1]?.value
        const filtered =
          date instanceof Date && typeof id === "number"
            ? items.filter(
                (item) =>
                  item.createdAt < date ||
                  (item.createdAt.getTime() === date.getTime() && item.id < id),
              )
            : items
        return filtered.slice(0, limit)
      },
      getPosition(item) {
        return [
          { key: "createdAt", direction: "desc", value: item.createdAt },
          { key: "id", direction: "desc", value: item.id },
        ]
      },
    }

    const first = await paginateCursor({ adapter, query, limit: 1 })
    const second = await paginateCursor({
      adapter,
      query,
      cursor: first.pagination.nextCursor ?? undefined,
      limit: 1,
    })
    const third = await paginateCursor({
      adapter,
      query,
      cursor: second.pagination.nextCursor ?? undefined,
      limit: 1,
    })

    expect([...first.items, ...second.items, ...third.items].map((item) => item.id)).toEqual([
      3, 2, 1,
    ])
  })
})
