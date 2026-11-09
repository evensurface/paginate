import {
  type CursorPaginatedResult,
  type CursorPaginationAdapter,
  type CursorPosition,
  type CursorValue,
  type PageSizeOptions,
  type PaginationInput,
  paginateCursor as paginateCursorCore,
} from "@evensurface/paginate"
import { type AnyColumn, and, asc, desc, eq, gt, lt, or, type SQL } from "drizzle-orm"
import { annotateDrizzlePaginationError, getDrizzlePaginationErrorMessage } from "./errors"

/** A Drizzle select query before cursor lookahead has been applied. */
export interface DrizzleCursorSelectQuery<TItem> {
  limit(limit: number): PromiseLike<TItem[]>
}

export interface DrizzleCursorQueryOptions {
  cursorWhere: SQL | undefined
  orderBy: readonly SQL[]
}

/** Creates a fresh Drizzle select query for one cursor pagination execution. */
export type DrizzleCursorQueryFactory<TItem> = (
  options: DrizzleCursorQueryOptions,
) => DrizzleCursorSelectQuery<TItem>

export type DrizzleCursorValueType = "string" | "number" | "bigint" | "date"

interface DrizzleCursorOrderEntryBase {
  /** Stable name embedded in opaque cursors. */
  key: string
  direction: "asc" | "desc"
}

type DrizzleCursorOrderEntryForValue<
  TItem,
  TValue extends CursorValue,
  TValueType extends DrizzleCursorValueType,
> = DrizzleCursorOrderEntryBase &
  (
    | {
        /** A non-null built-in Drizzle column used by the keyset predicate. */
        column: AnyColumn<{ data: TValue; dataType: TValueType; notNull: true }>
        valueType?: TValueType
        /** Extracts this column's value from a selected result row. */
        getValue(item: TItem): TValue
      }
    | {
        /** A non-null custom Drizzle column used by the keyset predicate. */
        column: AnyColumn<{ data: TValue; dataType: "custom"; notNull: true }>
        /** Declares how custom column values are represented in opaque cursors. */
        valueType: TValueType
        /** Extracts this column's value from a selected result row. */
        getValue(item: TItem): TValue
      }
  )

export type DrizzleCursorOrderEntry<TItem> =
  | DrizzleCursorOrderEntryForValue<TItem, string, "string">
  | DrizzleCursorOrderEntryForValue<TItem, number, "number">
  | DrizzleCursorOrderEntryForValue<TItem, bigint, "bigint">
  | DrizzleCursorOrderEntryForValue<TItem, Date, "date">

export type DrizzleCursorOrder<TItem> = readonly [
  DrizzleCursorOrderEntry<TItem>,
  ...DrizzleCursorOrderEntry<TItem>[],
]

export interface DrizzleCursorPaginationOptions<TItem> {
  /** Creates a fresh query and combines `cursorWhere` with all application filters. */
  query: DrizzleCursorQueryFactory<TItem>
  /** Deterministic ordering ending in a unique, immutable tie-breaker. */
  orderBy: DrizzleCursorOrder<TItem>
  cursor?: string
  limit?: PaginationInput
  pageSizeOptions?: PageSizeOptions
}

const cursorQueries = new WeakSet<object>()

/** Creates a genuine keyset-pagination adapter for Drizzle select builders. */
export function createDrizzleCursorAdapter<TItem>(
  orderBy: DrizzleCursorOrder<TItem>,
): CursorPaginationAdapter<DrizzleCursorQueryFactory<TItem>, TItem> {
  return {
    async fetch(createQuery, { position, limit }) {
      validateOrder(orderBy)

      if (position !== undefined) {
        validatePositionOrder(position, orderBy)
      }

      const orderExpressions = orderBy.map((entry) =>
        entry.direction === "asc" ? asc(entry.column) : desc(entry.column),
      )
      const cursorWhere = position === undefined ? undefined : createCursorWhere(orderBy, position)
      const query = createQuery({ cursorWhere, orderBy: orderExpressions })

      if (cursorQueries.has(query)) {
        throw annotateDrizzlePaginationError(
          new TypeError(getDrizzlePaginationErrorMessage("DRIZZLE_QUERY_REUSED")),
          "DRIZZLE_QUERY_REUSED",
        )
      }

      cursorQueries.add(query)
      return query.limit(limit)
    },
    getPosition(item) {
      validateOrder(orderBy)

      return orderBy.map((entry) => {
        const value = entry.getValue(item)

        if (!isValueForEntry(value, entry)) {
          throw invalidCursorOrder()
        }

        return {
          key: entry.key,
          direction: entry.direction,
          value,
        }
      }) as unknown as CursorPosition
    },
  }
}

