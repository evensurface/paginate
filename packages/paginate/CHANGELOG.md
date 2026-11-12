# @evensurface/paginate

## 3.1.0

### Minor Changes

- Accept explicitly undefined pagination inputs and export reusable request input types.

## 3.0.0

## 2.1.1

### Patch Changes

- Use stable TypeScript tooling and keep the demo outside package release validation.

## 2.1.0

### Minor Changes

- Add forward-only native cursor pagination with opaque typed cursors, count-free lookahead, a
  database-agnostic cursor adapter, and portable Drizzle keyset predicates.

## 2.0.0

### Major Changes

- Narrow the public page, offset, and limit input types to strings and numbers while preserving the
  existing runtime parsing and fallback behavior.

## 1.2.0

### Minor Changes

- 27da36d: Add native `offset + limit` pagination with shared counted-offset execution, focused parsing and
  metadata utilities, and a type-safe Drizzle wrapper.

## 1.1.0

### Minor Changes

- Add stable, type-safe codes and package-specific type guards to library-authored pagination errors
  while preserving their native constructors, messages, and propagation behavior.

## 1.0.2

### Patch Changes

- 88407ee: Refactor internal integer parsing and validation utilities without changing public behavior.

## 1.0.1

### Patch Changes

- 38ef4d3: Include the TypeScript source files in the published packages for source browsing and debugging.
