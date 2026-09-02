import { drizzle } from "drizzle-orm/node-postgres"
import type { NodePgDatabase } from "drizzle-orm/node-postgres/driver"
import * as schema from "./schema/"

export const url =
  process.env.POSTGRES_URL ||
  "postgresql://postgres:postgres@localhost:5432/postgres"

export const db: NodePgDatabase<typeof schema> = drizzle({
  connection: url,
  schema,
})

export * from "./schema/"
