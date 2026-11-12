import {
  type OffsetPaginatedResult,
  type OffsetPaginationInput,
  type PagePaginationInput,
  type PageSizeOptions,
  type PaginatedResult,
  type PaginationAdapter,
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

/** Better Auth's field-selection contract. */
export type BetterAuthSelect = NonNullable<BetterAuthFindManyOptions["select"]>

/** Better Auth's relationship-loading contract. */
export type BetterAuthJoin = NonNullable<BetterAuthFindManyOptions["join"]>

interface BetterAuthQuery {
  model: BetterAuthFindManyOptions["model"]
  where?: BetterAuthFindManyOptions["where"] | undefined
  sortBy?: BetterAuthSortBy | undefined
  select?: BetterAuthSelect | undefined
  join?: BetterAuthJoin | undefined
}

interface BetterAuthPaginationBaseOptions extends BetterAuthQuery {
  adapter: BetterAuthDatabaseAdapter
  pageSizeOptions?: PageSizeOptions | undefined
}

export interface BetterAuthPaginationOptions
  extends BetterAuthPaginationBaseOptions,
    PagePaginationInput {}

export interface BetterAuthOffsetPaginationOptions
  extends BetterAuthPaginationBaseOptions,
    OffsetPaginationInput {}

function createPaginationAdapter<TItem extends object>(
  adapter: BetterAuthDatabaseAdapter,
): PaginationAdapter<BetterAuthQuery, BetterAuthQuery, TItem> {
  return {
    count: ({ model, where }) => adapter.count({ model, where }),
    fetch: ({ model, where, sortBy, select, join }, { limit, offset }) =>
      adapter.findMany<TItem>({
        model,
        where,
        limit,
        offset,
        ...(sortBy === undefined ? {} : { sortBy }),
        ...(select === undefined ? {} : { select: [...select] }),
        ...(join === undefined
          ? {}
          : {
              join: Object.fromEntries(
                Object.entries(join).map(([model, option]) => [
                  model,
                  typeof option === "object" && option !== null ? { ...option } : option,
                ]),
              ),
            }),
      }),
  }
}

function validateFindManyOptions({ sortBy, select, join }: BetterAuthQuery): void {
  const enabledJoins = Object.entries(join ?? {}).filter(([, option]) => Boolean(option))

  for (const [model, option] of enabledJoins) {
    if (typeof option !== "object" || option.limit === undefined) continue
    if (!Number.isSafeInteger(option.limit) || option.limit <= 0) {
      throw new TypeError(`join.${model}.limit must be a positive safe integer`)
    }
  }

  if (!select?.length) return

  if (enabledJoins.length > 0 && !select.includes("id")) {
    throw new TypeError('select must include "id" when join is enabled')
  }

  if (sortBy !== undefined && !select.includes(sortBy.field)) {
    throw new TypeError(
      `select must include sortBy.field "${sortBy.field}" when sortBy is provided`,
    )
  }
}

/**
 * Paginates a Better Auth model by page number.
 *
 * Better Auth does not infer a row type from `model` through its database
 * adapter API. Supply `TItem` explicitly when a precise item type is needed.
 */
export async function paginateBetterAuth<TItem extends object = Record<string, unknown>>({
  adapter,
  model,
  where,
  sortBy,
  select,
  join,
  page,
  limit,
  pageSizeOptions,
}: BetterAuthPaginationOptions): Promise<PaginatedResult<TItem>> {
  const query: BetterAuthQuery = { model, where, sortBy, select, join }
  validateFindManyOptions(query)

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
export async function paginateBetterAuthOffset<TItem extends object = Record<string, unknown>>({
  adapter,
  model,
  where,
  sortBy,
  select,
  join,
  offset,
  limit,
  pageSizeOptions,
}: BetterAuthOffsetPaginationOptions): Promise<OffsetPaginatedResult<TItem>> {
  const query: BetterAuthQuery = { model, where, sortBy, select, join }
  validateFindManyOptions(query)

  return paginateOffsetCore({
    adapter: createPaginationAdapter<TItem>(adapter),
    query,
    countQuery: query,
    offset,
    limit,
    pageSizeOptions,
  })
}
