import { memoryAdapter } from "@better-auth/memory-adapter"
import {
  type AuthContext,
  type BetterAuthOptions,
  type BetterAuthPlugin,
  betterAuth,
} from "better-auth"
import { createAuthEndpoint } from "better-auth/api"
import { getMigrations } from "better-auth/db/migration"
import Database from "better-sqlite3"
import { afterEach, describe, expect, it } from "vitest"
import { paginateBetterAuth, paginateBetterAuthOffset } from "../src/index"

interface Follow {
  id: string
  followerId: string
  followingId: string
  createdAt: Date
}

interface Project {
  id: string
  name: string
}

interface Task {
  id: string
  projectId: string
  title: string
}

interface ProjectDetail {
  id: string
  projectId: string
  summary: string
}

interface SelectedProjectWithTasks {
  id: string
  task: Task[]
}

interface SelectedProjectWithDetail {
  id: string
  projectDetail: ProjectDetail | null
}

const followPlugin = {
  id: "paginateBetterAuth-follow-test",
  schema: {
    follow: {
      fields: {
        followerId: { type: "string", required: true },
        followingId: { type: "string", required: true },
        createdAt: { type: "date", required: true },
      },
    },
    project: {
      fields: {
        name: { type: "string", required: true },
      },
    },
    task: {
      fields: {
        projectId: {
          type: "string",
          required: true,
          references: { model: "project", field: "id" },
        },
        title: { type: "string", required: true },
      },
    },
    projectDetail: {
      fields: {
        projectId: {
          type: "string",
          required: true,
          unique: true,
          references: { model: "project", field: "id" },
        },
        summary: { type: "string", required: true },
      },
    },
  },
  endpoints: {
    paginateFollows: createAuthEndpoint(
      "/paginateBetterAuth-follow-test/follows",
      { method: "GET" },
      async (context) =>
        paginateBetterAuth<Follow>({
          adapter: context.context.adapter,
          model: "follow",
          where: [{ field: "followerId", value: "user-1" }],
          sortBy: { field: "id", direction: "asc" },
          limit: 2,
        }),
    ),
  },
} satisfies BetterAuthPlugin

const authDefaults = {
  baseURL: "http://localhost:3000",
  secret: "paginate-better-auth-test-secret-at-least-32-characters",
  plugins: [followPlugin],
} satisfies Partial<BetterAuthOptions>

async function seedFollows<Options extends BetterAuthOptions>(
  adapter: AuthContext<Options>["adapter"],
): Promise<void> {
  const rows: Follow[] = [
    {
      id: "follow-01",
      followerId: "user-1",
      followingId: "user-2",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      id: "follow-02",
      followerId: "user-1",
      followingId: "user-3",
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
    },
    {
      id: "follow-03",
      followerId: "user-1",
      followingId: "user-4",
      createdAt: new Date("2026-01-03T00:00:00.000Z"),
    },
    {
      id: "follow-04",
      followerId: "other-user",
      followingId: "user-1",
      createdAt: new Date("2026-01-04T00:00:00.000Z"),
    },
  ]

  for (const row of rows) {
    await adapter.create<Follow, Follow>({
      model: "follow",
      data: row,
      forceAllowId: true,
    })
  }
}

async function verifyRealAdapter<Options extends BetterAuthOptions>(
  adapter: AuthContext<Options>["adapter"],
): Promise<void> {
  await seedFollows(adapter)
  const where = [{ field: "followerId", value: "user-1" }]
  const sortBy = { field: "id", direction: "asc" } as const

  const page = await paginateBetterAuth<Follow>({
    adapter,
    model: "follow",
    where,
    sortBy,
    page: 2,
    limit: 2,
  })
  expect(page.items.map((item) => item.id)).toEqual(["follow-03"])
  expect(page.pagination).toMatchObject({ page: 2, offset: 2, total: 3, totalPages: 2 })

  const offset = await paginateBetterAuthOffset<Follow>({
    adapter,
    model: "follow",
    where,
    sortBy,
    offset: 1,
    limit: 2,
  })
  expect(offset.items.map((item) => item.id)).toEqual(["follow-02", "follow-03"])
  expect(offset.pagination).toEqual({
    total: 3,
    limit: 2,
    offset: 1,
    hasNextPage: false,
    hasPreviousPage: true,
  })

  const empty = await paginateBetterAuth<Follow>({
    adapter,
    model: "follow",
    where: [{ field: "followerId", value: "missing-user" }],
    sortBy,
  })
  expect(empty.items).toEqual([])
  expect(empty.pagination).toMatchObject({ total: 0, totalPages: 0 })

  const [first, second] = await Promise.all([
    paginateBetterAuth<Follow>({ adapter, model: "follow", where, sortBy, page: 1, limit: 1 }),
    paginateBetterAuth<Follow>({ adapter, model: "follow", where, sortBy, page: 2, limit: 1 }),
  ])
  expect(first.items[0]?.id).toBe("follow-01")
  expect(second.items[0]?.id).toBe("follow-02")
}

