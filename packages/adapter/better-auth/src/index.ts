import {
  type OffsetPaginatedResult,
  type PageSizeOptions,
  type PaginatedResult,
  type PaginationAdapter,
  type PaginationInput,
  paginate as paginateCore,
  paginateOffset as paginateOffsetCore,
} from "@evensurface/paginate"
import type { AuthContext } from "better-auth"

/** The Better Auth database operations required by this integration. */
export type BetterAuthDatabaseAdapter = Pick<AuthContext["adapter"], "count" | "findMany">

/** The public options accepted by Better Auth's `findMany` operation. */
export type BetterAuthFindManyOptions = Parameters<BetterAuthDatabaseAdapter["findMany"]>[0]

/** A Better Auth database filter derived from its public adapter contract. */
export type BetterAuthWhere = NonNullable<BetterAuthFindManyOptions["where"]>[number]

/** Better Auth's single-field ordering contract. */
export type BetterAuthSortBy = NonNullable<BetterAuthFindManyOptions["sortBy"]>

interface BetterAuthQuery {
  model: BetterAuthFindManyOptions["model"]
  where?: BetterAuthFindManyOptions["where"]
  sortBy: BetterAuthSortBy
}

interface BetterAuthPaginationBaseOptions extends BetterAuthQuery {
  adapter: BetterAuthDatabaseAdapter
  limit?: PaginationInput
  pageSizeOptions?: PageSizeOptions
}

export interface BetterAuthPaginationOptions extends BetterAuthPaginationBaseOptions {
  page?: PaginationInput
}

export interface BetterAuthOffsetPaginationOptions extends BetterAuthPaginationBaseOptions {
  offset?: PaginationInput
}

function createPaginationAdapter<TItem extends object>(
  adapter: BetterAuthDatabaseAdapter,
): PaginationAdapter<BetterAuthQuery, BetterAuthQuery, TItem> {
  return {
    count: ({ model, where }) => adapter.count({ model, where }),
    fetch: ({ model, where, sortBy }, { limit, offset }) =>
      adapter.findMany<TItem>({ model, where, sortBy, limit, offset }),
  }
}

/**
 * Paginates a Better Auth model by page number.
 *
 * Better Auth does not infer a row type from `model` through its database
 * adapter API. Supply `TItem` explicitly when a precise item type is needed.
 */
export function paginate<TItem extends object = Record<string, unknown>>({
  adapter,
  model,
  where,
  sortBy,
  page,
  limit,
  pageSizeOptions,
}: BetterAuthPaginationOptions): Promise<PaginatedResult<TItem>> {
  const query: BetterAuthQuery = { model, where, sortBy }

  return paginateCore({
    adapter: createPaginationAdapter<TItem>(adapter),
    query,
    countQuery: query,
    page,
    limit,
    pageSizeOptions,
  })
}

/**
 * Paginates a Better Auth model from a zero-based offset.
 *
 * Better Auth does not infer a row type from `model` through its database
 * adapter API. Supply `TItem` explicitly when a precise item type is needed.
 */
export function paginateOffset<TItem extends object = Record<string, unknown>>({
  adapter,
  model,
  where,
  sortBy,
  offset,
  limit,
  pageSizeOptions,
}: BetterAuthOffsetPaginationOptions): Promise<OffsetPaginatedResult<TItem>> {
  const query: BetterAuthQuery = { model, where, sortBy }

  return paginateOffsetCore({
    adapter: createPaginationAdapter<TItem>(adapter),
    query,
    countQuery: query,
    offset,
    limit,
    pageSizeOptions,
  })
}
