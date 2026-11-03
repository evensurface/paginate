import { count, desc, eq } from "drizzle-orm"
import { int, mysqlTable, varchar } from "drizzle-orm/mysql-core"
import { drizzle as drizzleMysql } from "drizzle-orm/mysql-proxy"
import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core"
import { drizzle as drizzlePg } from "drizzle-orm/pg-proxy"
import { integer as sqliteInteger, sqliteTable, text as sqliteText } from "drizzle-orm/sqlite-core"
import { drizzle as drizzleSqlite } from "drizzle-orm/sqlite-proxy"
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

    await expect(adapter.fetch(() => query, { limit: 1, offset: 1 })).resolves.toEqual([
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

  it.each([NaN, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "rejects an invalid numeric count of %s",
    async (total) => {
      const adapter = createDrizzleAdapter<User>()

      await expect(adapter.count(Promise.resolve(total))).rejects.toThrow(
        "Drizzle count query must return a non-negative safe integer.",
      )
    },
  )

  it("rejects an invalid selected count value", async () => {
    const adapter = createDrizzleAdapter<User>()

    await expect(adapter.count(Promise.resolve([{ total: 1.5 }]))).rejects.toThrow(
      "Drizzle count query must return a non-negative safe integer.",
    )
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
      query: () => query,
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
      query: () => query,
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
      query: () => query,
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

  it("creates an independent select builder for each pagination execution", async () => {
    const users = Array.from({ length: 4 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
    }))
    const createdQueries: ReturnType<typeof createSelectQuery<User>>[] = []
    const createQuery = vi.fn(() => {
      const created = createSelectQuery(users)
      createdQueries.push(created)
      return created.query
    })
    const countQuery = Promise.resolve(users.length)

    const first = await paginate({ query: createQuery, countQuery, page: 1, limit: 2 })
    const second = await paginate({ query: createQuery, countQuery, page: 2, limit: 2 })

    expect(first.items).toEqual(users.slice(0, 2))
    expect(second.items).toEqual(users.slice(2, 4))
    expect(createQuery).toHaveBeenCalledTimes(2)
    expect(createdQueries[0]?.offset).toHaveBeenCalledWith(0)
    expect(createdQueries[1]?.offset).toHaveBeenCalledWith(2)
  })

  it("keeps concurrent pagination executions isolated", async () => {
    const users = Array.from({ length: 4 }, (_, index) => ({
      id: index + 1,
      name: `User ${index + 1}`,
    }))
    const createdQueries: ReturnType<typeof createSelectQuery<User>>[] = []
    const createQuery = vi.fn(() => {
      const created = createSelectQuery(users)
      createdQueries.push(created)
      return created.query
    })
    const countQuery = Promise.resolve(users.length)

    const [first, second] = await Promise.all([
      paginate({ query: createQuery, countQuery, page: 1, limit: 2 }),
      paginate({ query: createQuery, countQuery, page: 2, limit: 2 }),
    ])

    expect(first.items).toEqual(users.slice(0, 2))
    expect(second.items).toEqual(users.slice(2, 4))
    expect(createQuery).toHaveBeenCalledTimes(2)
    expect(createdQueries[0]?.offset).toHaveBeenCalledWith(0)
    expect(createdQueries[1]?.offset).toHaveBeenCalledWith(2)
  })

  it("rejects a query factory that reuses a mutated builder", async () => {
    const { query, limit } = createSelectQuery([{ id: 1, name: "Ada" }])
    const createQuery = () => query
    const countQuery = Promise.resolve(1)

    await paginate({ query: createQuery, countQuery })
    await expect(paginate({ query: createQuery, countQuery })).rejects.toThrow(
      "Drizzle query factory must return a fresh select query.",
    )
    expect(limit).toHaveBeenCalledOnce()
  })

  it("executes PostgreSQL count and select builders with pagination SQL", async () => {
    const executions: { params: unknown[]; sql: string }[] = []
    const users = pgTable("runtime_pg_users", {
      id: integer().notNull(),
      name: text().notNull(),
    })
    const db = drizzlePg(async (sql, params) => {
      executions.push({ sql, params })
      return { rows: sql.includes("count(") ? [[3]] : [[3, "Linus"]] }
    })

    const result = await paginate({
      query: () => db.select({ id: users.id, name: users.name }).from(users).orderBy(users.id),
      countQuery: db.select({ total: count() }).from(users),
      page: 2,
      limit: 2,
    })

    expect(result.items).toEqual([{ id: 3, name: "Linus" }])
    expect(executions).toHaveLength(2)
    expect(executions[1]?.sql).toMatch(/limit \$1 offset \$2$/)
    expect(executions[1]?.params).toEqual([2, 2])
  })

  it("executes MySQL count and select builders with pagination SQL", async () => {
    const executions: { params: unknown[]; sql: string }[] = []
    const users = mysqlTable("runtime_mysql_users", {
      id: int().notNull(),
      name: varchar({ length: 255 }).notNull(),
    })
    const db = drizzleMysql(async (sql, params) => {
      executions.push({ sql, params })
      return { rows: sql.includes("count(") ? [[3]] : [[3, "Linus"]] }
    })

    const result = await paginate({
      query: () => db.select({ id: users.id, name: users.name }).from(users).orderBy(users.id),
      countQuery: db.select({ total: count() }).from(users),
      page: 2,
      limit: 2,
    })

    expect(result.items).toEqual([{ id: 3, name: "Linus" }])
    expect(executions).toHaveLength(2)
    expect(executions[1]?.sql).toMatch(/limit \? offset \?$/)
    expect(executions[1]?.params).toEqual([2, 2])
  })

  it("executes SQLite count and select builders with pagination SQL", async () => {
    const executions: { params: unknown[]; sql: string }[] = []
    const users = sqliteTable("runtime_sqlite_users", {
      id: sqliteInteger().notNull(),
      name: sqliteText().notNull(),
    })
    const db = drizzleSqlite(async (sql, params) => {
      executions.push({ sql, params })
      return { rows: sql.includes("count(") ? [[3]] : [[3, "Linus"]] }
    })

    const result = await paginate({
      query: () => db.select({ id: users.id, name: users.name }).from(users).orderBy(users.id),
      countQuery: db.select({ total: count() }).from(users),
      page: 2,
      limit: 2,
    })

    expect(result.items).toEqual([{ id: 3, name: "Linus" }])
    expect(executions).toHaveLength(2)
    expect(executions[1]?.sql).toMatch(/limit \? offset \?$/)
    expect(executions[1]?.params).toEqual([2, 2])
  })

  it("infers rows from a real Drizzle select builder", () => {
    const inferResult = () => {
      const users = pgTable("users", {
        id: integer().notNull(),
        name: text().notNull(),
      })
      const db = drizzlePg(async () => ({ rows: [] }))
      const result = paginate({
        query: () => db.select().from(users).orderBy(users.id),
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
      const db = drizzlePg(async () => ({ rows: [] }))
      const where = eq(users.active, true)

      const result = paginate({
        query: () => {
          let query = db.select({ id: users.id, name: users.name }).from(users).$dynamic()
          query = query.where(where).orderBy(desc(users.name), users.id)
          return query
        },
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
      const db = drizzlePg(async () => ({ rows: [] }))

      return paginate({
        query: () =>
          db
            .select({ userId: users.id, teamName: teams.name })
            .from(users)
            .leftJoin(teams, eq(users.teamId, teams.id))
            .orderBy(users.id),
        countQuery: db.$count(users),
      })
    }

    type InferredItems = Awaited<ReturnType<typeof inferResult>>["items"]
    expectTypeOf<InferredItems>().toEqualTypeOf<{ userId: number; teamName: string | null }[]>()
  })

  it("preserves MySQL partial-select inference", () => {
    const inferResult = () => {
      const users = mysqlTable("users", {
        id: int().notNull(),
        name: varchar({ length: 255 }).notNull(),
      })
      const db = drizzleMysql(async () => ({ rows: [] }))

      return paginate({
        query: () => db.select({ id: users.id, name: users.name }).from(users).orderBy(users.id),
        countQuery: db.$count(users),
      })
    }

    type InferredItems = Awaited<ReturnType<typeof inferResult>>["items"]
    expectTypeOf<InferredItems>().toEqualTypeOf<{ id: number; name: string }[]>()
  })

  it("preserves SQLite dynamic-query inference", () => {
    const inferResult = () => {
      const users = sqliteTable("users", {
        id: sqliteInteger().notNull(),
        name: sqliteText().notNull(),
      })
      const db = drizzleSqlite(async () => ({ rows: [] }))

      return paginate({
        query: () => {
          let query = db.select({ id: users.id, name: users.name }).from(users).$dynamic()
          query = query.orderBy(users.id)
          return query
        },
        countQuery: db.select({ total: count() }).from(users),
      })
    }

    type InferredItems = Awaited<ReturnType<typeof inferResult>>["items"]
    expectTypeOf<InferredItems>().toEqualTypeOf<{ id: number; name: string }[]>()
  })
})