async function seedProjects<Options extends BetterAuthOptions>(
  adapter: AuthContext<Options>["adapter"],
): Promise<void> {
  for (const project of [
    { id: "project-01", name: "First project" },
    { id: "project-02", name: "Second project" },
    { id: "project-03", name: "Empty project" },
    { id: "project-04", name: "Second project" },
  ]) {
    await adapter.create<Project, Project>({
      model: "project",
      data: project,
      forceAllowId: true,
    })
  }

  for (const task of [
    { id: "task-01", projectId: "project-01", title: "First task" },
    { id: "task-02", projectId: "project-01", title: "Second task" },
    { id: "task-03", projectId: "project-01", title: "Third task" },
    { id: "task-04", projectId: "project-02", title: "Fourth task" },
    { id: "task-05", projectId: "project-04", title: "Fifth task" },
    { id: "task-06", projectId: "project-04", title: "Sixth task" },
  ]) {
    await adapter.create<Task, Task>({
      model: "task",
      data: task,
      forceAllowId: true,
    })
  }

  const detail: ProjectDetail = {
    id: "project-detail-01",
    projectId: "project-01",
    summary: "First project details",
  }
  await adapter.create<ProjectDetail, ProjectDetail>({
    model: "projectDetail",
    data: detail,
    forceAllowId: true,
  })
}

