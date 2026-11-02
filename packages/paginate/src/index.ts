export type {
  PageWindowOptions,
  PaginationMetadataOptions,
} from "./core/metadata"
export {
  createPageWindow,
  createPaginationMetadata,
} from "./core/metadata"
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

export type {
  PaginatedResult,
  PaginationAdapter,
  PaginationMetadata,
  PaginationOptions,
  PaginationPageItem,
} from "./core/types"
