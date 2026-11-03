import { paginate as paginateCore } from "@evensurface/paginate"
import { and, asc, count, desc, eq, ilike } from "drizzle-orm"
import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { drizzle } from "drizzle-orm/pg-proxy"
import { createDrizzleAdapter, paginate } from "../src/index"

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

/** Compile-checked counterparts of the public Drizzle README examples. */
export async function compileDrizzleReadmeExamples(page: unknown, limit: unknown, search?: string) {
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

  return { dynamicResult, joined, lowLevel, quickStart, selectedCount }
}
