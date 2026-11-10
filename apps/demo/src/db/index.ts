import path from "node:path"
import Database from "better-sqlite3"
import "dotenv/config"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schema from "./schema"

const databasePath =
  process.env.PAGINATE_DEMO_DATABASE_PATH ?? path.join(process.cwd(), "data", "demo.db")
const client = new Database(databasePath)

export const db = drizzle(client, { schema })
