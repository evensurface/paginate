import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const require = createRequire(import.meta.url)
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const privateCoreExports = [
  "executeCountedOffsetPagination",
  "isNonNegativeSafeInteger",
  "isPositiveSafeInteger",
  "toPositiveSafeInteger",
  "toNonNegativeSafeInteger",
]

const packages = [
  {
    directory: "packages/paginate",
    expectedExports: [
      "DEFAULT_PAGE_SIZE",
      "MAX_PAGE_SIZE",
      "MIN_PAGE_SIZE",
      "calculateOffset",
      "createOffsetPaginationMetadata",
      "createPageWindow",
      "createPaginationMetadata",
      "isPaginationError",
      "paginate",
      "paginateOffset",
      "parseLimit",
      "parseOffset",
      "parsePage",
      "resolvePage",
    ],
    expectedTypeExports: [
      "OffsetPaginatedResult",
      "OffsetPaginationMetadata",
      "OffsetPaginationMetadataOptions",
      "OffsetPaginationOptions",
      "PaginationError",
      "PaginationErrorCode",
    ],
    privateExports: privateCoreExports,
  },
  {
    directory: "packages/adapter/drizzle",
    expectedExports: [
      "createDrizzleAdapter",
      "isDrizzlePaginationError",
      "paginate",
      "paginateOffset",
    ],
    expectedTypeExports: [
      "DrizzleOffsetPaginationOptions",
      "DrizzlePaginationError",
      "DrizzlePaginationErrorCode",
    ],
    privateExports: [],
  },
]

const declarationParserProbe = getDeclarationExports(
  `
    type Hidden = string
    export type Direct = number
    export { type Hidden as Aliased, type Direct }
  `,
  "declaration parser self-test",
)
assert.deepEqual([...declarationParserProbe].sort(), ["Aliased", "Direct"])

for (const packageOptions of packages) {
  const packageDirectory = path.join(repositoryRoot, packageOptions.directory)
  const manifestPath = path.join(packageDirectory, "package.json")
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"))

  assert.deepEqual(Object.keys(manifest.exports), ["."], `${manifest.name} changed its export map`)

  const rootExport = manifest.exports["."]
  const esmPath = path.resolve(packageDirectory, rootExport.import.default)
  const cjsPath = path.resolve(packageDirectory, rootExport.require.default)
  const esm = await import(pathToFileURL(esmPath))
  const cjs = require(cjsPath)

  assert.deepEqual(
    Object.keys(esm).sort(),
    packageOptions.expectedExports,
    `${manifest.name} changed its ESM exports`,
  )
  assert.deepEqual(
    Object.keys(cjs).sort(),
    packageOptions.expectedExports,
    `${manifest.name} changed its CommonJS exports`,
  )

  for (const declarationPath of [rootExport.import.types, rootExport.require.types]) {
    const resolvedDeclarationPath = path.resolve(packageDirectory, declarationPath)
    const declarations = await readFile(resolvedDeclarationPath, "utf8")
    const declarationExports = getDeclarationExports(declarations, resolvedDeclarationPath)

    for (const expectedTypeExport of packageOptions.expectedTypeExports) {
      assert.equal(
        declarationExports.has(expectedTypeExport),
        true,
        `${manifest.name} declarations omit public type ${expectedTypeExport}`,
      )
    }

    for (const privateExport of packageOptions.privateExports) {
      assert.equal(
        declarationExports.has(privateExport),
        false,
        `${manifest.name} declarations expose private symbol ${privateExport}`,
      )
    }
  }
}

function getDeclarationExports(declarations, declarationPath) {
  const exportedNames = new Set()
  const declarationPattern =
    /\bexport\s+(?:declare\s+)?(?:abstract\s+)?(?:type|interface|class|function|const|let|var|enum|namespace)\s+([A-Za-z_$][\w$]*)/g
  const exportListPattern = /\bexport\s+(?:type\s+)?\{([^}]*)\}/gs

  for (const match of declarations.matchAll(declarationPattern)) {
    exportedNames.add(match[1])
  }

  for (const match of declarations.matchAll(exportListPattern)) {
    for (const specifier of match[1].split(",")) {
      const normalized = specifier.trim().replace(/^type\s+/, "")
      const exportedName = normalized
        .split(/\s+as\s+/)
        .at(-1)
        ?.trim()

      if (exportedName) {
        exportedNames.add(exportedName)
      }
    }
  }

  assert.notEqual(exportedNames.size, 0, `Could not parse exports from ${declarationPath}`)

  return exportedNames
}

const coreDirectory = path.join(repositoryRoot, "packages/paginate")
const coreEsm = await import(pathToFileURL(path.join(coreDirectory, "dist/index.mjs")))
const coreCjs = require(path.join(coreDirectory, "dist/index.cjs"))

for (const [createError, recognizeError] of [
  [() => coreEsm.calculateOffset(0, 1), coreCjs.isPaginationError],
  [() => coreCjs.calculateOffset(0, 1), coreEsm.isPaginationError],
]) {
  assert.throws(createError, (error) => recognizeError(error))
}

const drizzleDirectory = path.join(repositoryRoot, "packages/adapter/drizzle")
const drizzleEsm = await import(pathToFileURL(path.join(drizzleDirectory, "dist/index.mjs")))
const drizzleCjs = require(path.join(drizzleDirectory, "dist/index.cjs"))

for (const [createAdapter, recognizeError] of [
  [drizzleEsm.createDrizzleAdapter, drizzleCjs.isDrizzlePaginationError],
  [drizzleCjs.createDrizzleAdapter, drizzleEsm.isDrizzlePaginationError],
]) {
  try {
    await createAdapter().count(Promise.resolve(-1))
    assert.fail("Expected the Drizzle adapter to reject an invalid count.")
  } catch (error) {
    assert.equal(recognizeError(error), true)
  }
}

console.log("Verified package export maps, runtime exports, and private declaration boundaries.")
