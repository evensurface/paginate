export interface PaginationMetadata {
  page: number
  limit: number
  offset: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  firstItem: number
  lastItem: number
}

export interface OffsetPaginationMetadata {
  total: number
  limit: number
  offset: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export type CursorDirection = "asc" | "desc"

export type CursorValue = string | number | bigint | Date

export interface CursorKey {
  key: string
  direction: CursorDirection
  value: CursorValue
}

export type CursorPosition = readonly [CursorKey, ...CursorKey[]]

export interface CursorPaginationMetadata {
  limit: number
  nextCursor: string | null
  hasNextPage: boolean
}

export type PaginationPageItem = number | "ellipsis"

import type { PaginationInput } from "./integer"
import type { PageSizeOptions } from "./page"

/** Request-level inputs for page-number pagination. */
export interface PagePaginationInput {
  page?: PaginationInput | undefined
  limit?: PaginationInput | undefined
}

/** Request-level inputs for zero-based offset pagination. */
export interface OffsetPaginationInput {
  offset?: PaginationInput | undefined
  limit?: PaginationInput | undefined
}

/** Request-level inputs for forward cursor pagination. */
export interface CursorPaginationInput {
  cursor?: string | undefined
  limit?: PaginationInput | undefined
}

export interface PaginationAdapter<TQuery, TCountQuery, TItem> {
  fetch(query: TQuery, options: { limit: number; offset: number }): Promise<TItem[]>

  count(query: TCountQuery): Promise<number>
}

export interface CursorPaginationAdapter<TQuery, TItem> {
  fetch(
    query: TQuery,
    options: { position: CursorPosition | undefined; limit: number },
  ): Promise<TItem[]>

  getPosition(item: TItem): CursorPosition
}

export interface PaginationOptions<TQuery, TCountQuery, TItem> extends PagePaginationInput {
  adapter: PaginationAdapter<TQuery, TCountQuery, TItem>

  query: TQuery
  countQuery: TCountQuery

  pageSizeOptions?: PageSizeOptions | undefined
}

export interface OffsetPaginationOptions<TQuery, TCountQuery, TItem> extends OffsetPaginationInput {
  adapter: PaginationAdapter<TQuery, TCountQuery, TItem>

  query: TQuery
  countQuery: TCountQuery

  pageSizeOptions?: PageSizeOptions | undefined
}

export interface CursorPaginationOptions<TQuery, TItem> extends CursorPaginationInput {
  adapter: CursorPaginationAdapter<TQuery, TItem>

  query: TQuery

  pageSizeOptions?: PageSizeOptions | undefined
}

export interface PaginatedResult<TItem> {
  items: TItem[]
  pagination: PaginationMetadata
}

export interface OffsetPaginatedResult<TItem> {
  items: TItem[]
  pagination: OffsetPaginationMetadata
}

export interface CursorPaginatedResult<TItem> {
  items: TItem[]
  pagination: CursorPaginationMetadata
}
