import {
  isPaginationError,
  paginate as paginateCore,
  paginateOffset as paginateOffsetCore,
} from "@evensurface/paginate"
import { and, asc, count, desc, eq, ilike } from "drizzle-orm"
import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { drizzle } from "drizzle-orm/pg-proxy"
import {
  createDrizzleAdapter,
  isDrizzlePaginationError,
  paginate,
  paginateOffset,
} from "../src/index"

const teams = pgTable("readme_teams", {
  id: integer().notNull(),
  name: text().notNull(),
})

const users = pgTable("readme_users", {
  id: integer().notNull(),
  name: text().notNull(),
  active: boolean().notNull(),
  createdAt: timestamp().notNull(),
  teamId: integer().notNull(),
})

const db = drizzle(async () => ({ rows: [] }))

/** Compile-checked counterpart of the README error-handling example. */
export function handleDrizzlePaginationError(error: unknown): never {
  if (isDrizzlePaginationError(error)) {
    switch (error.code) {
      case "DRIZZLE_INVALID_COUNT_ROWS":
      case "DRIZZLE_INVALID_COUNT":
      case "DRIZZLE_QUERY_REUSED":
        break
    }
  } else if (isPaginationError(error)) {
    // Handle a core pagination validation error.
  }

  throw error
}

/** Compile-checked counterparts of the public Drizzle README examples. */
export async function compileDrizzleReadmeExamples(
  page: string | number | undefined,
  offset: string | number | undefined,
  limit: string | number | undefined,
  search?: string,
) {
  const where = eq(users.active, true)

  const quickStart = await paginate({
    query: () =>
      db
        .select({
          id: users.id,
          name: users.name,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt), asc(users.id)),
    countQuery: db.$count(users, where),
    page,
    limit,
  })

  const selectedCount = await paginate({
    query: () => db.select().from(users).where(where).orderBy(asc(users.id)),
    countQuery: db.select({ total: count() }).from(users).where(where),
    page,
    limit,
  })

  const offsetResult = await paginateOffset({
    query: () => db.select().from(users).where(where).orderBy(asc(users.id)),
    countQuery: db.$count(users, where),
    offset,
    limit,
  })

  const filters = [where]
  if (search) {
    filters.push(ilike(users.name, `%${search}%`))
  }
  const dynamicWhere = and(...filters)
  let countQuery = db.select({ total: count() }).from(users).$dynamic()
  countQuery = countQuery.where(dynamicWhere)

  const dynamicResult = await paginate({
    query: () => {
      let query = db
        .select({ id: users.id, name: users.name, createdAt: users.createdAt })
        .from(users)
        .$dynamic()
      query = query.where(dynamicWhere).orderBy(desc(users.createdAt), asc(users.id))
      return query
    },
    countQuery,
    page,
    limit,
  })

  const joined = await paginate({
    query: () =>
      db
        .select({ userId: users.id, userName: users.name, teamName: teams.name })
        .from(users)
        .leftJoin(teams, eq(users.teamId, teams.id))
        .where(where)
        .orderBy(asc(users.id)),
    countQuery: db.$count(users, where),
    page,
    limit,
  })

  type UserRow = typeof users.$inferSelect
  const createUserQuery = () => db.select().from(users).orderBy(users.id)
  const lowLevel = await paginateCore({
    adapter: createDrizzleAdapter<UserRow>(),
    query: createUserQuery,
    countQuery: db.$count(users),
    page,
    limit,
  })
  const lowLevelOffset = await paginateOffsetCore({
    adapter: createDrizzleAdapter<UserRow>(),
    query: createUserQuery,
    countQuery: db.$count(users),
    offset,
    limit,
  })

  return {
    dynamicResult,
    joined,
    lowLevel,
    lowLevelOffset,
    offsetResult,
    quickStart,
    selectedCount,
  }
}
