import type { AuthContext } from "better-auth"
import { paginate, paginateOffset } from "../src/index"

interface Follow {
  id: string
  followerId: string
  followingId: string
  createdAt: Date
}

export async function compileReadmeExamples(
  adapter: AuthContext["adapter"],
  userId: string,
  page?: string,
  offset?: string,
  limit?: string,
) {
  const where = [{ field: "followerId", value: userId }]
  const sortBy = { field: "id", direction: "asc" } as const

  const pageResult = await paginate<Follow>({
    adapter,
    model: "follow",
    where,
    sortBy,
    page,
    limit,
  })
  const offsetResult = await paginateOffset<Follow>({
    adapter,
    model: "follow",
    where,
    sortBy,
    offset,
    limit,
  })

  return { pageResult, offsetResult }
}