async function verifyFindManyOptions<Options extends BetterAuthOptions>(
  adapter: AuthContext<Options>["adapter"],
): Promise<void> {
  await seedProjects(adapter)

  const selected = await paginateBetterAuth<Pick<Project, "id">>({
    adapter,
    model: "project",
    select: ["id"],
    sortBy: { field: "id", direction: "asc" },
    page: 2,
    limit: 1,
  })
  expect(selected.items).toEqual([{ id: "project-02" }])
  expect(selected.pagination).toMatchObject({ page: 2, offset: 1, total: 4, totalPages: 4 })

  const joinedSelect = ["id"]
  const joined = await paginateBetterAuth<SelectedProjectWithTasks>({
    adapter,
    model: "project",
    select: joinedSelect,
    join: { task: { limit: 1 } },
    sortBy: { field: "id", direction: "asc" },
    page: 1,
    limit: 1,
  })
  expect(joined.items).toHaveLength(1)
  expect(joined.items[0]?.id).toBe("project-01")
  expect(joined.items[0]?.task).toHaveLength(1)
  expect((joined.items[0] as unknown as { name?: unknown }).name).toBeUndefined()
  expect(joined.pagination).toMatchObject({ page: 1, total: 4, totalPages: 4 })
  expect(joinedSelect).toEqual(["id"])

  const joinedSecondPage = await paginateBetterAuth<SelectedProjectWithTasks>({
    adapter,
    model: "project",
    select: ["id"],
    join: { task: { limit: 1 } },
    sortBy: { field: "id", direction: "asc" },
    page: 2,
    limit: 1,
  })
  expect(joinedSecondPage.items).toHaveLength(1)
  expect(joinedSecondPage.items[0]?.id).toBe("project-02")
  expect(joinedSecondPage.items[0]?.task).toHaveLength(1)
  expect(joinedSecondPage.pagination).toMatchObject({ page: 2, total: 4, totalPages: 4 })

  const filteredJoin = await paginateBetterAuth<SelectedProjectWithTasks>({
    adapter,
    model: "project",
    where: [{ field: "name", value: "First project" }],
    select: ["id"],
    join: { task: { limit: 1 } },
    sortBy: { field: "id", direction: "asc" },
  })
  expect(filteredJoin.items).toHaveLength(1)
  expect(filteredJoin.items[0]?.id).toBe("project-01")
  expect(filteredJoin.items[0]?.task).toHaveLength(1)
  expect(filteredJoin.pagination).toMatchObject({ total: 1, totalPages: 1 })

  const offsetSelect = ["id"]
  const offsetJoin = { task: { limit: 2 } }
  const joinedOffset = await paginateBetterAuthOffset<SelectedProjectWithTasks>({
    adapter,
    model: "project",
    select: offsetSelect,
    join: offsetJoin,
    sortBy: { field: "id", direction: "asc" },
    offset: 0,
    limit: 4,
  })
  expect(joinedOffset.items.map(({ id, task }) => [id, task.length])).toEqual([
    ["project-01", 2],
    ["project-02", 1],
    ["project-03", 0],
    ["project-04", 2],
  ])
  expect(joinedOffset.pagination).toEqual({
    total: 4,
    limit: 4,
    offset: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  })
  expect(offsetSelect).toEqual(["id"])
  expect(offsetJoin).toEqual({ task: { limit: 2 } })

  const oneToOne = await paginateBetterAuthOffset<SelectedProjectWithDetail>({
    adapter,
    model: "project",
    select: ["id"],
    join: { projectDetail: true },
    sortBy: { field: "id", direction: "asc" },
    offset: 0,
    limit: 2,
  })
  expect(oneToOne.items.map((item) => item.id)).toEqual(["project-01", "project-02"])
  expect(oneToOne.items[0]?.projectDetail).toEqual({
    id: "project-detail-01",
    projectId: "project-01",
    summary: "First project details",
  })
  expect(oneToOne.items[1]?.projectDetail).toBeNull()
  expect(oneToOne.pagination).toMatchObject({ total: 4, offset: 0, limit: 2 })

  const duplicateSort = await paginateBetterAuthOffset<Project>({
    adapter,
    model: "project",
    sortBy: { field: "name", direction: "asc" },
    offset: 0,
    limit: 4,
  })
  expect(duplicateSort.items.map((item) => item.name)).toEqual([
    "Empty project",
    "First project",
    "Second project",
    "Second project",
  ])
  expect(
    new Set(
      duplicateSort.items.filter((item) => item.name === "Second project").map((item) => item.id),
    ),
  ).toEqual(new Set(["project-02", "project-04"]))

  const unsorted = await paginateBetterAuthOffset<Project>({
    adapter,
    model: "project",
    offset: 0,
    limit: 10,
  })
  expect(new Set(unsorted.items.map((item) => item.id))).toEqual(
    new Set(["project-01", "project-02", "project-03", "project-04"]),
  )
  expect(unsorted.pagination.total).toBe(4)

  await expect(
    paginateBetterAuth({
      adapter,
      model: "project",
      join: { follow: true },
    }),
  ).rejects.toThrow()
}

describe("real Better Auth adapters", () => {
  const databases: Database.Database[] = []

  afterEach(() => {
    for (const database of databases.splice(0)) {
      database.close()
    }
  })

  it.each([false, true])(
    "paginates plugin models through the official memory adapter (native joins: %s)",
    async (joins) => {
      const auth = betterAuth({
        ...authDefaults,
        advanced: { database: { joins } },
        database: memoryAdapter({ follow: [], project: [], task: [], projectDetail: [] }),
      })
      const context = await auth.$context

      await verifyRealAdapter(context.adapter)
      await verifyFindManyOptions(context.adapter)
      const endpointResult = await auth.api.paginateFollows()
      expect(endpointResult.items.map((item) => item.id)).toEqual(["follow-01", "follow-02"])
      expect(endpointResult.pagination).toMatchObject({ page: 1, total: 3 })
    },
  )

  it.each([false, true])(
    "paginates a migrated plugin model through in-memory SQLite (native joins: %s)",
    async (joins) => {
      const database = new Database(":memory:")
      databases.push(database)
      const options = {
        ...authDefaults,
        advanced: { database: { joins } },
        database,
      } satisfies BetterAuthOptions
      const migrations = await getMigrations(options)
      await migrations.runMigrations()
      const auth = betterAuth(options)
      const context = await auth.$context

      await verifyRealAdapter(context.adapter)
      await verifyFindManyOptions(context.adapter)
    },
  )
})
