import type { PaginationAdapter } from "./types"

interface MetadataWithOffset {
  offset: number
}

interface CountedOffsetPaginationOptions<
  TQuery,
  TCountQuery,
  TItem,
  TMetadata extends MetadataWithOffset,
> {
  adapter: PaginationAdapter<TQuery, TCountQuery, TItem>
  query: TQuery
  countQuery: TCountQuery
  limit: number
  createMetadata(total: number): TMetadata
}

interface CountedOffsetPaginationResult<TItem, TMetadata> {
  items: TItem[]
  pagination: TMetadata
}

/** Executes the count and conditional fetch shared by counted offset modes. */
export async function executeCountedOffsetPagination<
  TQuery,
  TCountQuery,
  TItem,
  TMetadata extends MetadataWithOffset,
>({
  adapter,
  query,
  countQuery,
  limit,
  createMetadata,
}: CountedOffsetPaginationOptions<TQuery, TCountQuery, TItem, TMetadata>): Promise<
  CountedOffsetPaginationResult<TItem, TMetadata>
> {
  const total = await adapter.count(countQuery)
  const pagination = createMetadata(total)

  if (total === 0 || pagination.offset >= total) {
    return { items: [], pagination }
  }

  const items = await adapter.fetch(query, {
    limit,
    offset: pagination.offset,
  })

  return { items, pagination }
}
