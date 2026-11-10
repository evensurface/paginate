import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  priceInCents: integer("price_in_cents").notNull(),
})
