import { sql } from "drizzle-orm"
import { db } from "~~/server/db"
import { catalogProducts } from "~~/server/constants/catalog"
import { testKeyPool } from "~~/server/constants/keys"
import { testPromocodes } from "~~/server/constants/promocodes"
import { licenseKeys, products, promoCodes } from "~~/server/db/schema"

let bootstrapPromise: Promise<void> | null = null

export async function ensureSeedData() {
  if (!bootstrapPromise) {
    bootstrapPromise = seedData().catch((error) => {
      bootstrapPromise = null
      throw error
    })
  }

  await bootstrapPromise
}

async function seedData() {
  await db
    .insert(products)
    .values(catalogProducts as any)
    .onConflictDoNothing()

  const keyValues = testKeyPool.map((code) => ({
    sku: "KEY-CS2-PRIME",
    code,
  }))
  await db.insert(licenseKeys).values(keyValues).onConflictDoNothing()

  await db
    .insert(promoCodes)
    .values(testPromocodes as any)
    .onConflictDoUpdate({
      target: promoCodes.code,
      set: {
        type: sql`excluded.type`,
        value: sql`excluded.value`,
        maxUses: sql`excluded.max_uses`,
        currency: sql`excluded.currency`,
        active: true,
      },
    })
}
