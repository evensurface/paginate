import {
  calculateOffset,
  createPageWindow,
  createPaginationMetadata,
  type PaginationAdapter,
  paginate,
  parseLimit,
  parsePage,
  resolvePage,
} from "../src/index"

type User = {
  id: number
  name: string
}

type UserFilter = {
  active: boolean
}

const database = {
  users: {
    count: async (_filter: UserFilter) => 1,
    findMany: async (
      _options: UserFilter & {
        limit: number
        offset: number
        orderBy: { id: "asc" }
      },
    ): Promise<User[]> => [{ id: 1, name: "Ada" }],
  },
}

const userAdapter: PaginationAdapter<UserFilter, UserFilter, User> = {
  async count(filter) {
    return database.users.count(filter)
  },
  async fetch(filter, { limit, offset }) {
    return database.users.findMany({
      ...filter,
      limit,
      offset,
      orderBy: { id: "asc" },
    })
  },
}

/** Compile-checked counterparts of the public core README examples. */
export async function compileCoreReadmeExamples(pageInput: unknown, limitInput: unknown) {
  const result = await paginate({
    adapter: userAdapter,
    query: { active: true },
    countQuery: { active: true },
    page: pageInput,
    limit: limitInput,
  })

  const customResult = await paginate({
    adapter: userAdapter,
    query: { active: true },
    countQuery: { active: true },
    page: pageInput,
    limit: limitInput,
    pageSizeOptions: {
      defaultLimit: 25,
      minLimit: 5,
      maxLimit: 200,
    },
  })

  const requestedPage = parsePage(pageInput)
  const limit = parseLimit(limitInput, { maxLimit: 50 })
  const pagination = createPaginationMetadata({ page: requestedPage, limit, total: 95 })
  const page = resolvePage(requestedPage, 5)
  const offset = calculateOffset(page, limit)
  const pages = createPageWindow({ page: 5, totalPages: 20 })

  return { customResult, offset, pages, pagination, result }
}
