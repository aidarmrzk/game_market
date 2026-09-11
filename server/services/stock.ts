import { sql } from "drizzle-orm"
import { db } from "~~/server/db"
import { products } from "~~/server/db/schema"
import { ensureSeedData } from "~~/server/services/bootstrap"
import { expireStaleReservations } from "~~/server/services/reservations"

export type StockSnapshotItem = {
  sku: string
  price: number
  currency: string
  available: number
  reserved: number
}

export async function getStockSnapshot(): Promise<StockSnapshotItem[]> {
  await ensureSeedData()
  await expireStaleReservations()

  const rows = await db.execute<StockSnapshotItem>(sql`
    select
      p.sku,
      p.price,
      p.currency,
      greatest(0, coalesce(free.total, 0) - coalesce(resv.total, 0))::int as available,
      coalesce(resv.total, 0)::int as reserved
    from ${products} p
    left join (
      select sku, count(*)::int as total
      from license_keys
      where allocated_to_order_id is null
      group by sku
    ) free on free.sku = p.sku
    left join (
      select sku, count(*)::int as total
      from reservations
      where status = 'active' and expires_at > now()
      group by sku
    ) resv on resv.sku = p.sku
    order by p.created_at asc
  `)

  return rows.rows
}
