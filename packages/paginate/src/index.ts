export type { PaginationError, PaginationErrorCode } from "./core/errors"
export { isPaginationError } from "./core/errors"
export type { PaginationInput } from "./core/integer"
export type {
  OffsetPaginationMetadataOptions,
  PageWindowOptions,
  PaginationMetadataOptions,
} from "./core/metadata"
export {
  createOffsetPaginationMetadata,
  createPageWindow,
  createPaginationMetadata,
} from "./core/metadata"
export { parseOffset } from "./core/offset"
export type { PageSizeOptions } from "./core/page"
export {
  calculateOffset,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
  parseLimit,
  parsePage,
  resolvePage,
} from "./core/page"

export { paginate } from "./core/paginate"
export { paginateOffset } from "./core/paginate-offset"

export type {
  OffsetPaginatedResult,
  OffsetPaginationMetadata,
  OffsetPaginationOptions,
  PaginatedResult,
  PaginationAdapter,
  PaginationMetadata,
  PaginationOptions,
  PaginationPageItem,
} from "./core/types"