/** Paginates a Drizzle query with forward-only, count-free keyset pagination. */
export function paginateCursor<TItem>({
  query,
  orderBy,
  cursor,
  limit,
  pageSizeOptions,
}: DrizzleCursorPaginationOptions<TItem>): Promise<CursorPaginatedResult<TItem>> {
  return paginateCursorCore({
    adapter: createDrizzleCursorAdapter(orderBy),
    query,
    cursor,
    limit,
    pageSizeOptions,
  })
}

function createCursorWhere<TItem>(
  orderBy: DrizzleCursorOrder<TItem>,
  position: CursorPosition,
): SQL | undefined {
  const branches = orderBy.map((entry, index) => {
    const prefix = orderBy
      .slice(0, index)
      .map((prefixEntry, prefixIndex) =>
        eq(prefixEntry.column, position[prefixIndex]?.value as never),
      )
    const value = position[index]?.value as never
    const comparison = entry.direction === "asc" ? gt(entry.column, value) : lt(entry.column, value)

    return and(...prefix, comparison)
  })

  return or(...branches)
}

function validateOrder<TItem>(orderBy: DrizzleCursorOrder<TItem>): void {
  if (!Array.isArray(orderBy) || orderBy.length === 0) {
    throw invalidCursorOrder()
  }

  const keys = new Set<string>()

  for (const entry of orderBy) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof entry.key !== "string" ||
      entry.key.length === 0 ||
      entry.key.trim() !== entry.key ||
      keys.has(entry.key) ||
      (entry.direction !== "asc" && entry.direction !== "desc") ||
      typeof entry.getValue !== "function" ||
      typeof entry.column !== "object" ||
      entry.column === null ||
      entry.column.notNull !== true ||
      getValueType(entry) === undefined
    ) {
      throw invalidCursorOrder()
    }

    keys.add(entry.key)
  }
}

function validatePositionOrder<TItem>(
  position: CursorPosition,
  orderBy: DrizzleCursorOrder<TItem>,
): void {
  if (
    position.length !== orderBy.length ||
    position.some(
      (key, index) =>
        key.key !== orderBy[index]?.key ||
        key.direction !== orderBy[index]?.direction ||
        !isValueForEntry(key.value, orderBy[index]),
    )
  ) {
    throw annotateDrizzlePaginationError(
      new TypeError(getDrizzlePaginationErrorMessage("DRIZZLE_CURSOR_ORDER_MISMATCH")),
      "DRIZZLE_CURSOR_ORDER_MISMATCH",
    )
  }
}

function getValueType(entry: DrizzleCursorOrderEntry<unknown>): DrizzleCursorValueType | undefined {
  if (["string", "number", "bigint", "date"].includes(entry.column.dataType)) {
    const valueType = entry.column.dataType as DrizzleCursorValueType
    return entry.valueType === undefined || entry.valueType === valueType ? valueType : undefined
  }

  return entry.column.dataType === "custom" ? entry.valueType : undefined
}

function isValueForEntry(
  value: CursorValue,
  entry: DrizzleCursorOrderEntry<unknown> | undefined,
): boolean {
  if (entry === undefined) {
    return false
  }

  switch (getValueType(entry)) {
    case "string":
      return typeof value === "string"
    case "number":
      return typeof value === "number" && Number.isFinite(value)
    case "bigint":
      return typeof value === "bigint"
    case "date":
      return value instanceof Date && Number.isFinite(value.getTime())
    default:
      return false
  }
}

function invalidCursorOrder() {
  return annotateDrizzlePaginationError(
    new TypeError(getDrizzlePaginationErrorMessage("DRIZZLE_INVALID_CURSOR_ORDER")),
    "DRIZZLE_INVALID_CURSOR_ORDER",
  )
}
