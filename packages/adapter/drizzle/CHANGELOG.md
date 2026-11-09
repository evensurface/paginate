# @evensurface/paginate-drizzle

## 2.1.0

### Minor Changes

- Add forward-only native cursor pagination with opaque typed cursors, count-free lookahead, a
  database-agnostic cursor adapter, and portable Drizzle keyset predicates.

### Patch Changes

- Updated dependencies
  - @evensurface/paginate@2.1.0

## 2.0.0

### Major Changes

- Narrow the public page, offset, and limit input types to strings and numbers while preserving the
  existing runtime parsing and fallback behavior.

### Patch Changes

- Updated dependencies
  - @evensurface/paginate@2.0.0

## 1.2.0

### Minor Changes

- 27da36d: Add native `offset + limit` pagination with shared counted-offset execution, focused parsing and
  metadata utilities, and a type-safe Drizzle wrapper.

### Patch Changes

- Updated dependencies [27da36d]
  - @evensurface/paginate@1.2.0

## 1.1.0

### Minor Changes

- Add stable, type-safe codes and package-specific type guards to library-authored pagination errors
  while preserving their native constructors, messages, and propagation behavior.

### Patch Changes

- Updated dependencies
  - @evensurface/paginate@1.1.0

## 1.0.2

### Patch Changes

- Updated dependencies [88407ee]
  - @evensurface/paginate@1.0.2

## 1.0.1

### Patch Changes

- 38ef4d3: Include the TypeScript source files in the published packages for source browsing and debugging.
- Updated dependencies [38ef4d3]
  - @evensurface/paginate@1.0.1
