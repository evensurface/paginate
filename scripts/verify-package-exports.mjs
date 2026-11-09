import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const require = createRequire(import.meta.url)
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const privateCoreExports = [
  "isNonNegativeSafeInteger",
  "isPositiveSafeInteger",
  "toPositiveSafeInteger",
]

const packages = [
  {
    directory: "packages/paginate",
    expectedExports: [
      "DEFAULT_PAGE_SIZE",
      "MAX_PAGE_SIZE",
      "MIN_PAGE_SIZE",
      "calculateOffset",
      "createPageWindow",
      "createPaginationMetadata",
      "paginate",
      "parseLimit",
      "parsePage",
      "resolvePage",
    ],
    privateExports: privateCoreExports,
  },
  {
    directory: "packages/adapter/drizzle",
    expectedExports: ["createDrizzleAdapter", "paginate"],
    privateExports: [],
  },
]

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
    const declarations = await readFile(path.resolve(packageDirectory, declarationPath), "utf8")

    for (const privateExport of packageOptions.privateExports) {
      assert.equal(
        declarations.includes(privateExport),
        false,
        `${manifest.name} declarations expose private symbol ${privateExport}`,
      )
    }
  }
}

console.log("Verified package export maps, runtime exports, and private declaration boundaries.")
