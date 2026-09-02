import { sql } from "drizzle-orm"
import { db } from "~~/server/db"

export default defineEventHandler(async () => {
  const result = await db.execute(sql`select 1 as ok`)

  return {
    ok: true,
    database: "connected",
    result,
  }
})
