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

export type PaginationPageItem = number | "ellipsis"

import type { PaginationInput } from "./integer"
import type { PageSizeOptions } from "./page"

export interface PaginationAdapter<TQuery, TCountQuery, TItem> {
  fetch(query: TQuery, options: { limit: number; offset: number }): Promise<TItem[]>

  count(query: TCountQuery): Promise<number>
}

export interface PaginationOptions<TQuery, TCountQuery, TItem> {
  adapter: PaginationAdapter<TQuery, TCountQuery, TItem>

  query: TQuery
  countQuery: TCountQuery

  page?: PaginationInput
  limit?: PaginationInput
  pageSizeOptions?: PageSizeOptions
}

export interface OffsetPaginationOptions<TQuery, TCountQuery, TItem> {
  adapter: PaginationAdapter<TQuery, TCountQuery, TItem>

  query: TQuery
  countQuery: TCountQuery

  offset?: PaginationInput
  limit?: PaginationInput
  pageSizeOptions?: PageSizeOptions
}

export interface PaginatedResult<TItem> {
  items: TItem[]
  pagination: PaginationMetadata
}

export interface OffsetPaginatedResult<TItem> {
  items: TItem[]
  pagination: OffsetPaginationMetadata
}
