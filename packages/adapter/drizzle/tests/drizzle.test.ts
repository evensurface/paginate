import { count, desc, eq } from "drizzle-orm"
import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core"
import { drizzle } from "drizzle-orm/pg-proxy"
import { describe, expect, expectTypeOf, it, vi } from "vitest"
import { createDrizzleAdapter, paginate } from "../src/index"

interface User {
  id: number
  name: string
}

function createSelectQuery<TItem>(items: TItem[]) {
  let selectedLimit = items.length
  const offset = vi.fn(async (value: number) => items.slice(value, value + selectedLimit))
  const limit = vi.fn((value: number) => {
    selectedLimit = value
    return { offset }
  })

  return { query: { limit }, limit, offset }
}

describe("createDrizzleAdapter", () => {
  it("applies the limit and offset to a Drizzle-shaped query", async () => {
    const { query, limit, offset } = createSelectQuery([
      { id: 1, name: "Ada" },
      { id: 2, name: "Grace" },
      { id: 3, name: "Linus" },
    ])
    const adapter = createDrizzleAdapter<User>()

    await expect(adapter.fetch(query, { limit: 1, offset: 1 })).resolves.toEqual([
      { id: 2, name: "Grace" },
    ])
    expect(limit).toHaveBeenCalledWith(1)
    expect(offset).toHaveBeenCalledWith(1)
  })

  it("resolves db.$count queries", async () => {
    const adapter = createDrizzleAdapter<User>()

    await expect(adapter.count(Promise.resolve(42))).resolves.toBe(42)
  })

  it("resolves select count queries", async () => {
    const adapter = createDrizzleAdapter<User>()

    await expect(adapter.count(Promise.resolve([{ total: 42 }]))).resolves.toBe(42)
  })

  it("rejects select count queries that return no row", async () => {
    const adapter = createDrizzleAdapter<User>()

    await expect(adapter.count(Promise.resolve([]))).rejects.toThrow(
      "Drizzle count query must return exactly one row.",
    )
  })

  it("rejects select count queries that return multiple rows", async () => {
    const adapter = createDrizzleAdapter<User>()

    await expect(adapter.count(Promise.resolve([{ total: 10 }, { total: 20 }]))).rejects.toThrow(
      "Drizzle count query must return exactly one row.",
    )
  })
})

describe("paginate", () => {
  it("returns items and pagination metadata", async () => {
    const users = Array.from({ length: 25 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
    }))
    const { query } = createSelectQuery(users)

    const result = await paginate({
      query,
      countQuery: Promise.resolve(users.length),
      page: 3,
      limit: 10,
    })

    expect(result.items).toEqual(users.slice(20, 25))
    expect(result.pagination).toMatchObject({
      page: 3,
      limit: 10,
      offset: 20,
      total: 25,
      totalPages: 3,
    })
  })

  it("does not execute the select query for an empty result", async () => {
    const { query, limit, offset } = createSelectQuery<User>([])

    const result = await paginate({
      query,
      countQuery: Promise.resolve([{ total: 0 }]),
      page: 4,
      limit: 10,
    })

    expect(result.items).toEqual([])
    expect(result.pagination).toMatchObject({ page: 1, offset: 0, total: 0, totalPages: 0 })
    expect(limit).not.toHaveBeenCalled()
    expect(offset).not.toHaveBeenCalled()
  })

  it("fetches the resolved last page once for an out-of-range request", async () => {
    const users = Array.from({ length: 25 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
    }))
    const { query, limit, offset } = createSelectQuery(users)

    const result = await paginate({
      query,
      countQuery: Promise.resolve(users.length),
      page: 99,
      limit: 10,
    })

    expect(result.items).toEqual(users.slice(20))
    expect(result.pagination).toMatchObject({ page: 3, offset: 20, totalPages: 3 })
    expect(limit).toHaveBeenCalledOnce()
    expect(offset).toHaveBeenCalledOnce()
    expect(offset).toHaveBeenCalledWith(20)
  })

  it("infers rows from a real Drizzle select builder", () => {
    const inferResult = () => {
      const users = pgTable("users", {
        id: integer().notNull(),
        name: text().notNull(),
      })
      const db = drizzle(async () => ({ rows: [] }))
      const query = db.select().from(users).orderBy(users.id)
      const result = paginate({
        query,
        countQuery: Promise.resolve(1),
      })

      return result
    }

    type InferredItems = Awaited<ReturnType<typeof inferResult>>["items"]
    expectTypeOf<InferredItems>().toEqualTypeOf<{ id: number; name: string }[]>()
  })

  it("accepts filtered dynamic queries and selected counts", () => {
    const inferResult = () => {
      const users = pgTable("users", {
        id: integer().notNull(),
        name: text().notNull(),
        active: boolean().notNull(),
      })
      const db = drizzle(async () => ({ rows: [] }))
      const where = eq(users.active, true)
      let query = db.select({ id: users.id, name: users.name }).from(users).$dynamic()

      query = query.where(where).orderBy(desc(users.name), users.id)

      const result = paginate({
        query,
        countQuery: db.select({ total: count() }).from(users).where(where),
      })

      return result
    }

    type InferredItems = Awaited<ReturnType<typeof inferResult>>["items"]
    expectTypeOf<InferredItems>().toEqualTypeOf<{ id: number; name: string }[]>()
  })

  it("preserves joined row inference", () => {
    const inferResult = () => {
      const teams = pgTable("teams", {
        id: integer().notNull(),
        name: text().notNull(),
      })
      const users = pgTable("users", {
        id: integer().notNull(),
        teamId: integer().notNull(),
      })
      const db = drizzle(async () => ({ rows: [] }))
      const query = db
        .select({ userId: users.id, teamName: teams.name })
        .from(users)
        .leftJoin(teams, eq(users.teamId, teams.id))
        .orderBy(users.id)

      return paginate({
        query,
        countQuery: db.$count(users),
      })
    }

    type InferredItems = Awaited<ReturnType<typeof inferResult>>["items"]
    expectTypeOf<InferredItems>().toEqualTypeOf<{ userId: number; teamName: string | null }[]>()
  })
})
