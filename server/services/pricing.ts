import { and, eq, sql } from "drizzle-orm"
import { promoCodes } from "~~/server/db/schema"
import type { AnyPgTransaction } from "drizzle-orm/pg-core"

export type PromoResult = {
  promoCode: string | null
  discountAmount: number
}

export async function reservePromoAndCalculateDiscount(
  tx: AnyPgTransaction,
  promoCode: string | undefined,
  baseAmount: number,
  currency: string,
) {
  if (!promoCode) {
    return { promoCode: null, discountAmount: 0 } satisfies PromoResult
  }

  const [updatedPromo] = await tx
    .update(promoCodes)
    .set({ usedCount: sql`${promoCodes.usedCount} + 1` })
    .where(
      and(
        eq(promoCodes.code, promoCode),
        eq(promoCodes.active, true),
        sql`${promoCodes.usedCount} < ${promoCodes.maxUses}`,
      ),
    )
    .returning()

  if (!updatedPromo) {
    throw createError({
      statusCode: 409,
      statusMessage: "Promocode exhausted or invalid",
    })
  }

  const discountRaw =
    updatedPromo.type === "percent"
      ? Math.floor((baseAmount * updatedPromo.value) / 100)
      : updatedPromo.currency === currency
        ? updatedPromo.value
        : 0

  const discountAmount = Math.max(0, Math.min(baseAmount, discountRaw))

  return {
    promoCode: updatedPromo.code,
    discountAmount,
  } satisfies PromoResult
}
