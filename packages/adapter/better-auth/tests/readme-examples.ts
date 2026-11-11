import type { AuthContext } from "better-auth"
import { paginate, paginateOffset } from "../src/index"

interface Follow {
  id: string
  followerId: string
  followingId: string
  createdAt: Date
}

interface SelectedProject {
  id: string
  name: string
  task: Array<{
    id: string
    projectId: string
    title: string
  }>
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

  const selectedResult = await paginate<Pick<Follow, "id">>({
    adapter,
    model: "follow",
    select: ["id"],
    sortBy,
  })

  const joinedResult = await paginate<SelectedProject>({
    adapter,
    model: "project",
    select: ["id", "name"],
    join: { task: { limit: 3 } },
    sortBy,
  })

  const unsortedResult = await paginateOffset<Follow>({
    adapter,
    model: "follow",
    offset,
    limit,
  })

  return { pageResult, offsetResult, selectedResult, joinedResult, unsortedResult }
}
