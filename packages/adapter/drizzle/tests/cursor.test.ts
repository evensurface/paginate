import { and, eq } from "drizzle-orm"
import { int, mysqlTable, varchar } from "drizzle-orm/mysql-core"
import { drizzle as drizzleMysql } from "drizzle-orm/mysql-proxy"
import { customType, integer, pgTable, text } from "drizzle-orm/pg-core"
import { drizzle as drizzlePg } from "drizzle-orm/pg-proxy"
import { integer as sqliteInteger, sqliteTable, text as sqliteText } from "drizzle-orm/sqlite-core"
import { drizzle as drizzleSqlite } from "drizzle-orm/sqlite-proxy"
import { describe, expect, expectTypeOf, it, vi } from "vitest"
import {
  createDrizzleCursorAdapter,
  type DrizzleCursorOrder,
  isDrizzlePaginationError,
  paginateDrizzleCursor,
} from "../src/index"

type User = { id: number; name: string }

const fakeOrder = {
  key: "id",
  column: { dataType: "number", notNull: true } as never,
  direction: "asc" as const,
  getValue: (item: User) => item.id,
}

describe("paginateDrizzleCursor", () => {
  it("returns count-free lookahead metadata and inferred items", async () => {
    const limit = vi.fn((value: number) =>
      Promise.resolve(
        [
          { id: 1, name: "Ada" },
          { id: 2, name: "Grace" },
          { id: 3, name: "Linus" },
        ].slice(0, value),
      ),
    )
    const result = await paginateDrizzleCursor({
      query: () => ({ limit }),
      orderBy: [fakeOrder],
      limit: 2,
    })

    expectTypeOf(result.items).toEqualTypeOf<User[]>()
    expect(result.items.map((item) => item.id)).toEqual([1, 2])
    expect(result.pagination.hasNextPage).toBe(true)
    expect(result.pagination.nextCursor).toEqual(expect.any(String))
    expect(limit).toHaveBeenCalledWith(3)
  })

  it("builds a compound PostgreSQL predicate with existing filters and mixed directions", async () => {
    const users = pgTable("cursor_pg_users", {
      id: integer().notNull(),
      name: text().notNull(),
      active: integer().notNull(),
    })
    const seed = await createCursor()
    const executions: { params: unknown[]; sql: string }[] = []
    const db = drizzlePg(async (sql, params) => {
      executions.push({ sql, params })
      return { rows: [] }
    })

    await paginateDrizzleCursor({
      query: ({ cursorWhere, orderBy }) =>
        db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(and(eq(users.active, 1), cursorWhere))
          .orderBy(...orderBy),
      orderBy: [
        {
          key: "name",
          column: users.name,
          direction: "desc",
          getValue: (item) => item.name,
        },
        {
          key: "id",
          column: users.id,
          direction: "asc",
          getValue: (item) => item.id,
        },
      ],
      cursor: seed,
      limit: 2,
    })

    expect(executions).toHaveLength(1)
    expect(executions[0]?.sql).toContain("where")
    expect(executions[0]?.sql).toContain(" or ")
    expect(executions[0]?.sql).toContain("order by")
    expect(executions[0]?.sql).toMatch(/name" desc, .*id" asc limit \$\d+$/)
    expect(executions[0]?.sql).not.toContain("offset")
    expect(executions[0]?.sql).not.toContain("count(")
    expect(executions[0]?.params.at(-1)).toBe(3)
  })

  it("generates portable MySQL keyset SQL", async () => {
    const users = mysqlTable("cursor_mysql_users", {
      id: int().notNull(),
      name: varchar({ length: 255 }).notNull(),
    })
    const executions: string[] = []
    const db = drizzleMysql(async (sql) => {
      executions.push(sql)
      return { rows: [] }
    })

    await paginateDrizzleCursor({
      query: ({ cursorWhere, orderBy }) =>
        db
          .select()
          .from(users)
          .where(cursorWhere)
          .orderBy(...orderBy),
      orderBy: [{ key: "id", column: users.id, direction: "asc", getValue: (item) => item.id }],
      cursor: await createSingleCursor(),
      limit: 2,
    })

    expect(executions[0]).toMatch(/where .*id.* > \? order by .*id.* asc limit \?$/)
    expect(executions[0]).not.toContain("offset")
  })

  it("generates portable SQLite keyset SQL", async () => {
    const users = sqliteTable("cursor_sqlite_users", {
      id: sqliteInteger().notNull(),
      name: sqliteText().notNull(),
    })
    const executions: string[] = []
    const db = drizzleSqlite(async (sql) => {
      executions.push(sql)
      return { rows: [] }
    })

    await paginateDrizzleCursor({
      query: ({ cursorWhere, orderBy }) =>
        db
          .select()
          .from(users)
          .where(cursorWhere)
          .orderBy(...orderBy),
      orderBy: [{ key: "id", column: users.id, direction: "desc", getValue: (item) => item.id }],
      cursor: await createSingleCursor("desc"),
      limit: 2,
    })

    expect(executions[0]).toMatch(/where .*id.* < \? order by .*id.* desc limit \?$/)
    expect(executions[0]).not.toContain("offset")
  })

  it("preserves partial-select and joined row inference", () => {
    const users = pgTable("cursor_inferred_users", {
      id: integer().notNull(),
      name: text().notNull(),
    })
    const db = drizzlePg(async () => ({ rows: [] }))
    const result = paginateDrizzleCursor({
      query: ({ cursorWhere, orderBy }) =>
        db
          .select({ userId: users.id, userName: users.name })
          .from(users)
          .where(cursorWhere)
          .orderBy(...orderBy),
      orderBy: [
        {
          key: "userId",
          column: users.id,
          direction: "asc",
          getValue: (item) => item.userId,
        },
      ],
    })

    expectTypeOf<Awaited<typeof result>["items"]>().toEqualTypeOf<
      { userId: number; userName: string }[]
    >()

    const typecheckOnly = () => false
    if (typecheckOnly()) {
      paginateDrizzleCursor({
        query: () => ({ limit: () => Promise.resolve<User[]>([]) }),
        orderBy: [
          // @ts-expect-error An integer column cannot be paired with a string getter.
          { key: "id", column: users.id, direction: "asc", getValue: (item) => item.name },
        ],
      })
    }
  })

  it("rejects nullable and duplicate order configuration before creating a query", async () => {
    const users = pgTable("cursor_invalid_users", {
      id: integer().notNull(),
      nickname: text(),
    })
    const query = vi.fn(() => ({ limit: () => Promise.resolve([]) }))

    await expect(
      paginateDrizzleCursor({
        query,
        orderBy: [
          {
            key: "nickname",
            column: users.nickname,
            direction: "asc",
            getValue: (item: { nickname: string | null }) => item.nickname ?? "",
          },
        ] as unknown as DrizzleCursorOrder<{ nickname: string | null }>,
      }),
    ).rejects.toMatchObject({ code: "DRIZZLE_INVALID_CURSOR_ORDER" })
    expect(query).not.toHaveBeenCalled()
  })

  it("rejects cursor reuse with a different order", async () => {
    const cursor = await createSingleCursor()
    const users = pgTable("cursor_mismatch_users", {
      id: integer().notNull(),
      name: text().notNull(),
    })

    await expect(
      paginateDrizzleCursor({
        query: () => ({ limit: () => Promise.resolve<User[]>([]) }),
        orderBy: [
          { key: "name", column: users.name, direction: "asc", getValue: (item) => item.name },
        ],
        cursor,
      }),
    ).rejects.toMatchObject({ code: "DRIZZLE_CURSOR_ORDER_MISMATCH" })
  })

  it("rejects a cursor value whose type does not match the configured column", async () => {
    const stringCursorResult = await paginateDrizzleCursor({
      query: () => ({ limit: () => Promise.resolve([{ id: "1" }, { id: "2" }]) }),
      orderBy: [
        {
          key: "id",
          column: { dataType: "string", notNull: true } as never,
          direction: "asc",
          getValue: (item) => item.id,
        },
      ],
      limit: 1,
    })
    const users = pgTable("cursor_type_mismatch_users", { id: integer().notNull() })

    await expect(
      paginateDrizzleCursor({
        query: () => ({ limit: () => Promise.resolve<{ id: number }[]>([]) }),
        orderBy: [{ key: "id", column: users.id, direction: "asc", getValue: (item) => item.id }],
        cursor: stringCursorResult.pagination.nextCursor ?? undefined,
      }),
    ).rejects.toMatchObject({ code: "DRIZZLE_CURSOR_ORDER_MISMATCH" })
  })

  it("supports custom columns with an explicit cursor value type", async () => {
    const customText = customType<{ data: string; driverData: string }>({
      dataType: () => "text",
    })
    const users = pgTable("cursor_custom_users", {
      token: customText().notNull(),
    })
    const result = await paginateDrizzleCursor({
      query: () => ({
        limit: () => Promise.resolve([{ token: "alpha" }, { token: "beta" }]),
      }),
      orderBy: [
        {
          key: "token",
          column: users.token,
          direction: "asc",
          valueType: "string",
          getValue: (item) => item.token,
        },
      ],
      limit: 1,
    })

    expect(result.items).toEqual([{ token: "alpha" }])
    expect(result.pagination.nextCursor).toEqual(expect.any(String))
  })

  it("rejects a reused query builder and preserves its native coded error", async () => {
    const query = { limit: () => Promise.resolve([]) }
    const adapter = createDrizzleCursorAdapter([fakeOrder])
    const factory = () => query

    await adapter.fetch(factory, { position: undefined, limit: 2 })

    try {
      await adapter.fetch(factory, { position: undefined, limit: 2 })
      throw new Error("Expected query reuse to fail.")
    } catch (error) {
      expect(error).toBeInstanceOf(TypeError)
      expect(isDrizzlePaginationError(error)).toBe(true)
      expect(error).toMatchObject({ code: "DRIZZLE_QUERY_REUSED" })
    }
  })
})

async function createCursor(): Promise<string> {
  const orderBy: DrizzleCursorOrder<User> = [
    {
      ...fakeOrder,
      key: "name",
      column: { dataType: "string", notNull: true } as never,
      direction: "desc",
      getValue: (item) => item.name,
    },
    fakeOrder,
  ]
  const result = await paginateDrizzleCursor({
    query: () => ({
      limit: () =>
        Promise.resolve([
          { id: 1, name: "Grace" },
          { id: 2, name: "Ada" },
          { id: 3, name: "Linus" },
        ]),
    }),
    orderBy,
    limit: 2,
  })

  return result.pagination.nextCursor ?? ""
}

async function createSingleCursor(direction: "asc" | "desc" = "asc"): Promise<string> {
  const result = await paginateDrizzleCursor({
    query: () => ({
      limit: () =>
        Promise.resolve([
          { id: 1, name: "Ada" },
          { id: 2, name: "Grace" },
        ]),
    }),
    orderBy: [{ ...fakeOrder, direction }],
    limit: 1,
  })

  return result.pagination.nextCursor ?? ""
}
