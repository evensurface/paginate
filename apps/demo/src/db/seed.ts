import { count } from "drizzle-orm"
import { db } from "./index"
import { products } from "./schema"

async function seed() {
  const [{ total }] = await db.select({ total: count() }).from(products)

  if (total === 0) {
    await db.insert(products).values(
      Array.from({ length: 47 }, (_, index) => ({
        name: `Demo product ${index + 1}`,
        priceInCents: (index + 1) * 300,
      })),
    )

    console.info("Seeded 47 demo products.")
  } else {
    console.info(`Database already contains ${total} products; skipping seed.`)
  }
}

seed().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
