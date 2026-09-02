import { and, eq, sql } from "drizzle-orm"
import { db } from "~~/server/db"
import { promoCodes } from "~~/server/db/schema"
import { ensureSeedData } from "~~/server/services/bootstrap"

export default defineEventHandler(async () => {
  await ensureSeedData()

  const promocodes = await db
    .select({
      code: promoCodes.code,
      type: promoCodes.type,
      value: promoCodes.value,
      currency: promoCodes.currency,
      maxUses: promoCodes.maxUses,
      usedCount: promoCodes.usedCount,
      remainingUses: sql<number>`${promoCodes.maxUses} - ${promoCodes.usedCount}`,
    })
    .from(promoCodes)
    .where(
      and(
        eq(promoCodes.active, true),
        sql`${promoCodes.usedCount} < ${promoCodes.maxUses}`,
      ),
    )
    .orderBy(promoCodes.code)

  return {
    ok: true,
    promocodes,
  }
})
