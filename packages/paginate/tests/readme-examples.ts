import {
  type CursorPaginationAdapter,
  type CursorPosition,
  calculateOffset,
  createOffsetPaginationMetadata,
  createPageWindow,
  createPaginationMetadata,
  isPaginationError,
  type PaginationAdapter,
  paginate,
  paginateCursor,
  paginateOffset,
  parseLimit,
  parseOffset,
  parsePage,
  resolvePage,
} from "../src/index"

type User = {
  id: number
  name: string
  createdAt: Date
}

/** Compile-checked counterpart of the README error-handling example. */
export function handlePaginationError(error: unknown): never {
  if (isPaginationError(error)) {
    switch (error.code) {
      case "INVALID_DEFAULT_LIMIT":
        break
      case "OFFSET_OVERFLOW":
        break
    }
  }

  throw error
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
    ): Promise<User[]> => [{ id: 1, name: "Ada", createdAt: new Date(0) }],
    findAfter: async (
      _options: UserFilter & {
        position: CursorPosition | undefined
        limit: number
        orderBy: readonly ["createdAt desc", "id desc"]
      },
    ): Promise<User[]> => [{ id: 1, name: "Ada", createdAt: new Date(0) }],
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

const userCursorAdapter: CursorPaginationAdapter<UserFilter, User> = {
  fetch(filter, { position, limit }) {
    return database.users.findAfter({
      ...filter,
      position,
      limit,
      orderBy: ["createdAt desc", "id desc"],
    })
  },
  getPosition(user) {
    return [
      { key: "createdAt", direction: "desc", value: user.createdAt },
      { key: "id", direction: "desc", value: user.id },
    ]
  },
}

/** Compile-checked counterparts of the public core README examples. */
export async function compileCoreReadmeExamples(
  pageInput: string | number | undefined,
  offsetInput: string | number | undefined,
  limitInput: string | number | undefined,
  cursorInput?: string,
) {
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
  const cursorResult = await paginateCursor({
    adapter: userCursorAdapter,
    query: { active: true },
    cursor: cursorInput,
    limit: limitInput,
  })

  const requestedPage = parsePage(pageInput)
  const requestedOffset = parseOffset(offsetInput)
  const limit = parseLimit(limitInput, { maxLimit: 50 })
  const pagination = createPaginationMetadata({ page: requestedPage, limit, total: 95 })
  const page = resolvePage(requestedPage, 5)
  const offset = calculateOffset(page, limit)
  const pages = createPageWindow({ page: 5, totalPages: 20 })
  const offsetResult = await paginateOffset({
    adapter: userAdapter,
    query: { active: true },
    countQuery: { active: true },
    offset: requestedOffset,
    limit: limitInput,
  })
  const offsetPagination = createOffsetPaginationMetadata({
    offset: requestedOffset,
    limit,
    total: 95,
  })
  const endpointResult = {
    users: offsetResult.items,
    total: offsetResult.pagination.total,
    limit: offsetResult.pagination.limit,
    offset: offsetResult.pagination.offset,
  }

  return {
    customResult,
    cursorResult,
    endpointResult,
    offset,
    offsetPagination,
    offsetResult,
    pages,
    pagination,
    result,
  }
}
